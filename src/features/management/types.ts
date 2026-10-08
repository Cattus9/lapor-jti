import type { ReportCategory, ReportHandler, ReportStatus } from "../reports/domain/report"
import type { reportPeriods } from "../reports/domain/report-list-filters"
import type { NotificationItem } from "../notifications/types"

export type ManagementReportCategory = "Layanan" | "Lainnya"
export type MonitoringReportCategory = "Kehilangan & Temuan" | "Fasilitas" | ManagementReportCategory
export type MonitoringReportStatus = "Baru" | "Diverifikasi" | "Diproses" | "Barang teridentifikasi" | "Diserahkan" | "Selesai" | "Ditolak"
export type ManagementReportStatus = Extract<MonitoringReportStatus, "Baru" | "Diproses" | "Selesai" | "Ditolak">
export type MonitoringStatusFilter = MonitoringReportStatus | "semua" | "dalam-penanganan"
export type ManagementReport = {
  id: string; ticket: string; title: string; category: MonitoringReportCategory; categoryKey: ReportCategory
  status: MonitoringReportStatus; statusKey: ReportStatus; handler: "Satpam" | "Teknisi" | "Manajemen Jurusan"
  reporter: string; reporterUnit: string; program?: string; service: string; context: string; location: string
  submittedAt: string; submittedAtIso: string; updatedAt: string; reportedOn: string; completedOn?: string; completedAt?: string
  eventDate: string; eventTime: string; description: string; attachments: number
}
export type MonitoringReport = ManagementReport
export type ManagementFilter = {
  query: string; category: ReportCategory | "semua"; status: ReportStatus | "semua" | "dalam-penanganan" | "belum-selesai"
  dateBasis: "submitted" | "completed"
  period: keyof typeof reportPeriods; from: string; to: string; sort: "terbaru" | "terlama"; cursor?: string
}
export type ManagementPage = { items: ManagementReport[]; total: number; nextCursor: string | null; categoryCounts: Record<ReportCategory | "semua", number>; handlerCounts: Record<ReportHandler, number> }
export type ManagementDetail = {
  report: ManagementReport
  history: Array<{ status: MonitoringReportStatus; actor: string; timestamp: string; note: string }>
  files: Array<{ id: string; name: string; mimeType: string; url: string; previewUrl?: string }>
}
export type ManagementDashboard = {
  newReports: number; inProgress: number; completedThisMonth: number; activeServiceReports: number
  queue: ManagementReport[]; updatedAt: string
}
export type ManagementStatisticsData = {
  total: number; newReports: number; inProgress: number; completed: number; rejected: number
  from: string; to: string; granularity: "day" | "month" | "year"
  categories: Array<{ category: ReportCategory; total: number }>
  handlers: Array<{ handler: ReportHandler; total: number; active: number }>
  trend: Array<{ date: string; incoming: number; completed: number }>
  rooms: Array<{ id: string; room: string; location: string; totalReports: number; activeReports: number; completedReports: number; facilities: Array<{ facility: string; totalReports: number; activeReports: number }> }>
  unclassifiedActive: number
}
export type ManagementNotifications = { items: NotificationItem[]; unread: number; nextCursor: string | null }
