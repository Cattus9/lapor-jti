"use client"

import { useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"
import { ArrowRight, Headphones, Building2, ClipboardList, MapPin, MessageSquareText, PackageSearch, RotateCcw, ScanSearch, ShieldCheck, Wrench } from "lucide-react"
import { cn } from "cn"
import { UnopenedReportBadge } from "@/components/reports/report-opening"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { ConfigSelect, SearchField } from "@/features/operations/components/operations-ui"
import { StatusBadge } from "@/components/ui/status-badge"
import { Stepper, type StepperStep } from "@/components/ui/stepper"
import { reportCategories, reportLifecycleForStatus, reportStatuses, statusLabels } from "../../reports/domain/report"
import { reportPeriods } from "../../reports/domain/report-list-filters"
import { categoryLabels, handlerLabels } from "../domain/management"
import type { ManagementReport } from "../types"
import { ManagementReportSession, type OpenManagementReport } from "./management-report-session"
import { ManagementFeedback } from "./management-feedback"
import { useManagementPage } from "./use-management-page"
import { Card } from "@/components/ui/card"

const categoryIcons = { "kehilangan-temuan": PackageSearch, fasilitas: Wrench, layanan: MessageSquareText, lainnya: ClipboardList }
const categoryTones = { "kehilangan-temuan": "cyan", fasilitas: "warning", layanan: "teal", lainnya: "violet" } as const
const handlerIcons = { satpam: ShieldCheck, teknisi: Wrench, manajemen: Building2, tefa: Headphones }
function categoryFrom(value: string | null) { return reportCategories.find((key) => key === value || categoryLabels[key] === value) ?? "semua" }
function statusFrom(value: string | null) { return value === "dalam-penanganan" ? value : value === "Sedang Diproses" ? "diproses" : reportStatuses.find((key) => key === value || statusLabels[key] === value) ?? "semua" }

export function MonitoringRow({ report, openReport }: { report: ManagementReport; openReport: OpenManagementReport }) {
  const Icon = categoryIcons[report.categoryKey]
  const isDone = report.status === "Selesai" || report.statusKey === "selesai"
  const isRejected = report.status === "Ditolak" || report.statusKey === "ditolak"
  const isInProgress = !isDone && !isRejected && report.statusKey !== "baru" && report.status !== "Baru"
  const currentStep = isDone ? "selesai" : isRejected ? "ditolak" : report.statusKey

  const stages = reportLifecycleForStatus(report.categoryKey, report.statusKey)
  const steps: readonly StepperStep[] = stages.map((s) => ({
    value: s,
    label: statusLabels[s],
  }))

  return (
    <Card
      role="article"
      className="group relative gap-0 overflow-hidden border border-border bg-card p-4 shadow-none ring-0 transition-colors hover:border-primary/40 focus-within:border-primary/40 md:p-5"
    >
      {/* Blurry corner half-circle glow with fading gradient */}
      {isDone ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-emerald-500/20 blur-2xl transition-opacity dark:bg-emerald-500/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 size-28 rounded-bl-full bg-gradient-to-bl from-emerald-500/15 via-emerald-500/5 to-transparent transition-opacity"
          />
        </>
      ) : isInProgress ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 -top-12 size-40 rounded-full bg-blue-500/20 blur-2xl transition-opacity dark:bg-blue-500/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 size-28 rounded-bl-full bg-gradient-to-bl from-blue-500/15 via-blue-500/5 to-transparent transition-opacity"
          />
        </>
      ) : null}

      {/* Header row */}
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className="break-words text-sm font-semibold text-foreground md:text-base">
                {report.title}
              </p>
              <UnopenedReportBadge unseen={report.unopened} />
            </div>
            {report.location ? (
              <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                <MapPin className="size-3.5 shrink-0" aria-hidden="true" />
                <span className="break-words">{report.location}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {isDone ? (
            <span className="relative size-6 shrink-0 drop-shadow-xs">
              <Image
                src="/assets/DoneStatusIc.png"
                alt="Selesai"
                fill
                sizes="24px"
                className="object-contain"
                unoptimized
              />
            </span>
          ) : null}
          <StatusBadge status={report.status} />
        </div>
      </div>

      {/* Metadata tags */}
      <div className="relative z-10 mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <Badge variant="outline" tone={categoryTones[report.categoryKey]}>
          {report.category}
        </Badge>
        <span>· Ditangani {report.handler}</span>
        <span>· Dikirim {report.submittedAt} WIB</span>
      </div>

      {/* Stepper Progres Penanganan */}
      {isRejected ? (
        <div className="relative z-10 mt-3.5 flex items-center justify-between rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          <span>Status akhir</span>
          <span className="font-semibold">Ditolak</span>
        </div>
      ) : (
        <div className="relative z-10 mt-3.5 space-y-1.5">
          <div className="flex items-center justify-between text-[11px] font-medium text-muted-foreground">
            <span>Tahapan penanganan</span>
            <span
              className={cn(
                "font-semibold",
                isDone
                  ? "text-emerald-600 dark:text-emerald-400"
                  : isInProgress
                    ? "text-blue-600 dark:text-blue-400"
                    : "text-muted-foreground"
              )}
            >
              {report.status}
            </span>
          </div>
          <Stepper
            aria-label="Progres penanganan laporan"
            value={currentStep}
            steps={steps}
            className="w-full"
          />
        </div>
      )}

      {/* Footer */}
      <div className="relative z-10 mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
        <span className="text-xs text-muted-foreground">
          {report.updatedAt ? `Diperbarui ${report.updatedAt}` : `Dikirim ${report.submittedAt} WIB`}
        </span>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-primary/20 bg-primary/5 text-primary-action-hover hover:bg-primary/10 hover:text-primary-action-hover dark:text-primary dark:hover:text-primary"
          aria-haspopup="dialog"
          aria-label={`Lihat detail ${report.title}`}
          onClick={(event) => openReport(report, event.currentTarget)}
        >
          Lihat detail
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </div>
    </Card>
  )
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
      <div className="space-y-3">
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
