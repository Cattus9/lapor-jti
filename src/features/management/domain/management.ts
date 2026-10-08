// [AUTH-ROLE] Application roles are read from the server session, never from provider claims or form input.
import { isUuid, ReportError, reportCategories, reportStatuses, type ReportActor, type ReportCategory, type ReportStatus } from "../../reports/domain/report"
import { defaultReportFilters, parseReportListFilters } from "../../reports/domain/report-list-filters"
import type { ManagementFilter, MonitoringReportCategory } from "../types"

export const managementCategories = ["layanan", "lainnya"] as const
export const categoryLabels: Record<ReportCategory, MonitoringReportCategory> = { "kehilangan-temuan": "Kehilangan & Temuan", fasilitas: "Fasilitas", layanan: "Layanan", lainnya: "Lainnya" }
export const handlerLabels = { satpam: "Satpam", teknisi: "Teknisi", manajemen: "Manajemen Jurusan" } as const
export function requireManagement(actor: ReportActor) {
  if (actor.role !== "manajemen") throw new ReportError("Akses hanya untuk Manajemen.", 403)
}
export function requireManagementTicket(value: unknown): string {
  if (typeof value !== "string" || !/^LJ-\d{4}-\d{1,12}$/.test(value)) throw new ReportError("Nomor tiket tidak valid.")
  return value
}
function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined && !required) return ""
  if (typeof value !== "string" || value.length > max || value.includes("\u0000") || (required && !value.trim())) throw new ReportError(`${label} tidak valid.`)
  return value.trim()
}
export type ManagementCommand = { ticket: string; status: "diproses" | "selesai" | "ditolak"; note: string }
export function parseManagementCommand(raw: unknown): ManagementCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Permintaan tidak valid.")
  const value = raw as Record<string, unknown>
  if (typeof value.status !== "string" || !["diproses", "selesai", "ditolak"].includes(value.status)) throw new ReportError("Aksi status tidak valid.")
  return { ticket: requireManagementTicket(value.ticket), status: value.status as ManagementCommand["status"], note: text(value.note, "Tanggapan", 2000, value.status !== "diproses") }
}
export const managementExpectedStatus = (status: ManagementCommand["status"]): ReportStatus => status === "selesai" ? "diproses" : "baru"
export function parseManagementFilter(raw: Record<string, unknown> = {}, operational = false): ManagementFilter {
  const category = raw.category ?? "semua", status = raw.status ?? "semua", sort = raw.sort ?? "terbaru"
  if (category !== "semua" && !reportCategories.includes(category as ReportCategory)) throw new ReportError("Kategori filter tidak valid.")
  if (operational && category !== "semua" && !managementCategories.includes(category as typeof managementCategories[number])) throw new ReportError("Kategori ini hanya tersedia di Monitoring.", 403)
  if (status !== "semua" && status !== "dalam-penanganan" && status !== "belum-selesai" && !reportStatuses.includes(status as ReportStatus)) throw new ReportError("Status filter tidak valid.")
  if (operational && !["semua", "dalam-penanganan", "belum-selesai", "baru", "diproses", "selesai", "ditolak"].includes(status as string)) throw new ReportError("Status ini hanya tersedia di Monitoring.")
  const dateBasis = raw.date ?? "submitted"
  if ((dateBasis !== "submitted" && dateBasis !== "completed") || (dateBasis === "completed" && status !== "selesai")) throw new ReportError("Tanggal selesai hanya tersedia untuk laporan selesai.")
  if (sort !== "terbaru" && sort !== "terlama") throw new ReportError("Urutan laporan tidak valid.")
  const dates = parseReportListFilters({ ...defaultReportFilters, period: raw.period ?? "semua", from: raw.from, to: raw.to })
  return { category: category as ManagementFilter["category"], status: status as ManagementFilter["status"], dateBasis, sort, period: dates.period, from: dates.from, to: dates.to,
    query: text(raw.q, "Pencarian", 200), cursor: raw.cursor === undefined ? undefined : text(raw.cursor, "Pagination", 160, true) }
}
export function requireManagementNotificationId(id?: string) {
  if (id !== undefined && !isUuid(id)) throw new ReportError("Notifikasi tidak valid.")
}
