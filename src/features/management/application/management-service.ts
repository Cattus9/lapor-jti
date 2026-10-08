import { isUuid, ReportError, type ReportActor } from "../../reports/domain/report"
import type { AttachmentStorage } from "../../reports/application/ports"
import { parseManagementCommand, parseManagementFilter, requireManagement, requireManagementNotificationId, requireManagementTicket } from "../domain/management"
import { managementCsv } from "../domain/management-csv"
import type { ManagementRepository } from "./ports"

export class ManagementService {
  constructor(private readonly repository: ManagementRepository, private readonly storage: AttachmentStorage) {}
  list(actor: ReportActor, raw: Record<string, unknown>, operational = true) { requireManagement(actor); return this.repository.list(parseManagementFilter(raw, operational), operational) }
  dashboard(actor: ReportActor) { requireManagement(actor); return this.repository.dashboard() }
  statistics(actor: ReportActor, raw: Record<string, unknown>) {
    requireManagement(actor)
    const filter = parseManagementFilter(raw)
    if (filter.dateBasis !== "submitted") throw new ReportError("Ringkasan statistik mengikuti tanggal laporan dikirim.")
    if (filter.period === "rentang" && (Date.parse(filter.to) - Date.parse(filter.from)) / 86400000 > 3660) throw new ReportError("Rentang statistik maksimal 10 tahun. Persempit periode.")
    return this.repository.statistics(filter)
  }
  async export(actor: ReportActor, raw: Record<string, unknown>) { requireManagement(actor); return managementCsv(await this.repository.export(parseManagementFilter(raw, true))) }
  async detail(actor: ReportActor, ticket: string, operational = true) {
    requireManagement(actor)
    const result = await this.repository.detail(requireManagementTicket(ticket), operational)
    if (!result) throw new ReportError("Laporan tidak ditemukan.", 404)
    return result
  }
  async execute(actor: ReportActor, raw: unknown) { requireManagement(actor); await this.repository.execute(actor, parseManagementCommand(raw)); return { ok: true } }
  async download(actor: ReportActor, id: string) {
    requireManagement(actor)
    if (!isUuid(id)) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const file = await this.repository.attachment(id)
    if (!file) throw new ReportError("Lampiran tidak ditemukan.", 404)
    return { file, bytes: await this.storage.read(file) }
  }
  notifications(actor: ReportActor, cursor?: string) { requireManagement(actor); return this.repository.notifications(actor.id, cursor) }
  markRead(actor: ReportActor, id?: string) { requireManagement(actor); requireManagementNotificationId(id); return this.repository.markRead(actor.id, id) }
}
