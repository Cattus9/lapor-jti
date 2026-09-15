export type ReportCategory = "kehilangan-temuan" | "fasilitas" | "layanan" | "lainnya"
export type ReportStatus = "baru" | "diverifikasi" | "diproses" | "selesai"

export type ReportAttachment = {
  name: string
  type: "image" | "document"
  previewUrl?: string
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
}
