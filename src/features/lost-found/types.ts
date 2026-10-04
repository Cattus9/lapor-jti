import type { ReportStatus } from "../reports/domain/report"
import type { NotificationItem } from "../notifications/types"
import type { satpamReportPeriods, satpamReportSorts } from "./domain/satpam-list-filters"

export type SatpamReportKind = "kehilangan" | "temuan"
export type SatpamReportStatus = "Baru" | "Diverifikasi" | "Diproses" | "Barang teridentifikasi" | "Diserahkan" | "Selesai" | "Ditolak"
export type SatpamLostFoundReport = {
  id: string; ticket: string; kind: SatpamReportKind; title: string; reporter: string; location: string
  eventDate: string; eventTime: string; submittedAt: string; updatedAt: string; status: SatpamReportStatus
  description: string; characteristics: string; attachments: number; photoUrl?: string
}
export type SecurityOfficer = { id: string; name: string }
export type SatpamPendingHandover = { id: string; lossTicket: string; foundTicket: string; title: string; reporter: string; matchedAt: string }
export type StatusHistoryItem = { status: SatpamReportStatus; actor: string; timestamp: string; note?: string }
export type SatpamDetail = { report: SatpamLostFoundReport; history: StatusHistoryItem[]; files: Array<{ id: string; name: string; url: string }> }
export type SatpamHandoverHistoryItem = {
  id: string; title: string; itemCategory: string; itemDescription: string; lostTicket: string; foundTicket: string
  lostPhotoUrl?: string; foundPhotoUrl?: string; recipient: string; handler: string; actor: string; location: string
  matchedAt: string; handedOverAt: string; handedOverAtIso: string; completedAt: string; handoverNote: string
  status: "Diserahkan" | "Selesai"
}
export type SatpamPage<T> = { items: T[]; nextCursor: string | null; total: number }
export type SatpamReportPeriod = keyof typeof satpamReportPeriods
export type SatpamReportSort = keyof typeof satpamReportSorts
export type SatpamListFilter = { kind: SatpamReportKind | "semua"; status: ReportStatus | "semua"; query: string; matching: boolean; period: SatpamReportPeriod; sort: SatpamReportSort; cursor?: string }
export type SatpamHistoryFilter = { query: string; officerId?: string; from?: string; to?: string; cursor?: string }
export type SatpamWorkspaceData = {
  officers: SecurityOfficer[]; historyOfficers: SecurityOfficer[]; pending: SatpamPage<SatpamPendingHandover>
  counts: { lostReports: number; foundReports: number; newFindings: number; readyForHandover: number }
}
export type SatpamDashboardData = SatpamWorkspaceData["counts"] & { queue: SatpamLostFoundReport[]; updatedAt: string }
export type SatpamNotifications = { items: NotificationItem[]; unread: number; nextCursor: string | null }
