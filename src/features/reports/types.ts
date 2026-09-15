export type ReportCategory = "kehilangan-temuan" | "fasilitas" | "layanan" | "lainnya"
export type ReportStatus = "baru" | "diverifikasi" | "diproses" | "selesai"

export type ReportSummary = {
  ticketNumber: string
  title: string
  category: ReportCategory
  status: ReportStatus
  updatedAt: string
}
