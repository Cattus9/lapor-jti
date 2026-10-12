import { isUuid, ReportError, type AttachmentUpload, type ReportActor } from "../../reports/domain/report"
import type { AttachmentStorage } from "../../reports/application/ports"
import { parseHistoryFilter, parseSatpamCommand, parseSatpamFilter, requireSatpam, requireTicket } from "../domain/satpam"
import { validateCreateInventory, validateHandoverInventory, type CreateInventoryInput, type HandoverInventoryInput } from "../domain/inventory"
import type { SatpamRepository } from "./ports"


export class SatpamService {
  constructor(private readonly repository: SatpamRepository, private readonly storage: AttachmentStorage) {}
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
  async execute(actor: ReportActor, raw: unknown) {
    requireSatpam(actor)
    await this.repository.execute(actor, parseSatpamCommand(raw))
    return { ok: true }
  }
  async download(actor: ReportActor, id: string) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const file = await this.repository.attachment(id)
    if (!file) throw new ReportError("Lampiran tidak ditemukan.", 404)
    return { file, bytes: await this.storage.read(file) }
  }
  notifications(actor: ReportActor, cursor?: string) { requireSatpam(actor); return this.repository.notifications(actor.id, cursor) }
  markRead(actor: ReportActor, id?: string) {
    requireSatpam(actor)
    if (id && !isUuid(id)) throw new ReportError("Notifikasi tidak valid.")
    return this.repository.markRead(actor.id, id)
  }

  async listInventory(actor: ReportActor, filters: Record<string, unknown>) {
    requireSatpam(actor)
    const query = typeof filters.q === "string" ? filters.q.trim() : undefined
    const status = filters.status === "tersimpan" || filters.status === "diserahkan" ? filters.status : "semua"
    return this.repository.listInventory({ query, status })
  }

  async createInventory(actor: ReportActor, raw: unknown, file?: AttachmentUpload) {
    requireSatpam(actor)
    const validated = validateCreateInventory(raw as CreateInventoryInput)
    let storedPhoto: { storageKey: string; mimeType: string; name: string } | undefined
    if (file) {
      if (!file.mimeType.startsWith("image/")) {
        throw new ReportError("File lampiran harus berupa gambar (JPG atau PNG).", 400)
      }
      if (file.bytes.length > 5 * 1024 * 1024) {
        throw new ReportError("Ukuran foto maksimal 5 MB.", 400)
      }
      const [stored] = await this.storage.store([file])
      storedPhoto = stored
    }
    return this.repository.createInventory(actor, validated, storedPhoto)
  }

  async handoverInventory(actor: ReportActor, raw: unknown) {
    requireSatpam(actor)
    const validated = validateHandoverInventory(raw as HandoverInventoryInput)
    return this.repository.handoverInventory(actor, validated)
  }

  async downloadInventoryPhoto(actor: ReportActor, id: string) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Foto tidak ditemukan.", 404)
    const photo = await this.repository.getInventoryPhoto(id)
    if (!photo) throw new ReportError("Foto tidak ditemukan.", 404)
    const bytes = await this.storage.read({ id, name: photo.name, mimeType: photo.mimeType, size: 0, storageKey: photo.storageKey })
    return { photo, bytes }
  }

  async getInventoryItem(actor: ReportActor, id: string) {
    requireSatpam(actor)
    if (!isUuid(id)) throw new ReportError("Barang tidak ditemukan.", 404)
    const item = await this.repository.getInventoryItem(id)
    if (!item) throw new ReportError("Barang tidak ditemukan.", 404)
    return item
  }
}
