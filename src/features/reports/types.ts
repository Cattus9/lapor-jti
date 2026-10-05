import type { ReportCategory, ReportStatus } from "./domain/report"
export type { ReportCategory, ReportStatus } from "./domain/report"

export type ReportAttachment = {
  name: string
  type: "image" | "document"
  previewUrl?: string
  id?: string
  downloadUrl?: string
}

export type ReportDetail = {
  incidentDate: string
  incidentTime: string
  location: string
  description: string
  fields: Array<{ label: string; value: string }>
  attachments: ReportAttachment[]
}

export type ReportSummary = {
  ticketNumber: string
  title: string
  category: ReportCategory
  status: ReportStatus
  updatedAt: string
  detail: ReportDetail
  history?: Array<{ status: ReportStatus; actor: string; note: string; createdAt: string }>
}

export type ReportListItem = Omit<ReportSummary, "detail"> & { id: string; submittedAt: string; submittedAtIso: string }
