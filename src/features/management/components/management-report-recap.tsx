"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { ManagementCategoryBadge, ManagementStatusBadge } from "@/features/management/components/management-report-detail-dialog"
import type { ManagementReportCategory, ManagementReportStatus } from "../types"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { useManagementPage } from "./use-management-page"
import { ManagementFeedback } from "./management-feedback"

type Period = "semua" | "7-hari" | "30-hari"

const periods: Record<Period, { label: string; maxDays?: number }> = {
  semua: { label: "Semua periode" },
  "7-hari": { label: "7 hari terakhir", maxDays: 7 },
  "30-hari": { label: "30 hari terakhir", maxDays: 30 },
}

export function ManagementReportRecap() {
  const { notify } = useActivityNotifications()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<ManagementReportCategory | "semua">("semua")
  const [status, setStatus] = useState<ManagementReportStatus | "semua">("semua")
  const [period, setPeriod] = useState<Period>("30-hari")
  const [revision, setRevision] = useState(0), [exporting, setExporting] = useState(false)
  const q = useDebouncedOperationalQuery(query)
  const search = new URLSearchParams({ q, category: category === "semua" ? "semua" : category === "Layanan" ? "layanan" : "lainnya", status: status === "semua" ? "semua" : status === "Baru" ? "baru" : status === "Diproses" ? "diproses" : status === "Ditolak" ? "ditolak" : "selesai", period })
  const page = useManagementPage(`/api/manajemen/reports?${search}&retry=${revision}`)
  const reports = page.items
  const hasFilters = query || category !== "semua" || status !== "semua" || period !== "30-hari"

  function resetFilters() {
    setQuery("")
    setCategory("semua")
    setStatus("semua")
    setPeriod("30-hari")
  }

  async function exportCsv() {
    if (exporting) return
    setExporting(true)
    try {
    // Export uses the current filter, not only the pages already loaded in this browser.
    const exportSearch = new URLSearchParams(search); exportSearch.set("q", query.trim())
    const response = await fetch(`/api/manajemen/export?${exportSearch}`, { cache: "no-store" })
    if (!response.ok) { const error = await response.json(); throw new Error(error.error || "Rekap belum berhasil diekspor.") }
    const blob = await response.blob()
    const url = URL.createObjectURL(blob)
    const anchor = document.createElement("a")
    anchor.href = url
    anchor.download = "rekap-laporan-manajemen.csv"
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 0)
    notify({ title: "Rekap berhasil diekspor", description: "Seluruh laporan sesuai filter telah disiapkan dalam format CSV.", tone: "success" })
    } catch (error) { notify({ title: "Ekspor belum berhasil", description: error instanceof Error ? error.message : "Koneksi bermasalah.", tone: "warning" }) }
    finally { setExporting(false) }
  }

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><FileSpreadsheet className="size-4 text-primary" aria-hidden="true" />Data operasional dan ekspor</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-4 border-b border-border/60 p-5 md:p-6">
          <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,auto))_auto]">
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Cari tiket, pelapor, atau layanan" aria-label="Cari rekap laporan" /></div>
            <Select value={category} onValueChange={(value) => setCategory(value as ManagementReportCategory | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter kategori rekap"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua kategori</SelectItem><SelectItem value="Layanan">Layanan</SelectItem><SelectItem value="Lainnya">Lainnya</SelectItem></SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value as ManagementReportStatus | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter status rekap"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua status</SelectItem><SelectItem value="Baru">Baru</SelectItem><SelectItem value="Diproses">Diproses</SelectItem><SelectItem value="Selesai">Selesai</SelectItem><SelectItem value="Ditolak">Ditolak</SelectItem></SelectContent></Select>
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter periode rekap"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periods).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
            <div className="flex flex-wrap justify-end gap-2 md:col-span-2 xl:col-span-1">
              {hasFilters ? <Button type="button" variant="outline" size="sm" className="h-9 bg-card" onClick={resetFilters}><RotateCcw />Reset</Button> : null}
              <Button type="button" size="sm" className="h-9 shrink-0" onClick={() => void exportCsv()} disabled={exporting || page.loading || Boolean(page.error) || !page.total}><Download />{exporting ? "Menyiapkan…" : "Ekspor CSV"}</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          <div className="mb-3 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{!page.loading && !page.error ? `${page.total} laporan sesuai filter` : ""}</span><span>{periods[period].label}</span></div>
          <ManagementFeedback loading={page.loading} error={page.error} onRetry={() => setRevision((value) => value + 1)} />
          {reports.length ? <div className="overflow-hidden rounded-xl border border-border/60"><div className="hidden grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_minmax(9rem,0.8fr)_auto] gap-4 bg-muted/40 px-4 py-3 text-xs font-medium text-muted-foreground md:grid"><span>Laporan</span><span>Kategori</span><span>Status</span><span>Waktu</span></div><div className="divide-y divide-border/60">{reports.map((report) => <article key={report.ticket} className="grid gap-3 p-4 md:grid-cols-[minmax(0,1.5fr)_minmax(8rem,0.7fr)_minmax(9rem,0.8fr)_auto] md:items-center md:gap-4"><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{report.title}</p><p className="mt-1 truncate text-xs text-muted-foreground">{report.ticket} · {report.reporter} · {report.service}</p></div><div><span className="mb-1 block text-xs text-muted-foreground md:hidden">Kategori</span><ManagementCategoryBadge category={report.category} /></div><div><span className="mb-1 block text-xs text-muted-foreground md:hidden">Status</span><ManagementStatusBadge status={report.status} /></div><div><span className="mb-1 block text-xs text-muted-foreground md:hidden">Waktu laporan</span><span className="text-xs text-muted-foreground">{report.submittedAt}</span></div></article>)}</div></div> : !page.loading && !page.error ? <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><FileSpreadsheet className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada data untuk diekspor</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter agar rekap laporan dapat ditampilkan kembali.</p>{hasFilters ? <Button type="button" variant="outline" size="sm" className="mt-4 bg-card" onClick={resetFilters}><RotateCcw />Reset filter</Button> : null}</div> : null}
          {page.nextCursor ? <Button type="button" variant="outline" className="mt-3 w-full bg-card" disabled={page.loading} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
        </CardContent>
      </div>
    </Card>
  )
}
