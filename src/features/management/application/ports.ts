import type { ReportActor, StoredAttachment } from "../../reports/domain/report"
import type { ManagementCommand } from "../domain/management"
import type { ManagementDashboard, ManagementDetail, ManagementFilter, ManagementNotifications, ManagementPage, ManagementReport, ManagementStatisticsData } from "../types"

export interface ManagementRepository {
  list(filter: ManagementFilter, operational: boolean): Promise<ManagementPage>
  detail(ticket: string, operational: boolean): Promise<ManagementDetail | null>
  dashboard(): Promise<ManagementDashboard>
  statistics(filter: ManagementFilter): Promise<ManagementStatisticsData>
  export(filter: ManagementFilter): Promise<ManagementReport[]>
  execute(actor: ReportActor, command: ManagementCommand): Promise<void>
  attachment(id: string): Promise<StoredAttachment | null>
  notifications(actorId: string, cursor?: string): Promise<ManagementNotifications>
  markRead(actorId: string, id?: string): Promise<void>
}
