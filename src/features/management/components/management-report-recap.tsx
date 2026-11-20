"use client"

import { useState } from "react"
import { ClipboardCheck, Download, FileSpreadsheet, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { ConfigSelect, SearchField } from "@/features/operations/components/operations-ui"
import { reportCategories, type ReportHandler } from "../../reports/domain/report"
import { reportPeriods } from "../../reports/domain/report-list-filters"
import { categoryLabels, defaultRecapPeriod, handlerLabels } from "../domain/management"
import type { ManagementPage, ManagementReport } from "../types"
import { ManagementCategoryBadge } from "./management-report-detail-dialog"
import { ManagementFeedback } from "./management-feedback"
import { useManagementPage } from "./use-management-page"

const periods = (["bulan-ini", "30-hari", "7-hari", "semua"] as const).map((value) => ({ value, label: reportPeriods[value] }))
const handlers = Object.keys(handlerLabels) as ReportHandler[]
const handlerOptions = [{ value: "semua", label: "Semua pengelola" }, ...handlers.map((value) => ({ value, label: handlerLabels[value] }))]
const categoryOptions = [{ value: "semua", label: "Semua kategori" }, ...reportCategories.map((value) => ({ value, label: categoryLabels[value] }))]
const numberFormat = new Intl.NumberFormat("id-ID")

function CompletionSummary({ total, handlerCounts, allHandlers }: Pick<ManagementPage, "total" | "handlerCounts"> & { allHandlers: boolean }) {
  return (
    <section className="flex flex-col rounded-xl border border-border/60 bg-accent/30 lg:flex-row lg:items-center" aria-label="Ringkasan penyelesaian">
      <div className="flex items-center gap-3 p-4 lg:min-w-52 lg:p-5">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-card text-primary">
          <ClipboardCheck className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-xs font-medium text-muted-foreground">Laporan selesai</p>
          <p className="mt-0.5 text-2xl font-semibold tabular-nums">{numberFormat.format(total)}</p>
        </div>
      </div>
      {allHandlers ? (
        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-3 border-t border-border/60 p-4 sm:grid-cols-4 lg:border-t-0 lg:border-l lg:p-5">
          {handlers.map((handler) => (
            <div key={handler} className="min-w-0">
              <dt className="text-xs text-muted-foreground">{handlerLabels[handler]}</dt>
              <dd className="mt-1 text-base font-semibold tabular-nums">{numberFormat.format(handlerCounts[handler])}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </section>
  )
}

function CompletedReportsTable({ reports }: { reports: ManagementReport[] }) {
  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <table className="w-full table-fixed text-left text-sm">
        <caption className="sr-only">Daftar laporan selesai, diurutkan dari yang paling baru selesai</caption>
        <thead className="bg-muted/50 text-xs text-muted-foreground">
          <tr>
            <th scope="col" className="px-3 py-3 font-medium sm:px-4">Laporan</th>
            <th scope="col" className="hidden w-44 px-4 py-3 font-medium lg:table-cell">Pengelola</th>
            <th scope="col" className="hidden w-44 px-4 py-3 font-medium sm:table-cell">Selesai (WIB)</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60 border-t border-border/60">
          {reports.map((report) => (
            <tr key={report.id}>
              <td className="px-3 py-3 align-top sm:px-4">
                <p className="break-words font-medium">{report.title}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <ManagementCategoryBadge category={report.category} />
                  {report.service !== report.category ? <span className="break-words text-xs text-muted-foreground">{report.service}</span> : null}
                </div>
                <p className="mt-1.5 break-words text-xs text-muted-foreground lg:hidden">{report.handler}</p>
                <p className="mt-1.5 text-xs font-medium sm:hidden">{report.completedAt ? `Selesai ${report.completedAt} WIB` : "Waktu selesai belum tercatat"}</p>
              </td>
              <td className="hidden px-4 py-3 align-top text-muted-foreground lg:table-cell">{report.handler}</td>
              <td className="hidden px-4 py-3 align-top font-medium tabular-nums sm:table-cell">{report.completedAt ?? "Belum tercatat"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function ManagementReportRecap() {
  const { notify } = useActivityNotifications()
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("semua")
  const [handler, setHandler] = useState("semua")
  const [period, setPeriod] = useState<string>(defaultRecapPeriod)
  const [revision, setRevision] = useState(0)
  const [exporting, setExporting] = useState(false)
  const q = useDebouncedOperationalQuery(query.trim())
  const search = new URLSearchParams({ q, category, period, handler })
  const page = useManagementPage(`/api/manajemen/rekap?${search}&retry=${revision}`)
  const hasFilters = Boolean(query || category !== "semua" || handler !== "semua" || period !== defaultRecapPeriod)
  const canExport = !exporting && q === query.trim() && page.hasData && !page.loading && !page.error && page.total > 0

  function resetFilters() {
    setQuery("")
    setCategory("semua")
    setHandler("semua")
    setPeriod(defaultRecapPeriod)
  }

  async function exportCsv() {
    if (!canExport) return
    setExporting(true)
    try {
      const exportSearch = new URLSearchParams(search)
      exportSearch.set("scope", "completed")
      const response = await fetch(`/api/manajemen/export?${exportSearch}`, { cache: "no-store" })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || "Rekap belum berhasil diekspor.")
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = "rekap-laporan-selesai.csv"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      notify({ title: "Rekap berhasil diekspor", description: "CSV berisi seluruh laporan selesai sesuai filter.", tone: "success" })
    } catch (error) {
      notify({ title: "Ekspor belum berhasil", description: error instanceof Error ? error.message : "Koneksi bermasalah.", tone: "warning" })
    } finally {
      setExporting(false)
    }
  }

  return (
    <SectionCard title="Rekap penyelesaian" icon={FileSpreadsheet} contentClassName="space-y-5">
      <div className="grid grid-cols-2 gap-2 border-b border-border/60 pb-4 xl:grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))_auto_auto]">
        <div className="col-span-2 min-w-0 xl:col-span-1"><SearchField label="Cari laporan atau layanan" value={query} onChange={setQuery} maxLength={200} /></div>
        <ConfigSelect label="Filter pengelola" value={handler} onChange={setHandler} options={handlerOptions} />
        <ConfigSelect label="Filter kategori rekap" value={category} onChange={setCategory} options={categoryOptions} />
        <ConfigSelect label="Filter periode penyelesaian" value={period} onChange={setPeriod} options={periods} />
        <Button type="button" variant="ghost" className="justify-self-end text-muted-foreground" disabled={!hasFilters} onClick={resetFilters}><RotateCcw aria-hidden="true" />Reset</Button>
        <Button type="button" className="col-span-2 sm:justify-self-end xl:col-span-1" onClick={() => void exportCsv()} disabled={!canExport}>
          <Download aria-hidden="true" />{exporting ? "Menyiapkan…" : "Ekspor CSV"}
        </Button>
      </div>
      <ManagementFeedback loading={page.loading} error={page.error} onRetry={() => setRevision((value) => value + 1)} />
      {page.hasData ? <CompletionSummary total={page.total} handlerCounts={page.handlerCounts} allHandlers={handler === "semua"} /> : null}
      {page.items.length ? <CompletedReportsTable reports={page.items} /> : !page.loading && !page.error && page.hasData ? (
        <CollectionEmptyState icon={ClipboardCheck} title="Belum ada laporan selesai sesuai filter"
          description="Pilih periode lain atau sesuaikan filter untuk melihat hasil penanganan."
        />
      ) : null}
      {page.nextCursor ? <Button type="button" variant="outline" className="w-full" disabled={page.loading || Boolean(page.error)} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
    </SectionCard>
  )
}
