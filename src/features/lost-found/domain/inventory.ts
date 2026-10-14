import { ReportError } from "../../reports/domain/report"

export type InventoryStatus = "tersimpan" | "diserahkan"

export type InventoryItem = {
  id: string
  itemName: string
  description: string
  founderName?: string
  status: InventoryStatus
  storageLocation: string
  foundLocation?: string
  photoUrl?: string
  hasStoredPhoto?: boolean
  handoverRecipient?: string
  handoverNote?: string
  handedOverAt?: string
  registeredByName: string
  createdAt: string
  updatedAt: string
}

export type InventoryFilter = {
  query?: string
  status?: "semua" | InventoryStatus
}

export type CreateInventoryInput = {
  itemName: string
  description?: string
  founderName?: string
  foundLocation?: string
  photoUrl?: string
}

export type HandoverInventoryInput = {
  id: string
  recipient: string
  note?: string
}

export function validateCreateInventory(input: CreateInventoryInput) {
  const itemName = input.itemName?.trim() ?? ""
  if (!itemName) {
    throw new ReportError("Nama barang wajib diisi.", 400)
  }
  if (itemName.length > 200) {
    throw new ReportError("Nama barang maksimal 200 karakter.", 400)
  }

  const description = input.description?.trim() ?? ""
  if (description.length > 2000) {
    throw new ReportError("Deskripsi maksimal 2000 karakter.", 400)
  }

  const founderName = input.founderName?.trim() || undefined
  if (founderName && founderName.length > 150) {
    throw new ReportError("Nama penemu maksimal 150 karakter.", 400)
  }

  const foundLocation = input.foundLocation?.trim() || undefined
  if (foundLocation && foundLocation.length > 200) {
    throw new ReportError("Lokasi temuan maksimal 200 karakter.", 400)
  }

  const photoUrl = input.photoUrl?.trim() || undefined
  if (photoUrl) {
    try {
      const parsed = new URL(photoUrl)
      if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
        throw new Error("Protocol not supported")
      }
    } catch {
      throw new ReportError("Tautan foto harus berupa URL valid (http/https).", 400)
    }
  }

  return {
    itemName,
    description,
    founderName,
    foundLocation,
    photoUrl,
  }
}

export function validateHandoverInventory(input: HandoverInventoryInput) {
  if (!input.id) {
    throw new ReportError("ID barang tidak valid.", 400)
  }
  const recipient = input.recipient?.trim() ?? ""
  if (!recipient) {
    throw new ReportError("Nama penerima barang wajib diisi.", 400)
  }
  if (recipient.length > 150) {
    throw new ReportError("Nama penerima maksimal 150 karakter.", 400)
  }
  const note = input.note?.trim() || undefined
  if (note && note.length > 2000) {
    throw new ReportError("Catatan penyerahan maksimal 2000 karakter.", 400)
  }

  return {
    id: input.id,
    recipient,
    note,
  }
}
