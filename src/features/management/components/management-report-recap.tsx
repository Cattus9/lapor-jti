"use client"

import { useState } from "react"
import { Download, FileSpreadsheet, RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { ConfigSelect, SearchField } from "@/features/operations/components/operations-ui"
import { ManagementCategoryBadge, ManagementStatusBadge } from "./management-report-detail-dialog"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { reportCategories, reportStatuses, statusLabels } from "../../reports/domain/report"
import { categoryLabels, handlerLabels, managementCategories } from "../domain/management"
import { useManagementPage } from "./use-management-page"
import { ManagementFeedback } from "./management-feedback"

const scopes = [
  { value: "operational", label: "Laporan Manajemen" },
  { value: "monitoring", label: "Lintas pengelola" },
]
const periods = [
  { value: "semua", label: "Semua periode" },
  { value: "7-hari", label: "7 hari terakhir" },
  { value: "30-hari", label: "30 hari terakhir" },
]
const operationalStatuses = ["baru", "diproses", "selesai", "ditolak"] as const

export function ManagementReportRecap() {
  const { notify } = useActivityNotifications()
  const [scope, setScope] = useState("operational")
  const [query, setQuery] = useState("")
  const [category, setCategory] = useState("semua")
  const [status, setStatus] = useState("semua")
  const [handler, setHandler] = useState("semua")
  const [period, setPeriod] = useState("30-hari")
  const [revision, setRevision] = useState(0)
  const [exporting, setExporting] = useState(false)
  const crossRole = scope === "monitoring"
  const q = useDebouncedOperationalQuery(query.trim())
  const search = new URLSearchParams({ q, category, status, period, handler })
  const page = useManagementPage(`/api/manajemen/${crossRole ? "monitoring" : "reports"}?${search}&retry=${revision}`)
  const hasFilters = query || category !== "semua" || status !== "semua" || handler !== "semua" || period !== "30-hari"

  function changeScope(value: string) {
    if (!value || value === scope) return
    setScope(value)
    setCategory("semua")
    setStatus("semua")
    setHandler("semua")
  }

  function resetFilters() {
    setQuery("")
    setCategory("semua")
    setStatus("semua")
    setHandler("semua")
    setPeriod("30-hari")
  }

  async function exportCsv() {
    if (exporting) return
    setExporting(true)
    try {
      const exportSearch = new URLSearchParams(search)
      exportSearch.set("scope", scope)
      const response = await fetch(`/api/manajemen/export?${exportSearch}`, { cache: "no-store" })
      if (!response.ok) {
        const error = await response.json().catch(() => null)
        throw new Error(error?.error || "Rekap belum berhasil diekspor.")
      }
      const url = URL.createObjectURL(await response.blob())
      const anchor = document.createElement("a")
      anchor.href = url
      anchor.download = crossRole ? "rekap-laporan-lintas-pengelola.csv" : "rekap-laporan-manajemen.csv"
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 0)
      notify({ title: "Rekap berhasil diekspor", description: "Seluruh laporan sesuai filter telah disiapkan dalam format CSV.", tone: "success" })
    } catch (error) {
      notify({ title: "Ekspor belum berhasil", description: error instanceof Error ? error.message : "Koneksi bermasalah.", tone: "warning" })
    } finally {
      setExporting(false)
    }
  }

  return (
    <SectionCard title="Data dan ekspor laporan" icon={FileSpreadsheet} contentClassName="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-border/60 pb-4">
        <div className="w-full sm:w-56">
          <ConfigSelect label="Cakupan rekap" value={scope} onChange={changeScope} options={scopes} />
        </div>
        <Button type="button" size="sm" onClick={() => void exportCsv()} disabled={exporting || q !== query.trim() || page.loading || Boolean(page.error) || !page.total}>
          <Download />{exporting ? "Menyiapkan…" : "Ekspor CSV"}
        </Button>
      </div>
      <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-[minmax(0,2fr)_repeat(4,minmax(0,1fr))_auto]">
        <SearchField label="Cari laporan, pelapor, atau layanan" value={query} onChange={setQuery} maxLength={200} />
        {crossRole ? <ConfigSelect label="Filter pengelola" value={handler} onChange={setHandler} options={[{ value: "semua", label: "Semua pengelola" }, ...Object.entries(handlerLabels).map(([value, label]) => ({ value, label }))]} /> : null}
        <ConfigSelect label="Filter kategori rekap" value={category} onChange={setCategory} options={[{ value: "semua", label: "Semua kategori" }, ...(crossRole ? reportCategories : managementCategories).map((value) => ({ value, label: categoryLabels[value] }))]} />
        <ConfigSelect label="Filter status rekap" value={status} onChange={setStatus} options={[{ value: "semua", label: "Semua status" }, ...(crossRole ? reportStatuses : operationalStatuses).map((value) => ({ value, label: statusLabels[value] }))]} />
        <ConfigSelect label="Filter periode rekap" value={period} onChange={setPeriod} options={periods} />
        {hasFilters ? <Button type="button" variant="outline" onClick={resetFilters}><RotateCcw />Reset</Button> : null}
      </div>
      {!page.loading && !page.error ? <p className="text-xs text-muted-foreground">{page.total} laporan sesuai filter</p> : null}
      <ManagementFeedback loading={page.loading} error={page.error} onRetry={() => setRevision((value) => value + 1)} />
      {page.items.length ? (
        <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60">
          {page.items.map((report) => (
            <article key={report.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="break-words text-sm font-medium">{report.title}</p>
                <p className="mt-1 text-xs text-muted-foreground">{report.reporter} · {report.service}</p>
                <p className="mt-1 text-xs text-muted-foreground">{crossRole ? `${report.handler} · ` : ""}{report.submittedAt} WIB</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <ManagementCategoryBadge category={report.category} />
                <ManagementStatusBadge status={report.status} />
              </div>
            </article>
          ))}
        </div>
      ) : !page.loading && !page.error ? (
        <CollectionEmptyState icon={FileSpreadsheet} title={hasFilters ? "Tidak ada laporan yang sesuai" : "Belum ada data rekap"}
          description="Pilih cakupan lain atau ubah filter untuk mencari laporan."
        />
      ) : null}
      {page.nextCursor ? <Button type="button" variant="outline" className="w-full" disabled={page.loading} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
    </SectionCard>
  )
}
