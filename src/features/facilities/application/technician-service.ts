// [AUTH-ROLE] Every operation requires a server-validated application identity, independent of SSO.
import { isUuid, ReportError, type ReportActor } from "../../reports/domain/report"
import type { AttachmentStorage } from "../../reports/application/ports"
import { parseTechnicianCommand, parseTechnicianFilter, requireNotificationId, requireTechnician, requireTechnicianTicket } from "../domain/technician"
import type { TechnicianRepository } from "./ports"

export class TechnicianService {
  constructor(private readonly repository: TechnicianRepository, private readonly storage: AttachmentStorage) {}
  list(actor: ReportActor, raw: Record<string, unknown>) { requireTechnician(actor); return this.repository.list(parseTechnicianFilter({ ...raw, active: "1" })) }
  history(actor: ReportActor, raw: Record<string, unknown>) { requireTechnician(actor); return this.repository.list(parseTechnicianFilter({ ...raw, status: raw.status === "ditolak" ? "ditolak" : "selesai", active: "0" }), true) }
  priorities(actor: ReportActor, raw: Record<string, unknown> = {}) { requireTechnician(actor); return this.repository.priorities(parseTechnicianFilter(raw).status) }
  dashboard(actor: ReportActor) { requireTechnician(actor); return this.repository.dashboard() }
  async detail(actor: ReportActor, ticket: string) {
    requireTechnician(actor)
    const detail = await this.repository.detail(requireTechnicianTicket(ticket))
    if (!detail) throw new ReportError("Laporan fasilitas tidak ditemukan.", 404)
    return detail
  }
  async execute(actor: ReportActor, raw: unknown) { requireTechnician(actor); await this.repository.execute(actor, parseTechnicianCommand(raw)); return { ok: true } }
  async download(actor: ReportActor, id: string) {
    requireTechnician(actor)
    if (!isUuid(id)) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const file = await this.repository.attachment(id)
    if (!file) throw new ReportError("Lampiran tidak ditemukan.", 404)
    return { file, bytes: await this.storage.read(file) }
  }
  notifications(actor: ReportActor, cursor?: string) { requireTechnician(actor); return this.repository.notifications(actor.id, cursor) }
  markRead(actor: ReportActor, id?: string) { requireTechnician(actor); requireNotificationId(id); return this.repository.markRead(actor.id, id) }
}
