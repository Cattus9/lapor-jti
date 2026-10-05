import { isUuid, parsePayload, ReportError, requireReporter, validateUploads, type ReportActor, type AttachmentUpload } from "../domain/report"
import type { AttachmentStorage, ReportRepository } from "./ports"
import { parseReportListFilters } from "../domain/report-list-filters"

export class ReportService {
  constructor(private readonly repository: ReportRepository, private readonly storage: AttachmentStorage) {}
  async write(actor: ReportActor, raw: unknown, files: AttachmentUpload[], submit: boolean) {
    requireReporter(actor)
    if (!raw || typeof raw !== "object") throw new ReportError("Permintaan tidak valid.")
    const value = raw as Record<string, unknown>
    if (!isUuid(value.id) || !Number.isSafeInteger(value.revision) || Number(value.revision) < 0) throw new ReportError("Identitas atau versi draft tidak valid.")
    const ids = value.retainedAttachmentIds ?? []
    if (!Array.isArray(ids) || ids.length > 4 || ids.some((id) => !isUuid(id)) || new Set(ids).size !== ids.length) throw new ReportError("Daftar lampiran tidak valid.")
    const payload = parsePayload(value.payload, submit)
    validateUploads(files, ids.length)
    const attachments = await this.storage.store(files)
    let result: Awaited<ReturnType<ReportRepository["write"]>>
    try {
      result = await this.repository.write(actor, { id: value.id, revision: Number(value.revision), payload, retainedAttachmentIds: ids }, attachments, submit)
    } catch (error) {
      await this.storage.remove(attachments)
      throw error
    }
    // Idempotent retries reuse the committed report and discard newly staged files.
    await this.storage.remove(result.created ? result.removed : attachments)
    return result.report ? { report: result.report } : { draft: result.draft }
  }
  list(actor: ReportActor, cursor?: string, ticket?: string, draftCursor?: string, filters?: unknown) {
    requireReporter(actor)
    if (ticket && (ticket.length > 50 || !/^LJ-\d{4}-\d+$/.test(ticket))) throw new ReportError("Nomor tiket tidak valid.")
    return this.repository.list(actor.id, cursor, ticket, draftCursor, parseReportListFilters(filters))
  }
  dashboard(actor: ReportActor) { requireReporter(actor); return this.repository.dashboard(actor.id) }
  async detail(actor: ReportActor, id: string) {
    requireReporter(actor)
    if (!isUuid(id)) throw new ReportError("Laporan tidak ditemukan.", 404)
    const report = await this.repository.detail(actor.id, id)
    if (!report) throw new ReportError("Laporan tidak ditemukan.", 404)
    return report
  }
  async draft(actor: ReportActor, id: string) {
    requireReporter(actor)
    if (!isUuid(id)) throw new ReportError("Draft tidak ditemukan.", 404)
    const draft = await this.repository.draft(actor.id, id)
    if (!draft) throw new ReportError("Draft tidak ditemukan.", 404)
    return draft
  }
  async download(actor: ReportActor, id: string) {
    requireReporter(actor)
    if (!isUuid(id)) throw new ReportError("Lampiran tidak ditemukan.", 404)
    const file = await this.repository.attachment(actor.id, id)
    if (!file) throw new ReportError("Lampiran tidak ditemukan.", 404)
    return { file, bytes: await this.storage.read(file) }
  }
  notifications(actor: ReportActor, cursor?: string) { requireReporter(actor); return this.repository.notifications(actor.id, cursor) }
  markRead(actor: ReportActor, id?: string) {
    requireReporter(actor)
    if (id && !isUuid(id)) throw new ReportError("Notifikasi tidak valid.")
    return this.repository.markRead(actor.id, id)
  }
}
