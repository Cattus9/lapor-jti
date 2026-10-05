// [AUTH-ROLE] Authorization uses the application role, independently of the SSO provider.
import { isUuid, ReportError, type ReportActor } from "../../reports/domain/report"
import { defaultReportFilters, parseReportListFilters } from "../../reports/domain/report-list-filters"
import type { TechnicianFilter, TechnicianStatus } from "../types"

export const technicianStatuses = ["baru", "diverifikasi", "diproses", "selesai", "ditolak"] as const
export function requireTechnician(actor: ReportActor) {
  if (actor.role !== "teknisi") throw new ReportError("Akses hanya untuk Teknisi.", 403)
}
export function requireTechnicianTicket(value: unknown): string {
  if (typeof value !== "string" || !/^LJ-\d{4}-\d{1,12}$/.test(value)) throw new ReportError("Nomor tiket tidak valid.")
  return value
}
function boundedText(value: unknown, label: string, max: number, required = false): string {
  if (value === undefined && !required) return ""
  if (typeof value !== "string" || value.length > max || value.includes("\u0000") || (required && !value.trim())) throw new ReportError(`${label} tidak valid.`)
  return value.trim()
}
export type TechnicianCommand = { ticket: string; status: Exclude<TechnicianStatus, "baru">; note: string }
export function parseTechnicianCommand(raw: unknown): TechnicianCommand {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Permintaan tidak valid.")
  const value = raw as Record<string, unknown>
  if (typeof value.status !== "string" || !["diverifikasi", "diproses", "selesai", "ditolak"].includes(value.status)) throw new ReportError("Aksi status tidak valid.")
  return { ticket: requireTechnicianTicket(value.ticket), status: value.status as TechnicianCommand["status"], note: boundedText(value.note, "Catatan pekerjaan", 2000, value.status === "selesai" || value.status === "ditolak") }
}
export function technicianExpectedStatus(target: TechnicianCommand["status"]): TechnicianStatus {
  return target === "diproses" ? "diverifikasi" : target === "selesai" ? "diproses" : "baru"
}
export function parseTechnicianFilter(value: Record<string, unknown> = {}): TechnicianFilter {
  const status = value.status ?? "semua", sort = value.sort ?? "terbaru"
  if (status !== "semua" && !technicianStatuses.includes(status as TechnicianStatus)) throw new ReportError("Status filter fasilitas tidak valid.")
  if (sort !== "terbaru" && sort !== "terlama") throw new ReportError("Urutan laporan tidak valid.")
  const dateFilters = parseReportListFilters({ ...defaultReportFilters, category: "fasilitas", period: value.period ?? "semua", from: value.from, to: value.to })
  const locationId = value.locationId === undefined ? undefined : boundedText(value.locationId, "Lokasi", 100, true)
  if (locationId && !/^[a-z0-9][a-z0-9_-]*$/i.test(locationId)) throw new ReportError("Lokasi filter tidak valid.")
  if (value.active !== undefined && value.active !== "1" && value.active !== "0") throw new ReportError("Filter laporan aktif tidak valid.")
  if (value.classified !== undefined && value.classified !== "1" && value.classified !== "0") throw new ReportError("Filter klasifikasi tidak valid.")
  return { status: status as TechnicianFilter["status"], sort, period: dateFilters.period, from: dateFilters.from, to: dateFilters.to,
    query: boundedText(value.q, "Pencarian", 200), locationId, activeOnly: value.active === "1", classifiedOnly: value.classified === "1", cursor: value.cursor === undefined ? undefined : boundedText(value.cursor, "Pagination", 160, true) }
}
export function requireNotificationId(value?: string) {
  if (value !== undefined && !isUuid(value)) throw new ReportError("Notifikasi tidak valid.")
}
