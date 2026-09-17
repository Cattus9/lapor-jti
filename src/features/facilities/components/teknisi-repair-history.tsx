import { CheckCheck, ClipboardList, MapPin, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { ReportDetailDialog, type ReportActivity } from "@/features/facilities/components/teknisi-facility-report-list"
import { technicianFacilityReports, technicianRepairHistory, type TechnicianFacilityReport } from "@/features/facilities/mock/teknisi-dashboard"

function historyActivity(report: TechnicianFacilityReport, completedAt: string, note: string): ReportActivity[] {
  return [
    { status: "Baru", actor: "Pelapor", timestamp: report.submittedAt, note: "Laporan fasilitas dibuat." },
    { status: "Diverifikasi", actor: "Rizky Pratama", timestamp: "16 September 2026, 14.00", note: "Detail laporan telah diverifikasi." },
    { status: "Diproses", actor: "Rizky Pratama", timestamp: "16 September 2026, 14.25", note: "Perbaikan fasilitas dimulai." },
    { status: "Selesai", actor: "Rizky Pratama", timestamp: completedAt, note },
  ]
}

export function TeknisiRepairHistory() {
  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
        <ClipboardList className="size-4 text-primary" aria-hidden="true" />
        <span>Arsip perbaikan</span>
      </div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardContent className="space-y-2 p-4 md:p-5">
          {technicianRepairHistory.map((item) => {
            const report = technicianFacilityReports.find((candidate) => candidate.ticket === item.ticket)

            if (!report) return null

            return <article key={item.ticket} className="rounded-xl border border-border/60 bg-background/40 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                    <Wrench className="size-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3" aria-hidden="true" />{item.ticket} · {item.facility} · {item.location}</p>
                  </div>
                </div>
                <Badge className="w-fit border-emerald-200 bg-emerald-50 text-emerald-700" variant="outline">Selesai</Badge>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{item.note}</p>
                  <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><CheckCheck className="size-3.5 text-emerald-600" aria-hidden="true" />Selesai pada {item.completedAt}</p>
                </div>
                <ReportDetailDialog report={report} activity={historyActivity(report, item.completedAt, item.note)} />
              </div>
            </article>
          })}
        </CardContent>
      </div>
    </Card>
  )
}
