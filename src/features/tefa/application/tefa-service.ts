import type { AttachmentStorage } from "../../reports/application/ports"
import { isUuid, ReportError, type ReportActor } from "../../reports/domain/report"
import { parseManagementCommand, requireManagementNotificationId, requireManagementTicket } from "../../management/domain/management"
import type { ManagementRepository } from "../../management/application/ports"
import type { TefaServiceSummary } from "../types"
import { parseTefaFilter, requireTefa } from "../domain/tefa"

type Repository = Pick<ManagementRepository, "list" | "dashboard" | "detail" | "execute" | "attachment" | "notifications" | "markRead"> & { services(): Promise<TefaServiceSummary[]> }
export class TefaService {
  constructor(private readonly repository: Repository, private readonly storage: AttachmentStorage) {}
  async dashboard(actor: ReportActor) { requireTefa(actor); const dashboard = await this.repository.dashboard(); const services = await this.repository.services(); return { ...dashboard, services } }
  async list(actor: ReportActor, raw: Record<string, unknown>) {
    requireTefa(actor)
    const filter = parseTefaFilter(raw)
    const page = await this.repository.list(filter, true), services = await this.repository.services()
    return { ...page, services }
  }
  async detail(actor: ReportActor, ticket: string) {
    requireTefa(actor)
    const result = await this.repository.detail(requireManagementTicket(ticket), true)
    if (!result) throw new ReportError("Laporan tidak ditemukan.", 404)
    return result
  }
  async execute(actor: ReportActor, raw: unknown) { requireTefa(actor); await this.repository.execute(actor, parseManagementCommand(raw)); return { ok: true } }
  async download(actor: ReportActor, id: string) {
    requireTefa(actor)
    if (!isUuid(id)) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const file = await this.repository.attachment(id)
    if (!file) throw new ReportError("Lampiran tidak ditemukan.", 404)
    return { file, bytes: await this.storage.read(file) }
  }
  notifications(actor: ReportActor, cursor?: string) { requireTefa(actor); return this.repository.notifications(actor.id, cursor) }
  markRead(actor: ReportActor, id?: string) { requireTefa(actor); requireManagementNotificationId(id); return this.repository.markRead(actor.id, id) }
}
