import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { getAvatarFallback } from "../src/lib/avatar-fallback"

test("Avatar initials use the user's name instead of a fixed placeholder", () => {
  assert.equal(getAvatarFallback("Budi Santoso", "satpam@example.test").initials, "BS")
  assert.equal(getAvatarFallback("  Ayu   Putri Santoso  ").initials, "AS")
  assert.equal(getAvatarFallback("Budi").initials, "B")
  assert.equal(getAvatarFallback("Éka 李").initials, "É李")
  assert.equal(getAvatarFallback("", "ayu.santoso@example.test").initials, "AS")
  assert.equal(getAvatarFallback(" ", "").initials, "?")
})

test("Avatar color is stable across rendering, name changes and email casing", () => {
  const original = getAvatarFallback("Budi Santoso", "satpam@example.test")
  assert.deepEqual(getAvatarFallback("Budi Santoso", "satpam@example.test"), original)
  assert.equal(getAvatarFallback("Nama berubah", " SATPAM@EXAMPLE.TEST ").colorClassName, original.colorClassName)
  assert.equal(getAvatarFallback("Éka").colorClassName, getAvatarFallback("E\u0301ka").colorClassName)
  const colors = new Set(Array.from({ length: 100 }, (_, index) => getAvatarFallback("Pengguna", `user${index}@example.test`).colorClassName))
  assert.equal(colors.size, 7)
})

test("Every solid avatar color meets AA contrast for white initials using installed Tailwind tokens", () => {
  const source = readFileSync(new URL("../src/lib/avatar-fallback.ts", import.meta.url), "utf8")
  const theme = readFileSync(new URL("../node_modules/tailwindcss/theme.css", import.meta.url), "utf8")
  const backgrounds = [...source.matchAll(/"bg-([a-z]+-\d+) text-white"/g)].map((match) => match[1])
  assert.equal(backgrounds.length, 7)
  assert.match(theme, /--color-white: #fff;/)
  for (const background of backgrounds) {
    const token = theme.match(new RegExp(`--color-${background}: oklch\\(([^)]+)\\);`))
    assert.ok(token, `Missing Tailwind color ${background}`)
    const [lightness, chroma, hue] = token[1].split(" ").map(Number.parseFloat)
    const angle = hue * Math.PI / 180
    const a = chroma * Math.cos(angle), b = chroma * Math.sin(angle), l = lightness / 100
    const long = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
    const medium = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
    const short = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
    const channels = [
      4.0767416621 * long - 3.3077115913 * medium + 0.2309699292 * short,
      -1.2684380046 * long + 2.6097574011 * medium - 0.3413193965 * short,
      -0.0041960863 * long - 0.7034186147 * medium + 1.707614701 * short,
    ].map((channel) => Math.max(0, Math.min(1, channel)))
    const luminance = 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2]
    assert.ok(1.05 / (luminance + 0.05) >= 4.5, `Insufficient contrast: ${background}`)
  }
})

test("Every account avatar uses the shared fallback without recoloring the real image", () => {
  const avatar = readFileSync(new URL("../src/components/user-avatar.tsx", import.meta.url), "utf8")
  const nav = readFileSync(new URL("../src/components/nav-user.tsx", import.meta.url), "utf8")
  const profile = readFileSync(new URL("../src/features/profile/components/profile-details.tsx", import.meta.url), "utf8")
  assert.match(avatar, /user\.avatar\?\.trim\(\) \? <AvatarImage/)
  assert.match(avatar, /<AvatarFallback className=\{cn\(fallback\.colorClassName/)
  assert.doesNotMatch(avatar, /<AvatarImage[^>]*colorClassName/)
  assert.equal((nav.match(/<UserAvatar user=\{user\}/g) ?? []).length, 2)
  assert.match(profile, /<UserAvatar user=\{user\}/)
  assert.doesNotMatch(nav, />CN</)
})
