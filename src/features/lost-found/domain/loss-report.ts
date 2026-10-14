import { ReportError } from "../../reports/domain/report"

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

  const photoUrl = input.photoUrl?.trim() || undefined
  if (photoUrl) {
    try {
      const parsed = new URL(photoUrl)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") throw new Error("Protocol not supported")
    } catch {
      throw new ReportError("Tautan foto harus berupa URL valid (http/https).", 400)
    }
  }

  return {
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
