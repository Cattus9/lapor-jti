import type { AttachmentUpload, ReportActor, ReportPayload, StoredAttachment } from "../domain/report"
import type { ReportListItem, ReportSummary } from "../types"
import type { NotificationItem } from "../../notifications/types"
import type { ReportListFilters } from "../domain/report-list-filters"

export type PublicAttachment = Pick<StoredAttachment, "id" | "name" | "mimeType" | "size">
export type DraftView = { id: string; revision: number; payload: ReportPayload; attachments: PublicAttachment[]; updatedAt: string }
export type ReportWrite = { id: string; revision: number; payload: ReportPayload; retainedAttachmentIds: string[] }
export type ReportPage = { items: ReportListItem[]; selected?: ReportListItem; nextCursor: string | null; nextDraftCursor: string | null; drafts: Pick<DraftView, "id" | "updatedAt" | "payload">[] }
export type DashboardData = { total: number; active: number; completed: number; recent: ReportListItem[] }
export interface ReportRepository {
  write(actor: ReportActor, input: ReportWrite, attachments: StoredAttachment[], submit: boolean): Promise<{ created: boolean; draft?: DraftView; report?: { id: string; ticketNumber: string }; removed: StoredAttachment[] }>
  list(ownerId: string, cursor?: string, ticket?: string, draftCursor?: string, filters?: ReportListFilters): Promise<ReportPage>
  detail(ownerId: string, id: string): Promise<ReportSummary | null>
  draft(ownerId: string, id: string): Promise<DraftView | null>
  dashboard(ownerId: string): Promise<DashboardData>
  attachment(ownerId: string, id: string): Promise<StoredAttachment | null>
  notifications(ownerId: string, cursor?: string): Promise<{ items: NotificationItem[]; unread: number; nextCursor: string | null }>
  markRead(ownerId: string, id?: string): Promise<void>
}
export interface AttachmentStorage {
  store(files: AttachmentUpload[]): Promise<StoredAttachment[]>
  remove(files: StoredAttachment[]): Promise<void>
  read(file: StoredAttachment): Promise<Uint8Array>
}
