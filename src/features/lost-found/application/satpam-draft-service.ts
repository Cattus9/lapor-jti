import { isUuid, ReportError, validateUploads, type AttachmentUpload, type ReportActor } from "../../reports/domain/report"
import type { AttachmentStorage } from "../../reports/application/ports"
import { requireSatpam } from "../domain/satpam"
import { parseSatpamDraftWrite } from "../domain/satpam-draft"
import type { SatpamDraftRepository } from "./ports"

export class SatpamDraftService {
  constructor(private readonly repository: SatpamDraftRepository, private readonly storage: AttachmentStorage) {}
  list(actor: ReportActor) { requireSatpam(actor); return this.repository.list(actor.id) }
  async write(actor: ReportActor, raw: unknown, photo?: AttachmentUpload) {
    requireSatpam(actor)
    const input = parseSatpamDraftWrite(raw)
    if (photo) {
      validateUploads([photo], 0)
      if (!["image/jpeg", "image/png"].includes(photo.mimeType)) throw new ReportError("Lampiran harus berupa foto JPG atau PNG.")
    }
    const [staged] = photo ? await this.storage.store([photo]) : []
    try {
      const result = await this.repository.write(actor, input, staged)
      await this.storage.remove(result.reused && staged ? [staged] : result.removed)
      return result.clearedDraftId ? { clearedDraftId: result.clearedDraftId } : { draft: result.draft }
    } catch (error) { if (staged) await this.storage.remove([staged]); throw error }
  }
  async photo(actor: ReportActor, draftId: string, photoId: string) {
    requireSatpam(actor)
    if (!isUuid(draftId) || !isUuid(photoId)) throw new ReportError("Foto draft tidak ditemukan.", 404)
    const file = await this.repository.photo(actor.id, draftId, photoId)
    if (!file) throw new ReportError("Foto draft tidak ditemukan.", 404)
    return { file, bytes: await this.storage.read(file) }
  }
}
