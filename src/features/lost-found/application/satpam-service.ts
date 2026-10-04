import { isUuid, ReportError, type ReportActor } from "../../reports/domain/report"
import type { AttachmentStorage } from "../../reports/application/ports"
import { parseHistoryFilter, parseSatpamCommand, parseSatpamFilter, requireSatpam, requireTicket } from "../domain/satpam"
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
}
