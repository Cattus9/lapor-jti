import { isUuid, ReportError, type AttachmentUpload, type ReportActor, type StoredAttachment } from "../../reports/domain/report"
import type { AttachmentStorage } from "../../reports/application/ports"
import { parseHistoryFilter, parseSatpamCommand, parseSatpamFilter, requireSatpam, requireTicket } from "../domain/satpam"
import { parseInventoryFilter, validateCreateInventory, validateHandoverInventory } from "../domain/inventory"
import { validateCreateLossReport, type CreateLossReportInput } from "../domain/loss-report"
import { validateCreateFoundReport, type CreateFoundReportInput } from "../domain/found-report"
import type { SatpamRepository } from "./ports"
import { validateUploads } from "../../reports/domain/report"



export class SatpamService {
  constructor(private readonly repository: SatpamRepository, private readonly storage: AttachmentStorage) {}
  private async readPhoto(file: StoredAttachment, preview: boolean) {
    if (preview && file.mimeType.startsWith("image/") && this.storage.readPreview) return this.storage.readPreview(file)
    return { bytes: await this.storage.read(file), mimeType: file.mimeType }
  }
  workspace(actor: ReportActor) { requireSatpam(actor); return this.repository.workspace() }
  pending(actor: ReportActor, cursor?: string) { requireSatpam(actor); return this.repository.pending(cursor) }
  list(actor: ReportActor, filters: Record<string, unknown>) { requireSatpam(actor); return this.repository.list(parseSatpamFilter(filters)) }
  dashboard(actor: ReportActor) { requireSatpam(actor); return this.repository.dashboard() }
  history(actor: ReportActor, filters: Record<string, unknown>) { requireSatpam(actor); return this.repository.history(parseHistoryFilter(filters)) }
  async detail(actor: ReportActor, ticket: string) {
    requireSatpam(actor)
    const detail = await this.repository.detail(requireTicket(ticket))
    if (!detail) throw new ReportError("Laporan tidak ditemukan.", 404)
    return detail
  }
  async execute(actor: ReportActor, raw: unknown, file?: AttachmentUpload) {
    requireSatpam(actor)
    const command = parseSatpamCommand(raw)
    let storedPhoto: { storageKey: string; mimeType: string; name: string; id: string; size: number } | undefined
    if (file && command.type === "handover") {
      validateUploads([file], 0)
      if (!file.mimeType.startsWith("image/")) throw new ReportError("Lampiran penyerahan harus berupa foto.")
      const [photo] = await this.storage.store([file])
      storedPhoto = photo
    }
    try {
      await this.repository.execute(actor, command, storedPhoto ? { storageKey: storedPhoto.storageKey, mimeType: storedPhoto.mimeType, name: storedPhoto.name } : undefined)
      return { ok: true }
    } catch (error) {
      if (storedPhoto) await this.storage.remove([storedPhoto]).catch(() => {})
      throw error
    }
  }
  async download(actor: ReportActor, id: string, preview = false) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const file = await this.repository.attachment(id)
    if (!file) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const result = await this.readPhoto(file, preview)
    return { file: { ...file, mimeType: result.mimeType }, bytes: result.bytes }
  }
  notifications(actor: ReportActor, cursor?: string) { requireSatpam(actor); return this.repository.notifications(actor.id, cursor) }
  markRead(actor: ReportActor, id?: string) {
    requireSatpam(actor)
    if (id && !isUuid(id)) throw new ReportError("Notifikasi tidak valid.")
    return this.repository.markRead(actor.id, id)
  }

  async listInventory(actor: ReportActor, filters: Record<string, unknown>) {
    requireSatpam(actor)
    return this.repository.listInventory(parseInventoryFilter(filters))
  }

  async createInventory(actor: ReportActor, raw: unknown, file?: AttachmentUpload) {
    requireSatpam(actor)
    const validated = validateCreateInventory(raw)
    let storedPhoto: { storageKey: string; mimeType: string; name: string; digest?: string; id: string; size: number } | undefined
    if (file) {
      validateUploads([file], 0)
      if (!file.mimeType.startsWith("image/")) throw new ReportError("Lampiran inventaris harus berupa foto.")
      const [stored] = await this.storage.store([file])
      storedPhoto = stored
    }
    try {
      const item = await this.repository.createInventory(actor, validated, storedPhoto)
      // On an idempotent retry a newly staged photo must not become an orphan.
      if (storedPhoto && (await this.repository.getInventoryPhoto(item.id))?.storageKey !== storedPhoto.storageKey) await this.storage.remove([storedPhoto])
      return item
    } catch (error) {
      if (storedPhoto) await this.storage.remove([storedPhoto])
      throw error
    }
  }

  async handoverInventory(actor: ReportActor, raw: unknown, file?: AttachmentUpload) {
    requireSatpam(actor)
    const validated = validateHandoverInventory(raw)
    let storedPhoto: { storageKey: string; mimeType: string; name: string; id: string; size: number } | undefined
    if (file) {
      validateUploads([file], 0)
      if (!file.mimeType.startsWith("image/")) throw new ReportError("Lampiran penyerahan harus berupa foto.")
      const [photo] = await this.storage.store([file])
      storedPhoto = photo
    }
    try {
      return await this.repository.handoverInventory(actor, validated, storedPhoto ? { storageKey: storedPhoto.storageKey, mimeType: storedPhoto.mimeType, name: storedPhoto.name } : undefined)
    } catch (error) {
      if (storedPhoto) await this.storage.remove([storedPhoto]).catch(() => {})
      throw error
    }
  }

  async downloadHandoverPhoto(actor: ReportActor, id: string, preview = false) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Foto tidak ditemukan.", 404)
    const photo = await this.repository.getHandoverPhoto(id)
    if (!photo) throw new ReportError("Foto tidak ditemukan.", 404)
    const result = await this.readPhoto({ ...photo, id, size: 0 }, preview)
    return { photo: { ...photo, mimeType: result.mimeType }, bytes: result.bytes }
  }

  async downloadInventoryPhoto(actor: ReportActor, id: string, preview = false) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Foto tidak ditemukan.", 404)
    const photo = await this.repository.getInventoryPhoto(id)
    if (!photo) throw new ReportError("Foto tidak ditemukan.", 404)
    const result = await this.readPhoto({ ...photo, id, size: 0 }, preview)
    return { photo: { ...photo, mimeType: result.mimeType }, bytes: result.bytes }
  }

  correctInventory(actor: ReportActor, id: string, raw: unknown) { requireSatpam(actor); return this.repository.correctInventory(actor, id, raw) }

  async getInventoryItem(actor: ReportActor, id: string) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Barang tidak ditemukan.", 404)
    const item = await this.repository.getInventoryItem(id)
    if (!item) throw new ReportError("Barang tidak ditemukan.", 404)
    return item
  }

  listLossReports(actor: ReportActor) {
    requireSatpam(actor)
    return this.repository.listLossReports()
  }

  async createLossReport(actor: ReportActor, raw: unknown, file?: AttachmentUpload) {
    requireSatpam(actor)
    const validated = validateCreateLossReport(raw as CreateLossReportInput)
    let storedPhoto: { storageKey: string; mimeType: string; name: string } | undefined
    if (file) {
      validateUploads([file], 0)
      if (!["image/jpeg", "image/png"].includes(file.mimeType)) throw new ReportError("Lampiran harus berupa foto JPG atau PNG.")
      const [stored] = await this.storage.store([file])
      storedPhoto = stored
    }
    try {
      const result = await this.repository.createLossReport(actor, validated, storedPhoto)
      if (storedPhoto && (await this.repository.getLossReportPhoto(result.id))?.storageKey !== storedPhoto.storageKey) await this.storage.remove([{ ...storedPhoto, id: "", size: 0 }])
      return result
    } catch (error) {
      if (storedPhoto) await this.storage.remove([{ ...storedPhoto, id: "", size: 0 }])
      throw error
    }
  }

  async downloadLossReportPhoto(actor: ReportActor, id: string, preview = false) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Foto tidak ditemukan.", 404)
    const photo = await this.repository.getLossReportPhoto(id)
    if (!photo) throw new ReportError("Foto tidak ditemukan.", 404)
    const result = await this.readPhoto({ ...photo, id, size: 0 }, preview)
    return { photo: { ...photo, mimeType: result.mimeType }, bytes: result.bytes }
  }

  async createFoundReport(actor: ReportActor, raw: unknown, file?: AttachmentUpload) {
    requireSatpam(actor)
    const validated = validateCreateFoundReport(raw as CreateFoundReportInput)
    let storedPhoto: { storageKey: string; mimeType: string; name: string } | undefined
    if (file) {
      validateUploads([file], 0)
      if (!["image/jpeg", "image/png"].includes(file.mimeType)) throw new ReportError("Lampiran harus berupa foto JPG atau PNG.")
      const [stored] = await this.storage.store([file])
      storedPhoto = stored
    }
    try {
      return await this.repository.createFoundReport(actor, validated, storedPhoto)
    } catch (error) {
      if (storedPhoto) await this.storage.remove([{ ...storedPhoto, id: "", size: 0 }])
      throw error
    }
  }
}

