"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { ClipboardList, MapPin, RotateCcw, ScanSearch, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ManagementCategoryBadge, ManagementReportDetailDialog, ManagementStatusBadge, createManagementInitialActivity } from "@/features/management/components/management-report-detail-dialog"
import { managementReports, type ManagementReportCategory, type ManagementReportStatus } from "@/features/management/mock/manajemen-dashboard"

type Period = "semua" | "hari-ini" | "7-hari" | "30-hari"

const periods: Record<Period, { label: string; maxDays?: number }> = {
  semua: { label: "Semua periode" },
  "hari-ini": { label: "Hari ini", maxDays: 0 },
  "7-hari": { label: "7 hari terakhir", maxDays: 7 },
  "30-hari": { label: "30 hari terakhir", maxDays: 30 },
}

export function ManagementMonitoring() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketFromNotification = searchParams.get("ticket")?.trim() ?? ""
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ManagementReportCategory | "semua">("semua")
  const [status, setStatus] = useState<ManagementReportStatus | "semua">("semua")
  const [period, setPeriod] = useState<Period>("30-hari")
  const hasFilters = query || category !== "semua" || status !== "semua" || period !== "30-hari" || Boolean(ticketFromNotification)

  const reports = useMemo(() => {
    const normalizedQuery = (query.trim() || ticketFromNotification).toLocaleLowerCase()
    const maxDays = periods[period].maxDays

    return managementReports.filter((report) => {
      const matchesQuery = !normalizedQuery || `${report.ticket} ${report.title} ${report.reporter} ${report.service} ${report.location}`.toLocaleLowerCase().includes(normalizedQuery)
      const matchesCategory = category === "semua" || report.category === category
      const matchesStatus = status === "semua" || report.status === status
      const matchesPeriod = maxDays === undefined || report.daysAgo <= maxDays

      return matchesQuery && matchesCategory && matchesStatus && matchesPeriod
    })
  }, [category, period, query, status, ticketFromNotification])

  function resetFilters() {
    setQuery("")
    setCategory("semua")
    setStatus("semua")
    setPeriod("30-hari")
    if (ticketFromNotification) router.replace("/manajemen/monitoring")
  }

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ScanSearch className="size-4 text-primary" aria-hidden="true" />Pengawasan laporan</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-4 border-b border-border/60 p-5 md:p-6">
          <div><CardTitle className="text-base">Monitoring lintas kategori</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tinjau laporan JTI berdasarkan kategori, status, dan periode tanpa mengubah penanganan tiket.</p></div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,auto))_auto]">
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Cari tiket, pelapor, atau layanan" aria-label="Cari laporan" /></div>
            <Select value={category} onValueChange={(value) => setCategory(value as ManagementReportCategory | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter kategori"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua kategori</SelectItem><SelectItem value="Layanan">Layanan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem></SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value as ManagementReportStatus | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua status</SelectItem><SelectItem value="Baru">Baru</SelectItem><SelectItem value="Sedang Diproses">Sedang Diproses</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent></Select>
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter periode"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periods).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
            {hasFilters ? <Button type="button" variant="outline" size="sm" className="h-9 bg-card" onClick={resetFilters}><RotateCcw />Reset</Button> : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          {ticketFromNotification ? <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><ClipboardList className="size-3.5" aria-hidden="true" />Tiket dari notifikasi: {ticketFromNotification}</div> : null}
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{reports.length} laporan ditemukan</span><span>{periods[period].label}</span></div>
          {reports.length ? <div className="space-y-2">{reports.map((report) => <article key={report.ticket} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"><ClipboardList className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{report.title}</p><p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{report.ticket} · {report.reporter} · {report.location}</span></p></div></div><div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><ManagementCategoryBadge category={report.category} /><ManagementStatusBadge status={report.status} /><ManagementReportDetailDialog report={report} activity={createManagementInitialActivity(report)} defaultOpen={report.ticket === ticketFromNotification} /></div></article>)}</div> : <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ScanSearch className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan yang sesuai</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter untuk menampilkan laporan pada periode lain.</p>{hasFilters ? <Button type="button" variant="outline" size="sm" className="mt-4 bg-card" onClick={resetFilters}><RotateCcw />Reset filter</Button> : null}</div>}
        </CardContent>
      </div>
    </Card>
  )
}
