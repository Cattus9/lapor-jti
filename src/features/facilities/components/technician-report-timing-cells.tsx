import { CheckCheck, Clock3, Wrench } from "lucide-react"
import type { TechnicianReportTiming } from "../domain/technician-report-timing"
import type { TechnicianFacilityReport } from "../types"

const startFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })

export function formatTechnicianDuration(seconds: number | null | undefined): string | null {
  if (seconds == null || !Number.isFinite(seconds) || seconds < 0) return null
  const minutes = Math.floor(seconds / 60)
  if (minutes < 1) return "kurang dari 1 menit"
  if (minutes < 60) return `${minutes} menit`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} jam${minutes % 60 ? ` ${minutes % 60} menit` : ""}`
  const days = Math.floor(hours / 24)
  return `${days} hari${hours % 24 ? ` ${hours % 24} jam` : ""}`
}

export function TechnicianReportTimingCells({ report, timing }: { report: TechnicianFacilityReport; timing?: TechnicianReportTiming }) {
  const waiting = report.status === "Baru" || report.status === "Diverifikasi" ? formatTechnicianDuration(timing?.waitingSeconds) : null
  const processing = report.status === "Diproses"
  const elapsed = processing ? formatTechnicianDuration(timing?.processingSeconds) : null
  const started = timing?.processingStartedAt ? new Date(timing.processingStartedAt) : null
  const startLabel = started && Number.isFinite(started.getTime()) ? `${startFormatter.format(started)} WIB` : "Belum tercatat"
  const Icon = processing ? Wrench : CheckCheck

  // Keep the canonical detail table's two final cells, with compact contextual text.
  return <>
    <div className="border-b border-border/60 p-4 sm:border-r sm:border-b-0">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Dikirim</dt>
      <dd className="mt-1.5 break-words text-sm font-medium">
        {report.submittedAt}
        {waiting ? <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground" title="Durasi dihitung saat detail dimuat.">Menunggu {waiting}</span> : null}
      </dd>
    </div>
    <div className="p-4">
      <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{processing ? "Diproses sejak" : "Selesai"}</dt>
      <dd className="mt-1.5 break-words text-sm font-medium">
        {processing ? startLabel : report.completedAt ?? "Belum selesai"}
        {elapsed && started && Number.isFinite(started.getTime()) ? <span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground" title="Durasi dihitung saat detail dimuat.">Berjalan {elapsed}</span> : null}
      </dd>
    </div>
  </>
}
