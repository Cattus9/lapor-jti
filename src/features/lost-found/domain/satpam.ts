import { isUuid, ReportError, reportStatuses, type ReportActor, type ReportStatus } from "../../reports/domain/report"
import type { SatpamHistoryFilter, SatpamListFilter } from "../types"
import { satpamReportPeriods, satpamReportSorts } from "./satpam-list-filters"

export function requireSatpam(actor: ReportActor) {
  if (actor.role !== "satpam") throw new ReportError("Akses hanya untuk Satpam.", 403)
}
export function requireTicket(value: unknown): string {
  if (typeof value !== "string" || !/^LJ-\d{4}-\d{1,12}$/.test(value)) throw new ReportError("Nomor tiket tidak valid.")
  return value
}
function text(value: unknown, label: string, max: number, required = false) {
  if (value === undefined && !required) return ""
  if (typeof value !== "string" || value.trim().length > max || (required && !value.trim())) throw new ReportError(`${label} tidak valid.`)
  return value.trim()
}
export type SatpamCommand =
  | { type: "status"; ticket: string; status: "diverifikasi" | "diproses" | "ditolak" | "selesai"; note: string }
  | { type: "match"; lossTicket: string; foundTicket: string }
  | { type: "handover"; matchId: string; officerId: string; recipient: string; location: string; note: string }
export function parseSatpamCommand(raw: unknown): SatpamCommand {
  if (!raw || typeof raw !== "object") throw new ReportError("Permintaan tidak valid.")
  const v = raw as Record<string, unknown>
  if (v.type === "status") {
    if (!["diverifikasi", "diproses", "ditolak", "selesai"].includes(String(v.status))) throw new ReportError("Aksi status tidak valid. Gunakan pencocokan atau penyerahan untuk tahap berikutnya.")
    return { type: "status", ticket: requireTicket(v.ticket), status: v.status as "diverifikasi" | "diproses" | "ditolak" | "selesai", note: text(v.note, "Catatan", 2000, v.status === "ditolak") }
  }
  if (v.type === "match") {
    const lossTicket = requireTicket(v.lossTicket), foundTicket = requireTicket(v.foundTicket)
    if (lossTicket === foundTicket) throw new ReportError("Pilih dua laporan yang berbeda.")
    return { type: "match", lossTicket, foundTicket }
  }
  if (v.type === "handover") {
    if (!isUuid(v.matchId)) throw new ReportError("Pasangan laporan tidak valid.")
    if (!isUuid(v.officerId)) throw new ReportError("Pilih petugas penanggung jawab penyerahan.")
    return { type: "handover", matchId: v.matchId, officerId: v.officerId, recipient: text(v.recipient, "Nama penerima", 150, true), location: text(v.location, "Lokasi penyerahan", 200, true), note: text(v.note, "Catatan penyerahan", 2000) }
  }
  throw new ReportError("Aksi tidak valid.")
}
export function expectedStatus(target: ReportStatus): ReportStatus {
  return target === "diproses" ? "diverifikasi" : target === "selesai" ? "diserahkan" : "baru"
}
export function parseSatpamFilter(v: Record<string, unknown> = {}): SatpamListFilter {
  const kind = v.kind ?? "semua", status = v.status ?? "semua"
  const period = v.period ?? "semua", sort = v.sort ?? "terbaru"
  if (!["semua", "kehilangan", "temuan"].includes(String(kind)) || (status !== "semua" && !reportStatuses.includes(status as ReportStatus))) throw new ReportError("Filter laporan tidak valid.")
  if (typeof period !== "string" || !Object.hasOwn(satpamReportPeriods, period)) throw new ReportError("Periode filter tidak valid.")
  if (typeof sort !== "string" || !Object.hasOwn(satpamReportSorts, sort)) throw new ReportError("Urutan laporan tidak valid.")
  return { kind: kind as SatpamListFilter["kind"], status: status as SatpamListFilter["status"], period: period as SatpamListFilter["period"], sort: sort as SatpamListFilter["sort"], query: text(v.q, "Pencarian", 200), matching: v.matching === "1", cursor: v.cursor === undefined ? undefined : text(v.cursor, "Pagination", 160, true) }
}
export function parseHistoryFilter(v: Record<string, unknown> = {}): SatpamHistoryFilter {
  const date = (value: unknown) => {
    if (!value) return undefined
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value) throw new ReportError("Tanggal filter tidak valid.")
    return value
  }
  const from = date(v.from), to = date(v.to)
  if (from && to && from > to) throw new ReportError("Rentang tanggal tidak valid.")
  if (v.officerId && !isUuid(v.officerId)) throw new ReportError("Filter petugas tidak valid.")
  return { query: text(v.q, "Pencarian", 200), officerId: v.officerId ? String(v.officerId) : undefined, from, to, cursor: v.cursor === undefined ? undefined : text(v.cursor, "Pagination", 160, true) }
}
