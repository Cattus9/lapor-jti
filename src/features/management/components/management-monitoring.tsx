"use client"

import { useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, ClipboardList, FileText, ImageIcon, MapPin, PackageSearch, RotateCcw, ScanSearch, Search, ShieldCheck, UserRoundCog, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { isMonitoringReportInProgress, monitoringReports, type MonitoringReport, type MonitoringReportCategory, type MonitoringReportStatus, type MonitoringStatusFilter } from "@/features/management/mock/management-monitoring"

type Period = "semua" | "hari-ini" | "7-hari" | "30-hari"

const periods: Record<Period, { label: string; maxDays?: number }> = {
  semua: { label: "Semua periode" },
  "hari-ini": { label: "Hari ini", maxDays: 0 },
  "7-hari": { label: "7 hari terakhir", maxDays: 7 },
  "30-hari": { label: "30 hari terakhir", maxDays: 30 },
}

const categories: MonitoringReportCategory[] = ["Kehilangan & Temuan", "Fasilitas", "Layanan", "Lainnya"]
const statuses: MonitoringReportStatus[] = ["Baru", "Diverifikasi", "Diproses", "Barang teridentifikasi", "Diserahkan", "Sedang Diproses", "Selesai"]

function isMonitoringCategory(value: string | null): value is MonitoringReportCategory {
  return value !== null && categories.includes(value as MonitoringReportCategory)
}

function isMonitoringStatus(value: string | null): value is MonitoringReportStatus {
  return value !== null && statuses.includes(value as MonitoringReportStatus)
}

const categoryPresentation = {
  "Kehilangan & Temuan": { icon: PackageSearch, label: "Kehilangan & Temuan" },
  Fasilitas: { icon: Wrench, label: "Laporan fasilitas" },
  Layanan: { icon: FileText, label: "Laporan layanan" },
  Lainnya: { icon: ClipboardList, label: "Laporan lainnya" },
} satisfies Record<MonitoringReportCategory, { icon: typeof PackageSearch; label: string }>

const handlerPresentation = {
  Satpam: { icon: ShieldCheck, label: "Ditangani Satpam" },
  Teknisi: { icon: Wrench, label: "Ditangani Teknisi" },
  "Manajemen Jurusan": { icon: Building2, label: "Ditangani Manajemen Jurusan" },
} satisfies Record<MonitoringReport["handler"], { icon: typeof ShieldCheck; label: string }>

const handlerOrder: MonitoringReport["handler"][] = ["Satpam", "Teknisi", "Manajemen Jurusan"]

const statusClass: Record<MonitoringReportStatus, string> = {
  Baru: "border-slate-200 bg-slate-100 text-slate-700",
  Diverifikasi: "border-blue-200 bg-blue-50 text-blue-700",
  Diproses: "border-blue-200 bg-blue-50 text-blue-700",
  "Barang teridentifikasi": "border-cyan-200 bg-cyan-50 text-cyan-700",
  Diserahkan: "border-teal-200 bg-teal-50 text-teal-700",
  "Sedang Diproses": "border-blue-200 bg-blue-50 text-blue-700",
  Selesai: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

function MonitoringStatusBadge({ status }: { status: MonitoringReportStatus }) {
  return <Badge className={statusClass[status]} variant="outline">{status}</Badge>
}

function MonitoringReportRow({ report, defaultOpen = false }: { report: MonitoringReport; defaultOpen?: boolean }) {
  const CategoryIcon = categoryPresentation[report.category].icon
  const HandlerIcon = handlerPresentation[report.handler].icon

  return (
    <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><CategoryIcon className="size-4" aria-hidden="true" /></span>
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
          <p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{report.ticket} · {report.location}</span></p>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5"><HandlerIcon className="size-3.5 shrink-0" aria-hidden="true" />{handlerPresentation[report.handler].label}</span>
            <span className="inline-flex items-center gap-1.5"><CategoryIcon className="size-3.5 shrink-0" aria-hidden="true" />{categoryPresentation[report.category].label}</span>
          </div>
        </div>
      </div>
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end"><MonitoringStatusBadge status={report.status} /><MonitoringReportDetailDialog report={report} defaultOpen={defaultOpen} /></div>
    </article>
  )
}

function MonitoringReportDetailDialog({ report, defaultOpen = false }: { report: MonitoringReport; defaultOpen?: boolean }) {
  const HandlerIcon = report.handler === "Satpam" ? ShieldCheck : UserRoundCog

  return <Dialog defaultOpen={defaultOpen}>
    <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="shrink-0 bg-card hover:bg-muted" />}>Lihat detail</DialogTrigger>
    <DialogContent>
      <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><ScanSearch className="size-4" aria-hidden="true" /></span>
          <span>{report.category}</span>
          <span aria-hidden="true">·</span>
          <span>{report.ticket}</span>
          <MonitoringStatusBadge status={report.status} />
        </div>
        <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{report.title}</DialogTitle>
        <DialogDescription className="mt-2">Dikelola oleh {report.handler}. Detail ini bersifat read-only dari ruang Monitoring.</DialogDescription>
      </div>
      <div className="space-y-6 p-5 md:p-6">
        <section className="rounded-xl border border-border/60 bg-muted/50 p-4">
          <div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><HandlerIcon className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-foreground">Status penanganan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tiket saat ini berada pada status <span className="font-medium text-foreground">{report.status}</span> dan ditangani oleh {report.handler}.</p></div></div>
        </section>
        <section className="border-t border-border/60 pt-6">
          <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><FileText className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-foreground">Detail laporan</h3><p className="mt-0.5 text-xs text-muted-foreground">Informasi yang dapat ditinjau dari seluruh kategori laporan.</p></div></div>
          <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
            <div className="border-b border-border/60 p-4 sm:border-r"><dt className="text-xs text-muted-foreground">Pelapor</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.reporter}</dd></div>
            <div className="border-b border-border/60 p-4"><dt className="text-xs text-muted-foreground">Kategori dan konteks</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.category} - {report.context}</dd></div>
            <div className="border-b border-border/60 p-4 sm:border-b-0 sm:border-r"><dt className="text-xs text-muted-foreground">Lokasi atau kanal</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.location}</dd></div>
            <div className="p-4"><dt className="text-xs text-muted-foreground">Waktu laporan</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.submittedAt}</dd></div>
          </dl>
          <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4"><p className="text-xs text-muted-foreground">Deskripsi laporan</p><p className="mt-1.5 text-sm leading-relaxed text-foreground">{report.description}</p></div>
        </section>
        <section className="border-t border-border/60 pt-6">
          <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><ImageIcon className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-foreground">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung dari pelapor.</p></div></div>
          <div className="mt-4 flex min-h-20 items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4"><ImageIcon className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" /><p className="text-sm text-muted-foreground">{report.attachments ? `${report.attachments} lampiran tercatat pada laporan ini.` : "Pelapor tidak menambahkan lampiran pada laporan ini."}</p></div>
        </section>
      </div>
    </DialogContent>
  </Dialog>
}

