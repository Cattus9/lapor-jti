import { isUuid, ReportError, type ReportPayload } from "../../reports/domain/report"

export type SatpamDraftKind = "kehilangan" | "temuan"
export type SatpamDraftFields = {
  kind: SatpamDraftKind
  ownerName: string; ownerContact: string; title: string; itemName: string; location: string
  useCustomTime: boolean; incidentDate: string; incidentTime: string; description: string
  founderName: string; foundLocation: string; sourceFoundTicket: string
}
export type SatpamDraftPhoto = { id: string; name: string; mimeType: string; size: number }
export type SatpamDraftView = { id: string; revision: number; fields: SatpamDraftFields; photo: SatpamDraftPhoto | null }

export function emptySatpamDraft(kind: SatpamDraftKind): SatpamDraftFields {
  return { kind, ownerName: "", ownerContact: "", title: "", itemName: "", location: "", useCustomTime: false, incidentDate: "", incidentTime: "", description: "", founderName: "", foundLocation: "", sourceFoundTicket: "" }
}

export function parseSatpamDraft(raw: unknown): SatpamDraftFields {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Isian draft tidak valid.")
  const input = raw as Record<string, unknown>
  if (input.kind !== "kehilangan" && input.kind !== "temuan") throw new ReportError("Jenis draft tidak valid.")
  const result = emptySatpamDraft(input.kind)
  const limits = { ownerName: 150, ownerContact: 150, title: 200, itemName: 200, location: 200, incidentDate: 10, incidentTime: 5, description: 5000, founderName: 150, foundLocation: 200, sourceFoundTicket: 150 } as const
  for (const [key, max] of Object.entries(limits) as Array<[keyof typeof limits, number]>) {
    const value = input[key] ?? ""
    if (typeof value !== "string" || value.length > max || value.includes("\u0000")) throw new ReportError("Isian draft tidak valid atau terlalu panjang.")
    result[key] = value
  }
  if (typeof input.useCustomTime !== "boolean") throw new ReportError("Pilihan waktu draft tidak valid.")
  result.useCustomTime = input.useCustomTime
  // Prevent a hidden field from making an otherwise empty draft appear nonempty.
  if (result.kind === "temuan") Object.assign(result, { ownerName: "", ownerContact: "", title: "", location: "", useCustomTime: false, incidentDate: "", incidentTime: "" })
  else Object.assign(result, { founderName: "", foundLocation: "", sourceFoundTicket: "" })
  if (result.sourceFoundTicket && !/^LJ-\d{4}-\d{1,12}$/.test(result.sourceFoundTicket)) throw new ReportError("Laporan temuan draft tidak valid.")
  if (!result.useCustomTime) { result.incidentDate = ""; result.incidentTime = "" }
  if (result.incidentDate && (!/^\d{4}-\d{2}-\d{2}$/.test(result.incidentDate) || !Number.isFinite(Date.parse(`${result.incidentDate}T00:00:00Z`)) || new Date(`${result.incidentDate}T00:00:00Z`).toISOString().slice(0, 10) !== result.incidentDate)) throw new ReportError("Tanggal draft tidak valid.")
  if (result.incidentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(result.incidentTime)) throw new ReportError("Waktu draft tidak valid.")
  return result
}

export function hasSatpamDraftContent(fields: SatpamDraftFields, hasPhoto: boolean) {
  return hasPhoto || [fields.ownerName, fields.ownerContact, fields.title, fields.itemName, fields.location, fields.description, fields.founderName, fields.foundLocation, fields.incidentDate, fields.incidentTime, fields.sourceFoundTicket].some((value) => Boolean(value.trim()))
}

// Version 2 is reserved for Satpam's operational draft in the existing draft table.
export function toStoredSatpamPayload(fields: SatpamDraftFields, writeId?: string, signature?: string): ReportPayload {
  return { ...fields, ...(writeId ? { satpamWriteId: writeId, satpamWriteSignature: signature } : {}), category: "kehilangan-temuan", reportType: fields.kind === "kehilangan" ? "Kehilangan" : "Temuan", otherLocation: "", itemDetails: "", facilities: [], otherFacility: "", service: "", program: "", otherCategory: "" }
}

export function parseSatpamDraftWrite(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Permintaan draft tidak valid.")
  const value = raw as Record<string, unknown>
  if (!isUuid(value.id) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) throw new ReportError("Identitas atau versi draft tidak valid.")
  if (value.writeId !== undefined && !isUuid(value.writeId)) throw new ReportError("Identitas penyimpanan draft tidak valid.")
  if (value.retainedPhotoId !== null && value.retainedPhotoId !== undefined && !isUuid(value.retainedPhotoId)) throw new ReportError("Foto draft tidak valid.")
  return { id: value.id, revision: Number(value.revision), fields: parseSatpamDraft(value.fields), retainedPhotoId: (value.retainedPhotoId ?? null) as string | null, ...(value.writeId ? { writeId: value.writeId as string } : {}) }
}
