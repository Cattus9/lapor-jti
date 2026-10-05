import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { test } from "node:test"

const theme = readFileSync(new URL("../src/app/globals.css", import.meta.url), "utf8")
const button = readFileSync(new URL("../src/components/ui/button.tsx", import.meta.url), "utf8")

function token(block: string, name: string) {
  const value = block.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6});`, "i"))?.[1]
  assert.ok(value, `Missing hex token: ${name}`)
  return value
}

function luminance(hex: string) {
  const [red, green, blue] = hex.slice(1).match(/../g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

for (const selector of [":root", ".dark"]) {
  test(`${selector} primary button text meets 4.5:1 in normal and hover states`, () => {
    const block = theme.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`))?.[1]
    assert.ok(block, `Missing theme: ${selector}`)
    const foreground = luminance(token(block, "primary-foreground"))
    for (const state of ["primary-action", "primary-action-hover"]) {
      const background = luminance(token(block, state))
      const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
      assert.ok(ratio >= 4.5, `${state}: ${ratio.toFixed(2)}:1`)
    }
  })
}

test("shared primary buttons use opaque dedicated action tokens", () => {
  assert.match(button, /default: "bg-primary-action text-primary-foreground hover:bg-primary-action-hover"/)
  assert.match(theme, /--color-primary-action: var\(--primary-action\)/)
  assert.match(theme, /--color-primary-action-hover: var\(--primary-action-hover\)/)
})

function rgb(hex: string) {
  return hex.slice(1).match(/../g)!.map((channel) => Number.parseInt(channel, 16) / 255)
}
function blend(foreground: number[], background: number[], alpha: number) {
  return foreground.map((value, index) => Math.round((value * alpha + background[index] * (1 - alpha)) * 255))
}
function hex(channels: number[]) {
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`
}

for (const selector of [":root", ".dark"]) {
  test(`${selector} compact queue CTA meets 4.5:1 on its tinted surface in both states`, () => {
    const dashboard = readFileSync(new URL("../src/features/lost-found/components/satpam-dashboard.tsx", import.meta.url), "utf8")
    assert.match(dashboard, /bg-primary\/5 text-primary-action-hover hover:bg-primary\/10 hover:text-primary-action-hover/)
    assert.match(dashboard, /dark:bg-primary\/10 dark:text-primary dark:hover:bg-primary\/15 dark:hover:text-primary/)
    assert.match(dashboard, /bg-background\/40/)
    const block = theme.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`))?.[1]
    assert.ok(block)
    const row = rgb(hex(blend(rgb(token(block, "background")), rgb(token(block, "card")), 0.4)))
    const primary = rgb(token(block, "primary"))
    const foreground = luminance(token(block, selector === ".dark" ? "primary" : "primary-action-hover"))
    for (const alpha of selector === ".dark" ? [0.10, 0.15] : [0.05, 0.10]) {
      const background = luminance(hex(blend(primary, row, alpha)))
      const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
      assert.ok(ratio >= 4.5, `Queue CTA at ${alpha}: ${ratio.toFixed(2)}:1`)
    }
  })
}
