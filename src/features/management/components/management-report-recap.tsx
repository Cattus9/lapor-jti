"use client"

import { useMemo, useState } from "react"
import { Download, FileSpreadsheet, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { ManagementCategoryBadge, ManagementStatusBadge } from "@/features/management/components/management-report-detail-dialog"
import { managementReports, type ManagementReportCategory, type ManagementReportStatus } from "@/features/management/mock/manajemen-dashboard"

type Period = "semua" | "7-hari" | "30-hari"

const periods: Record<Period, { label: string; maxDays?: number }> = {
  semua: { label: "Semua periode" },
  "7-hari": { label: "7 hari terakhir", maxDays: 7 },
  "30-hari": { label: "30 hari terakhir", maxDays: 30 },
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`
}

export function ManagementReportRecap() {
  const { notify } = useActivityNotifications()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ManagementReportCategory | "semua">("semua")
  const [status, setStatus] = useState<ManagementReportStatus | "semua">("semua")
  const [period, setPeriod] = useState<Period>("30-hari")
  const hasFilters = query || category !== "semua" || status !== "semua" || period !== "30-hari"

  const reports = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase()
    const maxDays = periods[period].maxDays

    return managementReports.filter((report) => {
      const matchesQuery = !normalizedQuery || `${report.ticket} ${report.title} ${report.reporter} ${report.service}`.toLocaleLowerCase().includes(normalizedQuery)
      return matchesQuery && (category === "semua" || report.category === category) && (status === "semua" || report.status === status) && (maxDays === undefined || report.daysAgo <= maxDays)
    })
  }, [category, period, query, status])

  function resetFilters() {
    setQuery("")
    setCategory("semua")
    setStatus("semua")
    setPeriod("30-hari")
  }

  function exportCsv() {
    const rows = [
      ["Nomor tiket", "Judul laporan", "Kategori", "Layanan atau konteks", "Pelapor", "Lokasi atau kanal", "Status", "Waktu laporan"],
      ...reports.map((report) => [report.ticket, report.title, report.category, report.service, report.reporter, report.location, report.status, report.submittedAt]),
    ]
    const contents = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\n")}`
    const blob = new Blob([contents], { type: "text/csv;charset=utf-8" })
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "rekap-laporan-manajemen.csv"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    notify({ title: "Rekap berhasil diekspor", description: `${reports.length} laporan telah disiapkan dalam format CSV.`, tone: "success" })
  }

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />Rekap operasional</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-4 border-b border-border/60 p-5 md:p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><CardTitle className="text-base">Rekap laporan</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tinjau data operasional dan ekspor laporan sesuai hasil filter aktif.</p></div><Button type="button" size="sm" className="shrink-0" onClick={exportCsv} disabled={!reports.length}><Download />Ekspor CSV</Button></div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,auto))_auto]">
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Cari tiket, pelapor, atau layanan" aria-label="Cari rekap laporan" /></div>
            <Select value={category} onValueChange={(value) => setCategory(value as ManagementReportCategory | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter kategori rekap"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua kategori</SelectItem><SelectItem value="Layanan">Layanan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem></SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value as ManagementReportStatus | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter status rekap"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua status</SelectItem><SelectItem value="Baru">Baru</SelectItem><SelectItem value="Sedang Diproses">Sedang Diproses</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent></Select>
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter periode rekap"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periods).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
            {hasFilters ? <Button type="button" variant="outline" size="sm" className="h-9 bg-card" onClick={resetFilters}><RotateCcw />Reset</Button> : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{reports.length} laporan siap diekspor</span><span>{periods[period].label}</span></div>
          {reports.length ? <div className="overflow-hidden rounded-xl border border-border/60"><div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_minmax(9rem,0.8fr)_auto] gap-4 bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground md:grid"><span>Laporan</span><span>Kategori</span><span>Status</span><span>Waktu</span></div><div className="divide-y divide-border/60">{reports.map((report) => <article key={report.ticket} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_minmax(9rem,0.8fr)_auto] md:items-center md:gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{report.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{report.ticket} · {report.reporter} · {report.service}</p></div><div><span className="mb-1 block text-xs text-muted-foreground md:hidden">Kategori</span><ManagementCategoryBadge category={report.category} /></div><div><span className="mb-1 block text-xs text-muted-foreground md:hidden">Status</span><ManagementStatusBadge status={report.status} /></div><div><span className="mb-1 block text-xs text-muted-foreground md:hidden">Waktu laporan</span><span className="text-xs text-muted-foreground">{report.submittedAt}</span></div></article>)}</div></div> : <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><FileSpreadsheet className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada data untuk diekspor</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter agar rekap laporan dapat ditampilkan kembali.</p>{hasFilters ? <Button type="button" variant="outline" size="sm" className="mt-4 bg-card" onClick={resetFilters}><RotateCcw />Reset filter</Button> : null}</div>}
        </CardContent>
      </div>
    </Card>
  )
}
