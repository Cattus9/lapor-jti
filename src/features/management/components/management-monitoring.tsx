"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Headphones, Building2, ClipboardList, MapPin, MessageSquareText, PackageSearch, RotateCcw, ScanSearch, ShieldCheck, Wrench } from "lucide-react"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { ConfigSelect, SearchField } from "@/features/operations/components/operations-ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { reportCategories, reportStatuses, statusLabels } from "../../reports/domain/report"
import { reportPeriods } from "../../reports/domain/report-list-filters"
import { categoryLabels, handlerLabels } from "../domain/management"
import type { ManagementReport } from "../types"
import { ManagementReportSession, type OpenManagementReport } from "./management-report-session"
import { ManagementFeedback } from "./management-feedback"
import { useManagementPage } from "./use-management-page"

const categoryIcons = { "kehilangan-temuan": PackageSearch, fasilitas: Wrench, layanan: MessageSquareText, lainnya: ClipboardList }
const handlerIcons = { satpam: ShieldCheck, teknisi: Wrench, manajemen: Building2, tefa: Headphones }
function categoryFrom(value: string | null) { return reportCategories.find((key) => key === value || categoryLabels[key] === value) ?? "semua" }
function statusFrom(value: string | null) { return value === "dalam-penanganan" ? value : value === "Sedang Diproses" ? "diproses" : reportStatuses.find((key) => key === value || statusLabels[key] === value) ?? "semua" }

function MonitoringRow({ report, openReport }: { report: ManagementReport; openReport: OpenManagementReport }) {
  const Icon = categoryIcons[report.categoryKey]
  return <article className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{report.title}</p>{report.location ? <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="break-words">{report.location}</span></p> : null}<p className="mt-2 text-xs text-muted-foreground">{report.category} · Ditangani {report.handler}</p><p className="mt-1 text-xs text-muted-foreground">Dikirim {report.submittedAt} WIB</p></div></div><div className="flex shrink-0 flex-wrap items-center justify-between gap-2 sm:justify-end"><StatusBadge status={report.status} /><Button type="button" variant="outline" size="sm" className="bg-card" aria-haspopup="dialog" onClick={(event) => openReport(report, event.currentTarget)}>Lihat detail</Button></div></article>
}
function MonitoringContent({ openReport, retry }: { openReport: OpenManagementReport; retry: () => void }) {
  const router = useRouter(), params = useSearchParams()
  const from = params.get("from") ?? "", to = params.get("to") ?? ""
  const hasRange = /^\d{4}-\d{2}-\d{2}$/.test(from) && /^\d{4}-\d{2}-\d{2}$/.test(to) && from <= to
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState<string>(() => categoryFrom(params.get("category")))
  const [status, setStatus] = useState<string>(() => statusFrom(params.get("status")))
  const [handler, setHandler] = useState(() => Object.hasOwn(handlerLabels, params.get("handler") ?? "") ? params.get("handler")! : "semua")
  const [period, setPeriod] = useState<string>(hasRange ? "rentang" : params.get("period") && Object.hasOwn(reportPeriods, params.get("period")!) ? params.get("period")! : "30-hari")
  const q = useDebouncedOperationalQuery(query)
  const search = new URLSearchParams({ q, category, status, period, handler })
  if (period === "rentang") { search.set("from", from); search.set("to", to) }
  const page = useManagementPage(`/api/manajemen/monitoring?${search}`)
  const hasFilters = Boolean(query || category !== "semua" || status !== "semua" || handler !== "semua" || period !== "30-hari")

  function reset() {
    setQuery("")
    setCategory("semua")
    setStatus("semua")
    setHandler("semua")
    setPeriod("30-hari")
    if (params.size) router.replace("/manajemen/monitoring")
  }

  return (
    <SectionCard title="Pengawasan lintas pengelola" icon={ScanSearch} contentClassName="space-y-4">
      <div className="grid gap-2 border-b border-border/60 pb-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <SearchField label="Cari laporan, pelapor, atau layanan" value={query} onChange={setQuery} maxLength={200} />
        <ConfigSelect label="Filter pengelola" value={handler} onChange={setHandler} options={[{ value: "semua", label: "Semua pengelola" }, ...Object.entries(handlerLabels).map(([value, label]) => ({ value, label }))]} />
        <ConfigSelect label="Filter kategori" value={category} onChange={setCategory} options={[{ value: "semua", label: "Semua kategori" }, ...reportCategories.map((value) => ({ value, label: categoryLabels[value] }))]} />
        <ConfigSelect label="Filter status" value={status} onChange={setStatus} options={[{ value: "semua", label: "Semua status" }, { value: "dalam-penanganan", label: "Dalam penanganan" }, ...reportStatuses.map((value) => ({ value, label: statusLabels[value] }))]} />
        <ConfigSelect label="Filter periode" value={period} onChange={setPeriod} options={Object.entries(reportPeriods).filter(([key]) => key !== "rentang" || hasRange).map(([value, label]) => ({ value, label }))} />
        {hasFilters ? <Button type="button" variant="outline" className="bg-card" onClick={reset}><RotateCcw />Reset</Button> : null}
      </div>
      {!page.loading && !page.error ? (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border/60 pb-4 text-xs text-muted-foreground">
          <span>{page.total} laporan ditemukan</span>
          {(Object.keys(handlerIcons) as Array<keyof typeof handlerIcons>).filter((role) => handler === "semua" || handler === role).map((role) => {
            const Icon = handlerIcons[role]
            return <span key={role} className="inline-flex items-center gap-1.5"><Icon className="size-3.5 text-primary" aria-hidden="true" />{page.handlerCounts[role]} {handlerLabels[role]}</span>
          })}
        </div>
      ) : null}
      <div className="space-y-2">
        {page.items.map((report) => <MonitoringRow key={report.id} report={report} openReport={openReport} />)}
        <ManagementFeedback loading={page.loading} error={page.error} onRetry={retry} />
        {!page.loading && !page.error && !page.items.length ? (
          <CollectionEmptyState icon={ScanSearch} title={hasFilters ? "Tidak ada laporan yang sesuai" : "Belum ada laporan pada periode ini"}
            description="Ubah kata kunci, pengelola, atau periode untuk mencari laporan."
            action={hasFilters ? <Button type="button" variant="outline" size="sm" onClick={reset}><RotateCcw />Reset filter</Button> : undefined}
          />
        ) : null}
        {page.nextCursor ? <Button type="button" variant="outline" className="w-full bg-card" disabled={page.loading} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
      </div>
    </SectionCard>
  )
}
export function ManagementMonitoring() {
  const params = useSearchParams(), ticket = params.get("ticket")?.trim() ?? ""
  return <ManagementReportSession key={params.toString()} initialTicket={ticket} readOnly>{(openReport, retry) => <MonitoringContent openReport={openReport} retry={retry} />}</ManagementReportSession>
}
