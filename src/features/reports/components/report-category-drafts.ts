import type { DraftView, PublicAttachment } from "../application/ports"
import { emptyReportPayload, type ReportCategory, type ReportPayload } from "../domain/report"
import { hasReportDraftContent } from "../domain/report-draft-content"

export type CategoryDraft = {
  id: string; revision: number; payload: ReportPayload; retained: PublicAttachment[]; files: File[]
  status: "idle" | "saving" | "saved" | "error"; error: string; notice: number; savedKey?: string
}
type Writer = (draft: CategoryDraft) => Promise<DraftView | { clearedDraftId: string }>
const key = (draft: Pick<CategoryDraft, "payload" | "retained" | "files">) => JSON.stringify([
  draft.payload, draft.retained.map((file) => file.id), draft.files.map((file) => [file.name, file.size, file.type, file.lastModified]),
])

export function hasDraftContent(draft: Pick<CategoryDraft, "payload" | "retained" | "files">) {
  return hasReportDraftContent(draft.payload, draft.retained.length + draft.files.length)
}

// One independent draft/request per category. No browser storage or cross-account cache.
export class ReportCategoryDrafts {
  private drafts = new Map<ReportCategory, CategoryDraft>()
  private requests = new Map<ReportCategory, Promise<CategoryDraft>>()
  private notices = new Map<ReportCategory, number>()
  private listeners = new Set<() => void>()
  private version = 0
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getVersion = () => this.version
  private changed() { this.version++; this.listeners.forEach((listener) => listener()) }
  constructor(saved: DraftView[], initial?: DraftView) {
    for (const draft of [...saved, ...(initial ? [initial] : [])]) {
      const session: CategoryDraft = { id: draft.id, revision: draft.revision, payload: draft.payload, retained: draft.attachments, files: [], status: "saved", error: "", notice: 0 }
      if (!hasDraftContent(session)) session.status = "idle"
      session.savedKey = key(session)
      this.drafts.set(draft.payload.category, session)
    }
  }
  get(category: ReportCategory) { return this.drafts.get(category) }
  ensure(category: ReportCategory) {
    let draft = this.get(category)
    if (!draft) {
      draft = { id: crypto.randomUUID(), revision: 0, payload: { ...emptyReportPayload, category, incidentTimeMode: "automatic" }, retained: [], files: [], status: "idle", error: "", notice: 0 }
      this.drafts.set(category, draft)
    }
    return draft
  }
  capture(category: ReportCategory, payload: ReportPayload, retained: PublicAttachment[], files: File[]) {
    const previous = this.ensure(category)
    if (previous.status === "saving") return previous
    const draft = { ...previous, payload: { ...payload, facilities: [...payload.facilities] }, retained: [...retained], files: [...files] }
    this.drafts.set(category, draft)
    return draft
  }
  save(category: ReportCategory, writer: Writer): Promise<CategoryDraft> {
    const running = this.requests.get(category)
    if (running) return running
    const draft = this.ensure(category)
    const hasContent = hasDraftContent(draft)
    if ((!draft.savedKey && !hasContent) || (hasContent && draft.savedKey === key(draft))) return Promise.resolve(draft)
    const saving = { ...draft, status: "saving" as const, error: "" }
    this.drafts.set(category, saving)
    this.changed()
    const request = Promise.resolve().then(() => writer(saving)).then((saved) => {
      if ("clearedDraftId" in saved) {
        if (saved.clearedDraftId !== draft.id || hasContent) throw new Error("Konfirmasi pengosongan draft tidak valid. Coba kembali.")
        this.drafts.delete(category)
        return this.ensure(category)
      }
      if (!hasContent || saved.id !== draft.id || saved.payload.category !== category || !Number.isSafeInteger(saved.revision) || saved.revision <= draft.revision || !hasReportDraftContent(saved.payload, saved.attachments.length)) throw new Error("Konfirmasi draft tidak valid. Isian tetap tersedia.")
      const notice = (this.notices.get(category) ?? 0) + 1
      this.notices.set(category, notice)
      const result: CategoryDraft = { ...draft, revision: saved.revision, retained: saved.attachments, files: [], status: "saved", error: "", notice }
      result.savedKey = key(result)
      this.drafts.set(category, result)
      return result
    }).catch((error: unknown) => {
      const failed: CategoryDraft = { ...draft, status: "error", error: error instanceof Error ? error.message : "Koneksi bermasalah. Coba simpan kembali." }
      this.drafts.set(category, failed)
      return failed
    }).finally(() => { this.requests.delete(category); this.changed() })
    this.requests.set(category, request)
    return request
  }
  remove(category: ReportCategory) { this.drafts.delete(category); this.changed() }
}
