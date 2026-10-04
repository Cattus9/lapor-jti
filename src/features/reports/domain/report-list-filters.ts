import { lifecycleByCategory, reportCategories, reportStatuses, ReportError, type ReportCategory, type ReportStatus } from "./report"

export const reportPeriods = {
  semua: "Semua waktu",
  "hari-ini": "Hari ini",
  "7-hari": "7 hari terakhir",
  "30-hari": "30 hari terakhir",
  "bulan-ini": "Bulan ini",
  rentang: "Rentang tanggal",
} as const
export const reportProcessFilters = {
  semua: "Semua",
  "belum-selesai": "Belum selesai",
  selesai: "Selesai",
} as const
export type ReportListFilters = {
  q: string
  category: ReportCategory | "semua"
  status: keyof typeof reportProcessFilters
  period: keyof typeof reportPeriods
  from: string
  to: string
}
export const defaultReportFilters: ReportListFilters = { q: "", category: "semua", status: "semua", period: "semua", from: "", to: "" }

function text(value: unknown): string {
  if (value === undefined || value === null) return ""
  if (typeof value !== "string") throw new ReportError("Filter laporan tidak valid.")
  return value.trim()
}
function validDate(value: string) {
  if (!/^[1-9]\d{3}-\d{2}-\d{2}$/.test(value) || value.startsWith("9999")) return false
  const date = new Date(`${value}T00:00:00Z`)
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
}
export function parseReportListFilters(raw: unknown = {}): ReportListFilters {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Filter laporan tidak valid.")
  const value = raw as Record<string, unknown>
  const q = text(value.q)
  const category = text(value.category) || "semua"
  const status = text(value.status) || "semua"
  const period = text(value.period) || "semua"
  if (q.length > 100) throw new ReportError("Pencarian maksimal 100 karakter.")
  if (category !== "semua" && !reportCategories.includes(category as ReportCategory)) throw new ReportError("Kategori filter tidak valid.")
  if (status !== "semua" && status !== "belum-selesai" && !reportStatuses.includes(status as ReportStatus)) throw new ReportError("Status filter tidak valid.")
  if (!Object.hasOwn(reportPeriods, period)) throw new ReportError("Periode filter tidak valid.")
  if (category !== "semua" && status !== "semua" && status !== "belum-selesai" && status !== "ditolak" && !lifecycleByCategory[category as ReportCategory].includes(status as ReportStatus)) throw new ReportError("Status tidak tersedia untuk kategori ini.")
  const from = period === "rentang" ? text(value.from) : ""
  const to = period === "rentang" ? text(value.to) : ""
  if (period === "rentang" && (!validDate(from) || !validDate(to) || from > to)) throw new ReportError("Pilih rentang tanggal yang valid; tanggal akhir tidak boleh sebelum tanggal awal.")
  // Older per-stage URLs remain readable, but now use the compact process groups.
  // Rejected reports are visible in All, not counted as active or completed.
  const process = status === "semua" || status === "ditolak" ? "semua" : status === "selesai" ? "selesai" : "belum-selesai"
  return { q, category: category as ReportListFilters["category"], status: process, period: period as ReportListFilters["period"], from, to }
}

const dayMs = 86_400_000
// Jakarta uses UTC+7 year-round. Bounds are calendar days in WIB, not host time.
export function reportDateBounds(filters: ReportListFilters, now = new Date()): { from?: Date; until?: Date } {
  if (filters.period === "semua") return {}
  const today = new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
  const start = new Date(`${today}T00:00:00+07:00`)
  if (filters.period === "rentang") return { from: new Date(`${filters.from}T00:00:00+07:00`), until: new Date(new Date(`${filters.to}T00:00:00+07:00`).getTime() + dayMs) }
  const until = new Date(start.getTime() + dayMs)
  const from = filters.period === "bulan-ini" ? new Date(`${today.slice(0, 7)}-01T00:00:00+07:00`)
    : new Date(start.getTime() - (filters.period === "7-hari" ? 6 : filters.period === "30-hari" ? 29 : 0) * dayMs)
  return { from, until }
}
export function hasReportFilters(filters: ReportListFilters) {
  return Boolean(filters.q || filters.category !== "semua" || filters.status !== "semua" || filters.period !== "semua")
}
export function reportListHref(filters: ReportListFilters, cursors: { cursor?: string | null; draftCursor?: string | null } = {}) {
  const query = new URLSearchParams()
  if (filters.q) query.set("q", filters.q)
  if (filters.category !== "semua") query.set("category", filters.category)
  if (filters.status !== "semua") query.set("status", filters.status)
  if (filters.period !== "semua") query.set("period", filters.period)
  if (filters.period === "rentang") { query.set("from", filters.from); query.set("to", filters.to) }
  if (cursors.cursor) query.set("cursor", cursors.cursor)
  if (cursors.draftCursor) query.set("draftCursor", cursors.draftCursor)
  return `/pelapor/laporan-saya${query.size ? `?${query}` : ""}`
}
