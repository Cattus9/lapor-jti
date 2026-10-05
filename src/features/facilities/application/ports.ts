// [AUTH-ROLE] ReportActor comes from the server session, never from form fields or provider role claims.
import type { ReportActor, StoredAttachment } from "../../reports/domain/report"
import type { TechnicianCommand } from "../domain/technician"
import type { TechnicianDashboardData, TechnicianDetail, TechnicianFacilityReport, TechnicianFilter, TechnicianNotifications, TechnicianPage, TechnicianRoomPriority } from "../types"

export interface TechnicianRepository {
  list(filter: TechnicianFilter, history?: boolean): Promise<TechnicianPage<TechnicianFacilityReport>>
  detail(ticket: string): Promise<TechnicianDetail | null>
  priorities(status?: TechnicianFilter["status"]): Promise<TechnicianRoomPriority[]>
  dashboard(): Promise<TechnicianDashboardData>
  execute(actor: ReportActor, command: TechnicianCommand): Promise<void>
  attachment(id: string): Promise<StoredAttachment | null>
  notifications(actorId: string, cursor?: string): Promise<TechnicianNotifications>
  markRead(actorId: string, id?: string): Promise<void>
}
