import { requireReporter, ReportError, type ReportActor } from "@/features/reports/domain/report"
import { parseFoundNoticeCursor, parseFoundNoticeRef, type FoundNotice, type FoundNoticePage, type FoundNoticeRef } from "../domain/found-notice"

export type FoundNoticeQuery = { cursor?: string; activeOnly?: boolean; limit?: number }
export interface FoundNoticeRepository {
  list(userId: string, query: FoundNoticeQuery): Promise<FoundNoticePage>
  detail(userId: string, ref: FoundNoticeRef): Promise<FoundNotice | null>
  markRead(userId: string, ref: FoundNoticeRef): Promise<boolean>
}

export class FoundNoticeService {
  constructor(private readonly repository: FoundNoticeRepository) {}
  list(actor: ReportActor, query: FoundNoticeQuery = {}) {
    requireReporter(actor)
    parseFoundNoticeCursor(query.cursor)
    if (query.limit !== undefined && (!Number.isInteger(query.limit) || query.limit < 1 || query.limit > 20)) throw new ReportError("Batas informasi temuan tidak valid.")
    return this.repository.list(actor.id, query)
  }
  async detail(actor: ReportActor, raw: unknown) {
    requireReporter(actor)
    const notice = await this.repository.detail(actor.id, parseFoundNoticeRef(raw))
    if (!notice) throw new ReportError("Informasi temuan tidak tersedia.", 404)
    return notice
  }
  async markRead(actor: ReportActor, raw: unknown) {
    requireReporter(actor)
    if (!await this.repository.markRead(actor.id, parseFoundNoticeRef(raw))) throw new ReportError("Informasi temuan tidak tersedia.", 404)
    return { ok: true }
  }
}
