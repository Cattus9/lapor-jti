"use client"

import { useEffect, useId, useRef, useState, useTransition, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Search, SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "cn"
import { reportCategories } from "../domain/report"
import { defaultReportFilters, hasReportFilters, parseReportListFilters, reportListHref, reportPeriods, reportProcessFilters, type ReportListFilters } from "../domain/report-list-filters"
import { reportCategoryPresentation } from "./report-category-badge"
import { createReportFilterState, reconcileReportFilterState } from "./report-filter-state"

export function PelaporReportFilters({ filters }: { filters: ReportListFilters }) {
  const router = useRouter()
  const id = useId()
  const [state, setState] = useState(() => createReportFilterState(filters))
  const [error, setError] = useState("")
  const synchronized = reconcileReportFilterState(state, filters)
  if (synchronized !== state) {
    setState(synchronized)
    if (synchronized.revision !== state.revision) setError("")
  }
  const values = synchronized.values
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composing = useRef(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [pending, startTransition] = useTransition()
  // Cancel delayed work on unmount or when back/forward restores other criteria.
  useEffect(() => () => {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current)
  }, [synchronized.revision])
  const dirty = hasReportFilters(values) || hasReportFilters(filters)
  const activeCount = Number(values.category !== "semua") + Number(values.status !== "semua") + Number(values.period !== "semua")
  const needsRangeGuide = values.period === "rentang" && (!values.from || !values.to)
  const periodDescriptionId = needsRangeGuide ? `${id}-period-description` : undefined

  function cancelSearch() {
    if (searchTimer.current !== null) clearTimeout(searchTimer.current)
    searchTimer.current = null
  }
  function navigate(next: ReportListFilters) {
    const href = reportListHref(next)
    setState((current) => ({ ...current, requests: [...current.requests.filter((request) => request !== href), href] }))
    // Criteria reset cursors. Replace avoids adding history on every search edit.
    startTransition(() => router.replace(href, { scroll: false }))
  }
  function change(next: ReportListFilters, delay = 0) {
    cancelSearch()
    setState((current) => ({ ...current, values: next }))
    setError("")
    if (composing.current || (next.period === "rentang" && (!next.from || !next.to))) return
    try {
      const parsed = parseReportListFilters(next)
      if (delay) searchTimer.current = setTimeout(() => navigate(parsed), delay)
      else navigate(parsed)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Filter belum dapat diterapkan.") }
  }

  function apply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (composing.current) return
    cancelSearch()
    try {
      const next = parseReportListFilters(values)
      setError("")
      navigate(next)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Filter belum dapat diterapkan.") }
  }
  function reset() {
    change(defaultReportFilters)
  }
  return (
    <form onSubmit={apply} role="search" aria-label="Cari dan filter laporan saya" aria-busy={pending} className="@container mb-4 space-y-3 border-b border-border/60 pb-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 @5xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Field className="min-w-0">
          <FieldLabel htmlFor={`${id}-q`} className="text-xs text-muted-foreground">Pencarian</FieldLabel>
          <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id={`${id}-q`} type="search" value={values.q} onChange={(event) => change({ ...values, q: event.target.value }, 350)} onCompositionStart={() => { composing.current = true; cancelSearch() }} onCompositionEnd={(event) => { composing.current = false; change({ ...values, q: event.currentTarget.value }, 350) }} maxLength={100} placeholder="Cari judul atau nomor tiket" className="h-9 bg-background pl-9" /></div>
        </Field>
        <Button type="button" variant="outline" className="h-9 bg-background md:hidden" aria-expanded={mobileOpen} aria-controls={`${id}-options`} onClick={() => setMobileOpen((open) => !open)}><SlidersHorizontal aria-hidden="true" />Filter{activeCount ? ` (${activeCount})` : ""}</Button>
        <div id={`${id}-options`} className={cn("col-span-2 gap-2 md:grid md:max-w-[33rem] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] @5xl:col-span-1 @5xl:w-[33rem]", mobileOpen ? "grid" : "hidden")}>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`${id}-category`} className="text-xs text-muted-foreground">Jenis laporan</FieldLabel>
            <Select value={values.category} onValueChange={(value) => change({ ...values, category: (value ?? "semua") as ReportListFilters["category"] })}>
              <SelectTrigger id={`${id}-category`} aria-label="Jenis laporan" className="!h-9 w-full bg-background"><SelectValue className="min-w-0 truncate">{values.category === "semua" ? "Semua jenis" : reportCategoryPresentation[values.category].label}</SelectValue></SelectTrigger>
              <SelectContent matchTriggerWidth={false} className="min-w-52"><SelectItem value="semua">Semua jenis</SelectItem>{reportCategories.map((category) => <SelectItem key={category} value={category}>{reportCategoryPresentation[category].label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`${id}-status`} className="text-xs text-muted-foreground">Proses</FieldLabel>
            <Select value={values.status} onValueChange={(value) => change({ ...values, status: (value ?? "semua") as ReportListFilters["status"] })}>
              <SelectTrigger id={`${id}-status`} aria-label="Proses laporan" className="!h-9 w-full bg-background"><SelectValue className="min-w-0 truncate">{reportProcessFilters[values.status]}</SelectValue></SelectTrigger>
              <SelectContent>{Object.entries(reportProcessFilters).map(([process, label]) => <SelectItem key={process} value={process}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`${id}-period`} className="text-xs text-muted-foreground">Periode</FieldLabel>
            <Select value={values.period} onValueChange={(value) => change({ ...values, period: (value ?? "semua") as ReportListFilters["period"] })}>
              <SelectTrigger id={`${id}-period`} aria-label="Periode pengiriman laporan" aria-describedby={periodDescriptionId} className="!h-9 w-full bg-background"><SelectValue className="min-w-0 truncate">{reportPeriods[values.period]}</SelectValue></SelectTrigger>
              <SelectContent matchTriggerWidth={false} className="min-w-44">{Object.entries(reportPeriods).map(([period, label]) => <SelectItem key={period} value={period}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
        <Button type="button" variant="ghost" className="col-span-2 h-9 justify-self-start text-muted-foreground md:col-span-1 md:col-start-2 md:row-start-1 @5xl:col-start-auto @5xl:row-auto" onClick={reset} disabled={!dirty}><RotateCcw aria-hidden="true" />Reset<span className="sr-only"> filter</span></Button>
      </div>
      {values.period === "rentang" ? <div className={cn("gap-3 sm:max-w-lg sm:grid-cols-2 md:grid", mobileOpen ? "grid" : "hidden")}>
        <Field><FieldLabel htmlFor={`${id}-from`} className="text-xs">Dikirim mulai</FieldLabel><Input id={`${id}-from`} type="date" value={values.from} onChange={(event) => change({ ...values, from: event.target.value })} max={values.to || "9998-12-31"} min="1000-01-01" className="h-9 min-w-0 bg-background" aria-describedby={periodDescriptionId} /></Field>
        <Field><FieldLabel htmlFor={`${id}-to`} className="text-xs">Sampai tanggal</FieldLabel><Input id={`${id}-to`} type="date" value={values.to} onChange={(event) => change({ ...values, to: event.target.value })} min={values.from || "1000-01-01"} max="9998-12-31" className="h-9 min-w-0 bg-background" aria-describedby={periodDescriptionId} /></Field>
      </div> : null}
      {needsRangeGuide ? <FieldDescription id={periodDescriptionId}>Lengkapi kedua tanggal untuk memuat hasil.</FieldDescription> : null}
      {error ? <FieldError role="alert">{error}</FieldError> : null}
      <span className="sr-only" role="status" aria-live="polite">{pending ? "Memuat laporan sesuai filter..." : ""}</span>
    </form>
  )
}
