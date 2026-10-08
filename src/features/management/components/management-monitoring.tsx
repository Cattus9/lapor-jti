"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Building2, ClipboardList, MapPin, MessageSquareText, PackageSearch, RotateCcw, ScanSearch, Search, ShieldCheck, Wrench } from "lucide-react"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StatusBadge } from "@/components/ui/status-badge"
import { reportCategories, reportStatuses, statusLabels } from "../../reports/domain/report"
import { reportPeriods } from "../../reports/domain/report-list-filters"
import { categoryLabels, handlerLabels } from "../domain/management"
import type { ManagementReport } from "../types"
import { ManagementReportSession, type OpenManagementReport } from "./management-report-session"
import { ManagementFeedback } from "./management-feedback"
import { useManagementPage } from "./use-management-page"

const categoryIcons = { "kehilangan-temuan": PackageSearch, fasilitas: Wrench, layanan: MessageSquareText, lainnya: ClipboardList }
const handlerIcons = { satpam: ShieldCheck, teknisi: Wrench, manajemen: Building2 }
function categoryFrom(value: string | null) { return reportCategories.find((key) => key === value || categoryLabels[key] === value) ?? "semua" }
function statusFrom(value: string | null) { return value === "dalam-penanganan" ? value : value === "Sedang Diproses" ? "diproses" : reportStatuses.find((key) => key === value || statusLabels[key] === value) ?? "semua" }

function MonitoringRow({ report, openReport }: { report: ManagementReport; openReport: OpenManagementReport }) {
  const Icon = categoryIcons[report.categoryKey]
  return <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{report.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="break-words">{report.ticket} · {report.location}</span></p><p className="mt-2 text-xs text-muted-foreground">{report.category} · Ditangani {report.handler}</p></div></div><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end"><StatusBadge status={report.status} /><Button type="button" variant="outline" size="sm" className="bg-card" aria-haspopup="dialog" onClick={(event) => openReport(report, event.currentTarget)}>Lihat detail</Button></div></article>
}
function MonitoringContent({ openReport, retry }: { openReport: OpenManagementReport; retry: () => void }) {
  const router = useRouter(), params = useSearchParams()
  const ticket = params.get("ticket")?.trim() ?? "", from = params.get("from") ?? "", to = params.get("to") ?? ""
  const hasRange = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to
  const [query, setQuery] = useState(ticket), [category, setCategory] = useState<string>(() => categoryFrom(params.get("category"))), [status, setStatus] = useState<string>(() => statusFrom(params.get("status")))
  const [period, setPeriod] = useState<string>(hasRange ? "rentang" : params.get("period") && Object.hasOwn(reportPeriods, params.get("period")!) ? params.get("period")! : "30-hari")
  const q = useDebouncedOperationalQuery(query), search = new URLSearchParams({ q, category, status, period })
  if (period === "rentang") { search.set("from", from); search.set("to", to) }
  const page = useManagementPage(`/api/manajemen/monitoring?${search}`)
  const hasFilters = Boolean(query || category !== "semua" || status !== "semua" || period !== "30-hari")
  function reset() { setQuery(""); setCategory("semua"); setStatus("semua"); setPeriod("30-hari"); if (params.size) router.replace("/manajemen/monitoring") }
  return <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ScanSearch className="size-4 text-primary" aria-hidden="true" />Pengawasan lintas pengelola</div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-4 border-b border-border/60 p-5 md:p-6"><div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_repeat(3,minmax(9rem,auto))_auto]"><div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" maxLength={200} placeholder="Cari tiket, pelapor, atau layanan" aria-label="Cari laporan" /></div><Select value={category} onValueChange={(value) => setCategory(value ?? "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter kategori"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua kategori</SelectItem>{reportCategories.map((key) => <SelectItem key={key} value={key}>{categoryLabels[key]}</SelectItem>)}</SelectContent></Select><Select value={status} onValueChange={(value) => setStatus(value ?? "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter status"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="semua">Semua status</SelectItem><SelectItem value="dalam-penanganan">Dalam penanganan</SelectItem>{reportStatuses.map((key) => <SelectItem key={key} value={key}>{statusLabels[key]}</SelectItem>)}</SelectContent></Select><Select value={period} onValueChange={(value) => setPeriod(value ?? "semua")}><SelectTrigger className="h-9 w-full bg-background" aria-label="Filter periode"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(reportPeriods).filter(([key]) => key !== "rentang" || hasRange).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent></Select>{hasFilters ? <Button type="button" variant="outline" size="sm" className="h-9 bg-card" onClick={reset}><RotateCcw />Reset</Button> : null}</div></CardHeader><CardContent className="p-4 md:p-5">
    {!page.loading && !page.error ? <div className="mb-4 flex flex-col gap-3 border-b border-border/60 pb-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-x-4 gap-y-2"><span>{page.total} laporan ditemukan</span>{(["satpam", "teknisi", "manajemen"] as const).map((role) => { const Icon = handlerIcons[role]; return <span key={role} className="inline-flex items-center gap-1.5"><Icon className="size-3.5 text-primary" aria-hidden="true" />{page.handlerCounts[role]} {handlerLabels[role]}</span> })}</div></div> : null}
    <div className="space-y-2">{page.items.map((report) => <MonitoringRow key={report.id} report={report} openReport={openReport} />)}<ManagementFeedback loading={page.loading} error={page.error} onRetry={retry} />{!page.loading && !page.error && !page.items.length ? <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ScanSearch className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Tidak ada laporan yang sesuai</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter untuk menampilkan laporan pada periode lain.</p>{hasFilters ? <Button type="button" variant="outline" size="sm" className="mt-4 bg-card" onClick={reset}><RotateCcw />Reset filter</Button> : null}</div> : null}{page.nextCursor ? <Button type="button" variant="outline" className="w-full bg-card" disabled={page.loading} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}</div>
  </CardContent></div></Card>
}
export function ManagementMonitoring() {
  const params = useSearchParams(), ticket = params.get("ticket")?.trim() ?? ""
  return <ManagementReportSession key={params.toString()} initialTicket={ticket} readOnly>{(openReport, retry) => <MonitoringContent openReport={openReport} retry={retry} />}</ManagementReportSession>
}
