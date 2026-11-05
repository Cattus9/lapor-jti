import type { ReportActor, StoredAttachment } from "../../reports/domain/report"
import type { SatpamCommand } from "../domain/satpam"
import type { InventoryFilter, InventoryItem } from "../domain/inventory"
import type { LossReport } from "../domain/loss-report"
import type { FoundReport } from "../domain/found-report"
import type { SatpamDraftView, parseSatpamDraftWrite } from "../domain/satpam-draft"
import type { SatpamDashboardData, SatpamDetail, SatpamHandoverHistoryItem, SatpamHistoryFilter, SatpamListFilter, SatpamNotifications, SatpamPage, SatpamLostFoundReport, SatpamWorkspaceData } from "../types"

export interface SatpamDraftRepository {
  list(ownerId: string): Promise<SatpamDraftView[]>
  photo(ownerId: string, draftId: string, photoId: string): Promise<StoredAttachment | null>
  write(actor: ReportActor, input: ReturnType<typeof parseSatpamDraftWrite>, staged?: StoredAttachment): Promise<{ draft?: SatpamDraftView; clearedDraftId?: string; removed: StoredAttachment[]; reused?: boolean }>
}

export interface SatpamRepository {
  workspace(): Promise<SatpamWorkspaceData>
  pending(cursor?: string): Promise<SatpamPage<import("../types").SatpamPendingHandover>>
  list(filter: SatpamListFilter): Promise<SatpamPage<SatpamLostFoundReport>>
  detail(ticket: string): Promise<SatpamDetail | null>
  execute(actor: ReportActor, command: SatpamCommand): Promise<void>
  dashboard(): Promise<SatpamDashboardData>
  history(filter: SatpamHistoryFilter): Promise<SatpamPage<SatpamHandoverHistoryItem>>
  attachment(id: string): Promise<StoredAttachment | null>
  notifications(actorId: string, cursor?: string): Promise<SatpamNotifications>
  markRead(actorId: string, id?: string): Promise<void>
  listInventory(filter: InventoryFilter): Promise<SatpamPage<InventoryItem>>
  createInventory(actor: ReportActor, raw: unknown, storedPhoto?: { storageKey: string; mimeType: string; name: string; digest?: string }): Promise<InventoryItem>
  handoverInventory(actor: ReportActor, raw: unknown): Promise<InventoryItem>
  getInventoryPhoto(id: string): Promise<{ mimeType: string; storageKey: string; name: string } | null>
  correctInventory(actor: ReportActor, id: string, raw: unknown): Promise<InventoryItem>
  getInventoryItem(id: string): Promise<InventoryItem | null>
  listLossReports(): Promise<{ items: LossReport[]; total: number }>
  createLossReport(actor: ReportActor, raw: unknown, storedPhoto?: { storageKey: string; mimeType: string; name: string }): Promise<LossReport>
  getLossReportPhoto(id: string): Promise<{ mimeType: string; storageKey: string; name: string } | null>
  createFoundReport(actor: ReportActor, raw: unknown, storedPhoto?: { storageKey: string; mimeType: string; name: string }): Promise<FoundReport>
}

