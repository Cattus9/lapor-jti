"use client"

import { useMemo, useState } from "react"
import { ClipboardList, FileText, MapPin, MessageSquareText } from "lucide-react"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagementReportDetailDialog, ManagementStatusBadge, createManagementInitialActivity, type ManagementReportActivity } from "@/features/management/components/management-report-detail-dialog"
import { managementReports, type ManagementReport, type ManagementReportCategory, type ManagementReportStatus } from "@/features/management/mock/manajemen-dashboard"

const statuses: Array<ManagementReportStatus | "Semua"> = ["Semua", "Baru", "Sedang Diproses", "Selesai"]

const workspaceMeta: Record<ManagementReportCategory, { title: string; description: string; label: string }> = {
  Layanan: { title: "Laporan Layanan", description: "Kelola laporan layanan internal JTI dan sampaikan pembaruan kepada pelapor.", label: "Manajemen laporan layanan" },
  Lainnya: { title: "Laporan Lainnya", description: "Tindak lanjuti laporan umum yang memerlukan koordinasi Manajemen Jurusan.", label: "Manajemen laporan lainnya" },
}

export function ManagementReportWorkspace({ category }: { category: ManagementReportCategory }) {
  const { notify } = useActivityNotifications()
  const meta = workspaceMeta[category]
  const [reports, setReports] = useState<ManagementReport[]>(() => managementReports.filter((report) => report.category === category).map((report) => ({ ...report })))
  const [activeStatus, setActiveStatus] = useState<ManagementReportStatus | "Semua">("Semua")
  const [activities, setActivities] = useState<Record<string, ManagementReportActivity[]>>(() => Object.fromEntries(reports.map((report) => [report.ticket, createManagementInitialActivity(report)])))
  const counts = useMemo(() => Object.fromEntries(statuses.map((status) => [status, status === "Semua" ? reports.length : reports.filter((report) => report.status === status).length])), [reports])
  const visibleReports = activeStatus === "Semua" ? reports : reports.filter((report) => report.status === activeStatus)

  function updateStatus(ticket: string, status: ManagementReportStatus, note: string) {
    const report = reports.find((item) => item.ticket === ticket)
    setReports((current) => current.map((item) => item.ticket === ticket ? { ...item, status, updatedAt: "Baru saja" } : item))
    setActivities((current) => ({ ...current, [ticket]: [...(current[ticket] ?? []), { status, actor: "Dewi Lestari", timestamp: "Baru saja", note }] }))
    notify({ title: "Status laporan diperbarui", description: `${report?.ticket ?? ticket} kini berstatus ${status}.`, tone: "success" })
  }

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><MessageSquareText className="size-4 text-primary" aria-hidden="true" />{meta.label}</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardContent className="p-4 md:p-5">
          <Tabs value={activeStatus} onValueChange={(value) => setActiveStatus(value as ManagementReportStatus | "Semua")}>
            <TabsList aria-label={`Filter status ${meta.title.toLowerCase()}`}>
              {statuses.map((status) => <TabsTrigger key={status} value={status}>{status}<span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{counts[status]}</span></TabsTrigger>)}
            </TabsList>
            <TabsContent value={activeStatus}>
              <div className="space-y-2">
                {visibleReports.map((report) => (
                  <article key={report.ticket} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"><FileText className="size-4" aria-hidden="true" /></span>
                      <div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{report.title}</p><p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{report.ticket} · {report.service} · {report.location}</span></p></div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><span className="text-xs text-muted-foreground">{report.updatedAt}</span><ManagementStatusBadge status={report.status} /><ManagementReportDetailDialog report={report} activity={activities[report.ticket] ?? []} onStatusChange={updateStatus} /></div>
                  </article>
                ))}
                {!visibleReports.length ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan {activeStatus.toLowerCase()}</p><p className="mt-1 text-xs text-muted-foreground">Laporan pada status ini akan muncul saat tersedia.</p></div> : null}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </div>
    </Card>
  )
}
