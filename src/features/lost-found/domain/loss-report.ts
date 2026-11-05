import { validateSatpamIncident } from "./incident-time"
import { isUuid, ReportError } from "../../reports/domain/report"

export type LossReport = {
  id: string
  ticket?: string
  ticketNumber?: string
  title?: string
  itemName: string
  location?: string
  incidentDate?: string
  incidentTime?: string
  characteristics: string
  description: string
  photoUrl?: string
  registeredByName: string
  createdAt: string
}

export type CreateLossReportInput = {
  submissionKey?: string
  draftRevision?: string
  ownerName?: string
  ownerContact?: string
  title?: string
  itemName: string
  location?: string
  incidentDate?: string
  incidentTime?: string
  characteristics: string
  description: string
  photoUrl?: string
}

export function validateCreateLossReport(input: CreateLossReportInput) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new ReportError("Isian laporan tidak valid.")
  for (const value of Object.values(input)) if (value !== undefined && typeof value !== "string") throw new ReportError("Isian laporan tidak valid.")
  if (input.submissionKey && (!isUuid(input.submissionKey) || !/^\d+$/.test(input.draftRevision ?? "") || !Number.isSafeInteger(Number(input.draftRevision)))) throw new ReportError("Identitas draft tidak valid.")
  if (!input.submissionKey && input.draftRevision) throw new ReportError("Identitas draft tidak valid.")
  const ownerName = input.ownerName?.trim() || undefined
  const ownerContact = input.ownerContact?.trim() || undefined
  if ((ownerName?.length ?? 0) > 150 || (ownerContact?.length ?? 0) > 150) throw new ReportError("Nama dan kontak pemilik maksimal 150 karakter.")
  const itemName = input.itemName?.trim() ?? ""
  if (!itemName) throw new ReportError("Nama barang wajib diisi.", 400)
  if (itemName.length > 200) throw new ReportError("Nama barang maksimal 200 karakter.", 400)

  const title = input.title?.trim() || undefined
  if (title && title.length > 200) throw new ReportError("Judul laporan maksimal 200 karakter.", 400)

  const location = input.location?.trim() || undefined
  if (location && location.length > 200) throw new ReportError("Lokasi kejadian maksimal 200 karakter.", 400)

  const incidentDate = input.incidentDate?.trim() || undefined
  if (incidentDate && !/^\d{4}-\d{2}-\d{2}$/.test(incidentDate)) {
    throw new ReportError("Format tanggal kejadian tidak valid (YYYY-MM-DD).", 400)
  }

  const incidentTime = input.incidentTime?.trim() || undefined
  if (incidentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(incidentTime)) {
    throw new ReportError("Format waktu kejadian tidak valid (HH:MM).", 400)
  }

  const characteristics = input.characteristics?.trim() ?? ""
  if (!characteristics) throw new ReportError("Ciri-ciri barang wajib diisi.", 400)
  if (characteristics.length > 2000) throw new ReportError("Ciri-ciri maksimal 2000 karakter.", 400)

  const description = input.description?.trim() ?? ""
  if (!description) throw new ReportError("Detail/kronologi kehilangan wajib diisi.", 400)
  if (description.length > 5000) throw new ReportError("Detail/kronologi maksimal 5000 karakter.", 400)

  validateSatpamIncident(incidentDate, incidentTime)
  const photoUrl = input.photoUrl?.trim() || undefined
  if (photoUrl) throw new ReportError("Gunakan unggahan foto privat. Tautan foto eksternal tidak didukung.")

  return {
    submissionKey: input.submissionKey || undefined,
    draftRevision: input.submissionKey ? input.draftRevision : undefined,
    ownerName,
    ownerContact,
    title,
    itemName,
    location,
    incidentDate,
    incidentTime,
    characteristics,
    description,
    photoUrl,
  }
}
