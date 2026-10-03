import type { BadgeTone } from "./badge"

type StatusPresentation = Readonly<{ tone: BadgeTone; className?: string }>

// Shared lifecycle colors for database values, legacy labels, and every dashboard role.
// Verified is not a warning; handed over is not yet closed. Keep those stages distinct.
const presentations = {
  baru: { tone: "info", className: "border-blue-300 bg-blue-100 text-blue-800 dark:border-blue-700 dark:bg-blue-900/60 dark:text-blue-200" },
  diverifikasi: { tone: "cyan" },
  diproses: { tone: "warning" },
  "barang teridentifikasi": { tone: "violet" },
  diserahkan: { tone: "teal" },
  selesai: { tone: "success", className: "border-emerald-300 bg-emerald-100 text-emerald-800 dark:border-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-200" },
  ditolak: { tone: "destructive", className: "border-red-200 bg-red-50 text-red-700 dark:border-red-800/70 dark:bg-red-950/60 dark:text-red-300" },
  "perlu diverifikasi": { tone: "warning" },
} satisfies Record<string, StatusPresentation>

const aliases = new Map([
  ["sedang diproses", "diproses"],
  ["ditemukan", "barang teridentifikasi"],
  ["dicocokkan", "barang teridentifikasi"],
  ["menunggu penyerahan", "barang teridentifikasi"],
])
const fallback: StatusPresentation = { tone: "neutral" }

export function getStatusBadgePresentation(status: string): StatusPresentation {
  const normalized = status.trim().toLocaleLowerCase("id-ID").replace(/_/g, " ").replace(/\s+/g, " ")
  const key = aliases.get(normalized) ?? normalized
  return Object.hasOwn(presentations, key) ? presentations[key as keyof typeof presentations] : fallback
}
