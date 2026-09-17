"use client"

import { useMemo, useState } from "react"
import { ClipboardList, FileText, MapPin, MessageSquareText } from "lucide-react"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagementReportDetailDialog, ManagementStatusBadge, createManagementInitialActivity, type ManagementReportActivity } from "@/features/management/components/management-report-detail-dialog"
import { managementReports, type ManagementReport, type ManagementReportCategory, type ManagementReportStatus } from "@/features/management/mock/manajemen-dashboard"

const statuses: Array<ManagementReportStatus | "Semua"> = ["Semua", "Baru", "Sedang Diproses", "Selesai"]
type ManagementReportCategoryFilter = "Semua" | ManagementReportCategory

const categoryTabs: Array<{ value: ManagementReportCategoryFilter; label: string }> = [
  { value: "Semua", label: "Semua" },
  { value: "Layanan", label: "Laporan Layanan" },
  { value: "Lainnya", label: "Laporan Lainnya" },
]

function normalizeCategory(value: unknown): ManagementReportCategoryFilter {
  return value === "Layanan" || value === "Lainnya" || value === "Semua" ? value : "Semua"
}

export function ManagementReportWorkspace({ initialCategory }: { initialCategory?: ManagementReportCategoryFilter }) {
  const { notify } = useActivityNotifications()
  const [reports, setReports] = useState<ManagementReport[]>(() => managementReports.map((report) => ({ ...report })))
  const [activeCategory, setActiveCategory] = useState<ManagementReportCategoryFilter>(() => normalizeCategory(initialCategory))
  const [activeStatus, setActiveStatus] = useState<ManagementReportStatus | "Semua">("Semua")
  const [activities, setActivities] = useState<Record<string, ManagementReportActivity[]>>(() => Object.fromEntries(managementReports.map((report) => [report.ticket, createManagementInitialActivity(report)])))
  const categoryCounts = useMemo(() => Object.fromEntries(categoryTabs.map(({ value }) => [value, value === "Semua" ? reports.length : reports.filter((report) => report.category === value).length])), [reports])
  const visibleReports = reports.filter((report) => (activeCategory === "Semua" || report.category === activeCategory) && (activeStatus === "Semua" || report.status === activeStatus))

  function updateStatus(ticket: string, status: ManagementReportStatus, note: string) {
    const report = reports.find((item) => item.ticket === ticket)
    setReports((current) => current.map((item) => item.ticket === ticket ? { ...item, status, updatedAt: "Baru saja" } : item))
    setActivities((current) => ({ ...current, [ticket]: [...(current[ticket] ?? []), { status, actor: "Dewi Lestari", timestamp: "Baru saja", note }] }))
    notify({ title: "Status laporan diperbarui", description: `${report?.ticket ?? ticket} kini berstatus ${status}.`, tone: "success" })
  }

  const emptyLabel = activeStatus === "Semua" ? "pada kategori ini" : activeStatus.toLowerCase()

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><MessageSquareText className="size-4 text-primary" aria-hidden="true" /><span>Kelola laporan</span></div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardContent className="p-4 md:p-5">
          <Tabs value={activeCategory} onValueChange={(value) => setActiveCategory(value as ManagementReportCategoryFilter)} className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-full overflow-x-auto pb-1">
                <TabsList aria-label="Filter kategori laporan" className="w-max max-w-none">
                  {categoryTabs.map(({ value, label }) => <TabsTrigger key={value} value={value}>{label}<span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{categoryCounts[value]}</span></TabsTrigger>)}
                </TabsList>
              </div>
              <div className="flex items-center gap-2 lg:shrink-0">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <Select value={activeStatus} onValueChange={(value) => setActiveStatus(value as ManagementReportStatus | "Semua")}>
                  <SelectTrigger className="h-9 min-w-44 bg-background" aria-label="Filter status laporan"><SelectValue /></SelectTrigger>
                  <SelectContent>{statuses.map((status) => <SelectItem key={status} value={status}>{status === "Semua" ? "Semua status" : status}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value={activeCategory}>
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
                {!visibleReports.length ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan {emptyLabel}</p><p className="mt-1 text-xs text-muted-foreground">Ubah filter untuk menampilkan laporan lain.</p></div> : null}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </div>
    </Card>
  )
}
