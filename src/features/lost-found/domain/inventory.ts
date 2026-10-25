import { isUuid, ReportError } from "../../reports/domain/report"
import { requireTicket } from "./satpam"

export type InventoryStatus = "tersimpan" | "diserahkan"
export type InventoryItem = {
  id: string; itemName: string; description: string; founderName?: string; status: InventoryStatus
  storageLocation: string; foundLocation?: string; photoUrl?: string; hasStoredPhoto?: boolean
  handoverRecipient?: string; handoverNote?: string; handedOverAt?: string
  handoverOfficer?: string; handoverActor?: string; ownershipEvidence?: string; legacyHandover?: boolean
  sourceFoundTicket?: string; sourceFoundTitle?: string; linkedLossTicket?: string
  registeredByName: string; createdAt: string; updatedAt: string
}
export type InventoryFilter = { query?: string; status?: "semua" | InventoryStatus; cursor?: string }
export function parseInventoryFilter(raw: Record<string, unknown>): InventoryFilter {
  if (raw.q !== undefined && typeof raw.q !== "string") throw new ReportError("Pencarian inventaris tidak valid.")
  const query = (raw.q as string | undefined)?.trim()
  if (query && query.length > 100) throw new ReportError("Pencarian maksimal 100 karakter.")
  if (raw.status !== undefined && !["semua", "tersimpan", "diserahkan"].includes(raw.status as string)) throw new ReportError("Status inventaris tidak valid.")
  if (raw.cursor !== undefined && (typeof raw.cursor !== "string" || !raw.cursor || raw.cursor.length > 160)) throw new ReportError("Pagination tidak valid.")
  return { query, status: (raw.status as InventoryFilter["status"]) ?? "semua", cursor: raw.cursor as string | undefined }
}
export type CreateInventoryInput = {
  itemName: string; description?: string; founderName?: string; foundLocation?: string
  sourceFoundTicket?: string; submissionKey?: string
}
export type HandoverInventoryInput = {
  id: string; recipient: string; note?: string; officerId: string; ownershipEvidence: string
  lossTicket?: string; submissionKey: string
}
export function assertInventoryReportCompletable(report: { category: string; handlerRole: string; status: string }) {
  if (report.category !== "kehilangan-temuan" || report.handlerRole !== "satpam" || !["baru", "diproses"].includes(report.status)) throw new ReportError("Laporan tertaut sudah berubah atau telah diselesaikan.", 409)
}
function object(raw: unknown): Record<string, unknown> {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Isian inventaris tidak valid.")
  return raw as Record<string, unknown>
}
function text(v: Record<string, unknown>, key: string, label: string, max: number, required = false): string {
  const raw = v[key]
  if (raw === undefined && !required) return ""
  if (typeof raw !== "string" || raw.trim().length > max || (required && !raw.trim())) throw new ReportError(`${label} tidak valid (maksimal ${max} karakter).`)
  return raw.trim()
}
export function validateCreateInventory(raw: unknown): CreateInventoryInput {
  const v = object(raw)
  if (v.photoUrl) throw new ReportError("Gunakan unggahan foto privat. Tautan foto eksternal tidak didukung.")
  if (v.submissionKey !== undefined && !isUuid(v.submissionKey)) throw new ReportError("Kunci pengiriman tidak valid.")
  return {
    itemName: text(v, "itemName", "Nama barang", 200, true),
    description: text(v, "description", "Deskripsi", 2000),
    founderName: text(v, "founderName", "Nama penemu", 150) || undefined,
    foundLocation: text(v, "foundLocation", "Lokasi temuan", 200) || undefined,
    sourceFoundTicket: v.sourceFoundTicket ? requireTicket(v.sourceFoundTicket) : undefined,
    submissionKey: v.submissionKey as string | undefined,
  }
}
export function validateHandoverInventory(raw: unknown): HandoverInventoryInput {
  const v = object(raw)
  if (!isUuid(v.id)) throw new ReportError("ID barang tidak valid.")
  if (!isUuid(v.officerId)) throw new ReportError("Pilih petugas penanggung jawab penyerahan.")
  if (!isUuid(v.submissionKey)) throw new ReportError("Kunci penyerahan tidak valid. Muat ulang form.")
  return {
    id: v.id, officerId: v.officerId, submissionKey: v.submissionKey,
    recipient: text(v, "recipient", "Nama penerima", 150, true),
    ownershipEvidence: text(v, "ownershipEvidence", "Hasil pemeriksaan kepemilikan", 1000, true),
    note: text(v, "note", "Catatan penyerahan", 2000) || undefined,
    lossTicket: v.lossTicket ? requireTicket(v.lossTicket) : undefined,
  }
}