export function ManagementMonitoring() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const ticketFromNotification = searchParams.get("ticket")?.trim() ?? ""
  const categoryFromQuery = searchParams.get("category")
  const statusFromQuery = searchParams.get("status")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<MonitoringReportCategory | "semua">(() => isMonitoringCategory(categoryFromQuery) ? categoryFromQuery : "semua")
  const [status, setStatus] = useState<MonitoringStatusFilter>(() => statusFromQuery === "dalam-penanganan" || isMonitoringStatus(statusFromQuery) ? statusFromQuery as MonitoringStatusFilter : "semua")
  const [period, setPeriod] = useState<Period>("30-hari")
  const hasFilters = query || category !== "semua" || status !== "semua" || period !== "30-hari" || Boolean(ticketFromNotification || categoryFromQuery || statusFromQuery)

  const reports = useMemo(() => {
    const normalizedQuery = (query.trim() || ticketFromNotification).toLocaleLowerCase()
    const maxDays = periods[period].maxDays

    return monitoringReports.filter((report) => {
      const matchesQuery = !normalizedQuery || `${report.ticket} ${report.title} ${report.reporter} ${report.category} ${report.context} ${report.location} ${report.handler}`.toLocaleLowerCase().includes(normalizedQuery)
      const matchesCategory = category === "semua" || report.category === category
      const matchesStatus = status === "semua" ? true : status === "dalam-penanganan" ? isMonitoringReportInProgress(report.status) : report.status === status
      const matchesPeriod = maxDays === undefined || report.daysAgo <= maxDays

      return matchesQuery && matchesCategory && matchesStatus && matchesPeriod
    })
  }, [category, period, query, status, ticketFromNotification])
  const handlerCounts = useMemo(() => Object.fromEntries(handlerOrder.map((handler) => [handler, reports.filter((report) => report.handler === handler).length])) as Record<MonitoringReport["handler"], number>, [reports])

  function resetFilters() {
    setQuery("")
    setCategory("semua")
    setStatus("semua")
    setPeriod("30-hari")
    if (ticketFromNotification || categoryFromQuery || statusFromQuery) router.replace("/manajemen/monitoring")
  }

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ScanSearch className="size-4 text-primary" aria-hidden="true" />Pengawasan laporan</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-4 border-b border-border/60 p-5 md:p-6">
          <div><CardTitle className="text-base">Monitoring lintas pengelola</CardTitle><p className="mt-1 text-sm text-muted-foreground">Tinjau laporan Satpam, Teknisi, dan Manajemen Jurusan tanpa mengubah penanganan tiket.</p></div>
          <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,auto))_auto]">
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Cari tiket, pelapor, atau kategori" aria-label="Cari laporan" /></div>
            <Select value={category} onValueChange={(value) => setCategory(value as MonitoringReportCategory | "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter kategori"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua kategori</SelectItem>{categories.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={status} onValueChange={(value) => setStatus(value as MonitoringStatusFilter)}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua status</SelectItem><SelectItem value="dalam-penanganan">Dalam penanganan</SelectItem>{statuses.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
            <Select value={period} onValueChange={(value) => setPeriod(value as Period)}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter periode"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(periods).map(([value, item]) => <SelectItem key={value} value={value}>{item.label}</SelectItem>)}</SelectContent></Select>
            {hasFilters ? <Button type="button" variant="outline" size="sm" className="h-9 bg-card" onClick={resetFilters}><RotateCcw />Reset</Button> : null}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-5">
          {ticketFromNotification ? <div className="mb-3 flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-primary"><ClipboardList className="size-3.5" aria-hidden="true" />Tiket dari notifikasi: {ticketFromNotification}</div> : null}
          <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span>{reports.length} laporan ditemukan</span>{handlerOrder.map((handler) => { const HandlerIcon = handlerPresentation[handler].icon; return <span key={handler} className="inline-flex items-center gap-1.5"><HandlerIcon className="size-3.5 text-primary" aria-hidden="true" />{handlerCounts[handler]} {handler}</span> })}</div><span>{periods[period].label}</span></div>
          {reports.length ? <div className="space-y-2">{reports.map((report) => <MonitoringReportRow key={report.ticket} report={report} defaultOpen={report.ticket === ticketFromNotification} />)}</div> : <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ScanSearch className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan yang sesuai</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter untuk menampilkan laporan pada periode lain.</p>{hasFilters ? <Button type="button" variant="outline" size="sm" className="mt-4 bg-card" onClick={resetFilters}><RotateCcw />Reset filter</Button> : null}</div>}
        </CardContent>
      </div>
    </Card>
  )
}
