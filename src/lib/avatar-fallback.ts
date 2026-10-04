// A bounded, solid palette keeps white initials readable in both application themes.
const fallbackColors = [
  "bg-blue-700 text-white",
  "bg-emerald-700 text-white",
  "bg-violet-700 text-white",
  "bg-cyan-800 text-white",
  "bg-rose-700 text-white",
  "bg-amber-800 text-white",
  "bg-slate-700 text-white",
] as const

export function getAvatarFallback(name: string, email = "") {
  const normalizedName = name.trim().normalize("NFC")
  const normalizedEmail = email.trim().toLowerCase()
  const words = (normalizedName || normalizedEmail.split("@")[0]).split(/[\s._-]+/u)
    .map((word) => word.match(/[\p{L}\p{N}]/u)?.[0]).filter((letter): letter is string => Boolean(letter))
  const letters = words.length > 1 ? [words[0], words[words.length - 1]] : words
  const initials = Array.from(letters.join("").toUpperCase()).slice(0, 2).join("") || "?"

  // Deterministic pseudo-random assignment: no storage, flicker or SSR hydration mismatch.
  const identity = normalizedEmail || normalizedName.toLowerCase() || "pengguna"
  let hash = 2166136261
  for (const character of identity) hash = Math.imul(hash ^ character.codePointAt(0)!, 16777619)
  return { initials, colorClassName: fallbackColors[(hash >>> 0) % fallbackColors.length] }
}
