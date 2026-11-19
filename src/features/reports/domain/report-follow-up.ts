import type { ReportHandler, ReportStatus } from "./report"

const day = 86_400_000
const wib = 7 * 60 * 60 * 1000

export const followUpDays = { review: 3, update: 7, followUp: 14 } as const
export type ReportAttention = keyof typeof followUpDays
export const activeReportHandlers = ["satpam", "teknisi", "manajemen", "tefa"] as const

export function isReportHandler(role: string): role is ReportHandler {
  return activeReportHandlers.some((handler) => handler === role)
}

export function reportAttentionCutoffs(now: Date) {
  const nextMidnightWib = (Math.floor((now.getTime() + wib) / day) + 1) * day - wib
  return {
    review: new Date(nextMidnightWib - followUpDays.review * day),
    update: new Date(nextMidnightWib - followUpDays.update * day),
    followUp: new Date(nextMidnightWib - followUpDays.followUp * day),
  }
}

export function getReportAttention(report: {
  status: ReportStatus
  submittedAt: Date
  updatedAt: Date
  firstOpenedAt: Date | null
  firstOpenedTracking: boolean
}, cutoffs: ReturnType<typeof reportAttentionCutoffs>): ReportAttention | null {
  if (report.status === "selesai" || report.status === "ditolak") return null
  if (report.submittedAt < cutoffs.followUp) return "followUp"
  if (report.submittedAt < cutoffs.update && report.updatedAt < cutoffs.update) return "update"
  if (report.firstOpenedTracking && !report.firstOpenedAt && report.submittedAt < cutoffs.review) return "review"
  return null
}

export const progressMessages = {
  satpam: {
    searching: "Barang belum ditemukan. Satpam masih memeriksa informasi yang ada.",
    checking: "Satpam masih memeriksa informasi dan ciri barang.",
  },
  teknisi: {
    repairing: "Perbaikan fasilitas masih berlangsung.",
    arranging: "Teknisi sedang menyiapkan kebutuhan perbaikan fasilitas.",
  },
  manajemen: {
    reviewing: "Manajemen masih meninjau laporan ini.",
    coordinating: "Manajemen sedang berkoordinasi dengan pihak terkait.",
  },
  tefa: {
    reviewing: "TEFA masih meninjau laporan layanan ini.",
    coordinating: "TEFA sedang berkoordinasi dengan pihak terkait.",
  },
} satisfies Record<ReportHandler, Record<string, string>>
