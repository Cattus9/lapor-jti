import type { ReportStatus } from "../../reports/domain/report"

export type TechnicianReportTiming = {
  waitingSeconds: number | null
  processingStartedAt: string | null
  processingSeconds: number | null
}

// Durations are snapshots of server time, not incident dates, updatedAt, or SLA scores.
export function getTechnicianReportTiming(
  report: { status: ReportStatus; submittedAt: Date },
  processingStartedAt: Date | null,
  now = new Date(),
): TechnicianReportTiming {
  const empty: TechnicianReportTiming = { waitingSeconds: null, processingStartedAt: null, processingSeconds: null }
  const submitted = report.submittedAt.getTime()
  const current = now.getTime()
  if (!Number.isFinite(submitted) || !Number.isFinite(current) || submitted > current) return empty

  if (report.status === "baru" || report.status === "diverifikasi") {
    return { ...empty, waitingSeconds: Math.floor((current - submitted) / 1000) }
  }
  if (report.status !== "diproses" || !processingStartedAt) return empty
  const started = processingStartedAt.getTime()
  if (!Number.isFinite(started) || started < submitted || started > current) return empty
  return {
    waitingSeconds: null,
    processingStartedAt: processingStartedAt.toISOString(),
    processingSeconds: Math.floor((current - started) / 1000),
  }
}
