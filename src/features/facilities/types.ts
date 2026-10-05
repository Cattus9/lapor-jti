import type { ReportStatus } from "../reports/domain/report"
import type { NotificationItem } from "../notifications/types"
import type { reportPeriods } from "../reports/domain/report-list-filters"

export type TechnicianStatus = Extract<ReportStatus, "baru" | "diverifikasi" | "diproses" | "selesai" | "ditolak">
export type TechnicianReportStatus = "Baru" | "Diverifikasi" | "Diproses" | "Selesai" | "Ditolak"
export type TechnicianFacilityReport = {
  id: string; ticket: string; title: string; facility: string; facilities: string[]; locationId: string | null
  room: string; location: string; reporter: string; submittedAt: string; updatedAt: string
  eventDate: string; eventTime: string; completedAt?: string; status: TechnicianReportStatus
  description: string; attachments: number; completionNote?: string
}
export type TechnicianRoomPriority = {
  id: string; room: string; location: string; activeReports: number; totalReports: number
  facilities: Array<{ facility: string; activeReports: number }>
}
export type TechnicianFilter = {
  query: string; status: TechnicianStatus | "semua"; period: keyof typeof reportPeriods
  from: string; to: string; sort: "terbaru" | "terlama"; locationId?: string; activeOnly: boolean; classifiedOnly: boolean; cursor?: string
}
export type TechnicianPage<T> = { items: T[]; total: number; nextCursor: string | null }
export type TechnicianDetail = {
  report: TechnicianFacilityReport
  history: Array<{ status: TechnicianReportStatus; actor: string; timestamp: string; note: string }>
  files: Array<{ id: string; name: string; mimeType: string; url: string; previewUrl?: string }>
}
export type TechnicianDashboardData = {
  newReports: number; inProgress: number; completedToday: number; affectedRooms: number; priorityRoom: string
  verifiedReports: number; processingReports: number; unclassifiedReports: number
  priorities: TechnicianRoomPriority[]; queue: TechnicianFacilityReport[]; updatedAt: string
}
export type TechnicianNotifications = { items: NotificationItem[]; unread: number; nextCursor: string | null }
