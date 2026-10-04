import type { ReportActor, StoredAttachment } from "../../reports/domain/report"
import type { SatpamCommand } from "../domain/satpam"
import type { SatpamDashboardData, SatpamDetail, SatpamHandoverHistoryItem, SatpamHistoryFilter, SatpamListFilter, SatpamNotifications, SatpamPage, SatpamLostFoundReport, SatpamWorkspaceData } from "../types"

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
}
