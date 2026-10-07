"use client"

import { createContext, useContext, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Armchair, ArrowRight, ChevronDown, ClipboardList, LampCeiling, Layers3, ListTodo, MapPin, Monitor, RotateCcw, Search, Snowflake, Table2, Tv, Wrench, type LucideIcon } from "lucide-react"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { OperationalRefreshContext, useDebouncedOperationalQuery, useOperationalPage, useOperationalResource } from "@/components/reports/use-operational-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { technicianStatuses, type TechnicianCommand } from "../domain/technician"
import { reportPeriods } from "../../reports/domain/report-list-filters"
import { statusLabels } from "../../reports/domain/report"
import { TechnicianReportDetailDialog } from "./technician-report-detail-dialog"
import { TechnicianEmptyState } from "./technician-empty-state"
import type { TechnicianDetail, TechnicianFacilityReport, TechnicianRoomPriority } from "../types"
import { cn } from "cn"

type ReportView = "queue" | "priority"
const workspaceTabClassName = "data-active:bg-accent data-active:text-accent-foreground data-active:font-semibold data-active:shadow-none data-active:inset-ring data-active:inset-ring-primary/25"
const activeStatuses = technicianStatuses.filter((value) => value !== "selesai" && value !== "ditolak")
const periodOptions = Object.entries(reportPeriods).filter(([value]) => value !== "rentang").map(([value, label]) => ({ value, label }))
const sortOptions = [{ value: "terbaru", label: "Terbaru" }, { value: "terlama", label: "Terlama" }]
type OpenReport = (report: TechnicianFacilityReport, trigger: HTMLButtonElement) => void
const ReportContext = createContext<OpenReport | null>(null)
const RetryContext = createContext(() => {})

function Feedback({ loading, error }: { loading: boolean; error: string }) {
  const retry = useContext(RetryContext)
  return <>{error ? <div className="space-y-2"><FieldError>{error}</FieldError><Button type="button" size="sm" variant="outline" onClick={retry}>Coba lagi</Button></div> : null}{loading ? <div className="space-y-2" role="status" aria-label="Memuat laporan"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : null}</>
}

function FacilityReportRow({ report }: { report: TechnicianFacilityReport }) {
  const openReport = useContext(ReportContext)
  return <article className="rounded-xl border border-border/60 bg-background/40 p-3.5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"><Wrench className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium">{report.title}</p><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="break-words">{report.ticket} · {report.facility} · {report.location}</span></p></div></div><div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><span className="text-xs text-muted-foreground">{report.completedAt ? `Selesai ${report.completedAt}` : report.status === "Ditolak" ? `Ditolak ${report.updatedAt}` : `Dikirim ${report.submittedAt}`}</span><StatusBadge status={report.status} /><Button type="button" variant="outline" size="sm" className="shrink-0 bg-card" data-report-detail={report.id} aria-haspopup="dialog" onClick={(event) => openReport?.(report, event.currentTarget)}>Lihat detail</Button></div></div>{report.completionNote ? <p className="mt-3 whitespace-pre-wrap break-words border-t border-border/60 pt-3 text-sm text-muted-foreground">{report.completionNote}</p> : null}</article>
}

function ReportPage({ url, emptyContext = "room-reports", hasFilters = false, onReset }: {
  url: string
  emptyContext?: "reports" | "history" | "room-reports"
  hasFilters?: boolean
  onReset?: () => void
}) {
  const retry = useContext(RetryContext)
  const page = useOperationalPage<TechnicianFacilityReport>(url)
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground" aria-live="polite">{!page.loading && !page.error ? `${page.total} laporan ditemukan` : ""}</p>
      {page.items.map((report) => <FacilityReportRow key={report.id} report={report} />)}
      <Feedback loading={page.loading} error={page.error} />
      {!page.loading && !page.error && !page.items.length ? (
        <TechnicianEmptyState context={emptyContext} filtered={hasFilters} action={
          emptyContext === "room-reports"
            ? <Button type="button" size="sm" variant="outline" className="bg-card" onClick={retry}><RotateCcw />Muat ulang</Button>
            : hasFilters && onReset ? <Button type="button" size="sm" variant="outline" className="bg-card" onClick={onReset}><RotateCcw />Reset filter</Button> : undefined
        } />
      ) : null}
      {page.nextCursor ? <Button type="button" variant="outline" className="w-full bg-card" disabled={page.loading} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
    </div>
  )
}

const facilityIcons: Record<string, LucideIcon> = { AC: Snowflake, Komputer: Monitor, Kursi: Armchair, Lampu: LampCeiling, LCD: Monitor, Meja: Table2, TV: Tv }
function PriorityRoomCard({ room, highest, status }: { room: TechnicianRoomPriority; highest: number; status: string }) {
  const [expanded, setExpanded] = useState(false)
  const maxObject = room.facilities[0]?.activeReports
  const query = new URLSearchParams({ locationId: room.id, active: "1", classified: "1", status })
  return (
    <Collapsible open={expanded} onOpenChange={setExpanded} className="overflow-hidden rounded-xl border border-border/60 bg-background/30">
      <div className="flex flex-col gap-3 bg-muted/30 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><MapPin className="size-4" aria-hidden="true" /></span>
          <div>
            <h3 className="text-sm font-semibold">{room.room}</h3>
            <div className="mt-3 flex flex-wrap gap-1.5" aria-label="Jumlah laporan per fasilitas">
              {room.facilities.map((facility) => {
                const Icon = facilityIcons[facility.facility] ?? Wrench
                return <Badge key={facility.facility} variant="outline" tone={facility.activeReports === maxObject ? "primary" : "neutral"}><Icon className="size-3.5" aria-hidden="true" />{facility.facility} · {facility.activeReports}</Badge>
              })}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <Badge variant="outline" tone={room.activeReports === highest ? "destructive" : "primary"}>{room.activeReports === highest ? "Prioritas utama" : "Prioritas berikutnya"} · {room.activeReports} aktif</Badge>
          <CollapsibleTrigger render={<Button type="button" variant="outline" size="sm" className="bg-card" />}>
            {expanded ? "Tutup tiket" : "Lihat tiket"}
            <ChevronDown className={cn("size-3.5 transition-transform duration-200 motion-reduce:transition-none", expanded && "rotate-180")} aria-hidden="true" />
          </CollapsibleTrigger>
        </div>
      </div>
      {/* Base UI mounts on opening and retains the children until the closing transition finishes. */}
      <CollapsibleContent className="technician-room-panel">
        <div className="border-t border-border/60 p-3"><ReportPage url={`/api/teknisi/reports?${query}`} hasFilters={status !== "semua"} /></div>
      </CollapsibleContent>
    </Collapsible>
  )
}
function Priorities({ status, showAll, onReset }: { status: string; showAll: () => void; onReset: () => void }) {
  const rooms = useOperationalResource<{ items: TechnicianRoomPriority[] }>(`/api/teknisi/priorities?status=${status}`)
  const hasFilters = status !== "semua"
  const empty = !rooms.loading && !rooms.error && rooms.data && !rooms.data.items.length
  return (
    <div className="space-y-4">
      <Feedback loading={rooms.loading} error={rooms.error} />
      {rooms.data?.items.length ? <>
        <p className="text-xs leading-relaxed text-muted-foreground">Prioritas berdasarkan jumlah tiket aktif per ruang, bukan tingkat risiko. Laporan dengan isian lainnya tersedia di Antrean laporan.</p>
        {rooms.data.items.map((room) => <PriorityRoomCard key={room.id} room={room} highest={rooms.data!.items[0]?.activeReports ?? 0} status={status} />)}
      </> : null}
      {empty ? <TechnicianEmptyState context="room-priority" filtered={hasFilters} action={
        <div className="flex flex-wrap justify-center gap-2">
          {hasFilters ? <Button type="button" variant="outline" size="sm" className="bg-card" onClick={onReset}><RotateCcw />Reset filter</Button> : null}
          <Button type="button" variant="outline" size="sm" className="bg-card" onClick={showAll}>Buka antrean<ArrowRight /></Button>
        </div>
      } /> : null}
    </div>
  )
}

function NotificationReport({ ticket }: { ticket: string }) {
  const detail = useOperationalResource<TechnicianDetail>(`/api/teknisi/reports/${encodeURIComponent(ticket)}`)
  const openReport = useContext(ReportContext)
  const container = useRef<HTMLDivElement>(null)
  const opened = useRef<string | undefined>(undefined)
  useEffect(() => {
    if (!detail.data || opened.current === ticket || detail.data.report.ticket !== ticket) return
    const trigger = container.current?.querySelector<HTMLButtonElement>("[data-report-detail]")
    if (trigger && openReport) { opened.current = ticket; openReport(detail.data.report, trigger) }
  }, [detail.data, openReport, ticket])
  return <div ref={container} className="space-y-2"><Feedback loading={detail.loading} error={detail.error} />{detail.data ? <FacilityReportRow report={detail.data.report} /> : null}</div>
}

export function TeknisiFacilityReportList({ initialView = "priority", ticket, history = false }: { initialView?: ReportView; ticket?: string; history?: boolean }) {
  const router = useRouter()
  const { notify } = useActivityNotifications()
  const [revision, setRevision] = useState(0)
  const [view, setView] = useState<ReportView>(initialView)
  const [status, setStatus] = useState(history ? "selesai" : "semua")
  const [query, setQuery] = useState("")
  const [period, setPeriod] = useState("semua")
  const [sort, setSort] = useState("terbaru")
  const [selectedReport, setSelectedReport] = useState<TechnicianFacilityReport | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [openCycle, setOpenCycle] = useState(0)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const busy = useRef(false)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const workspace = useRef<HTMLDivElement>(null)
  const queueTab = useRef<HTMLButtonElement>(null)
  const search = useDebouncedOperationalQuery(query)
  const params = new URLSearchParams({ q: search, status, period, sort })
  if (!history) params.set("active", "1")
  const hasFilters = Boolean(search.trim() || status !== (history ? "selesai" : "semua") || period !== "semua")
  function resetFilters() { setQuery(""); setStatus(history ? "selesai" : "semua"); setPeriod("semua"); setSort("terbaru") }
  function changeView(value: unknown) {
    if (value !== "priority" && value !== "queue") return
    setView(value)
    // Keep refreshes and copied links on the selected tab without another server request.
    const url = new URL(window.location.href)
    url.searchParams.set("view", value)
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
  }
  function retry() { setRevision((value) => value + 1) }
  function openReport(report: TechnicianFacilityReport, element: HTMLButtonElement) { trigger.current = element; setSelectedReport(report); setError(""); setOpenCycle((value) => value + 1); setDetailOpen(true) }
  function restoreFocus() { return trigger.current?.isConnected ? trigger.current : workspace.current?.querySelector<HTMLButtonElement>(`[data-report-detail="${selectedReport?.id}"]`) ?? workspace.current ?? true }
  async function execute(command: TechnicianCommand) {
    if (busy.current) return false
    busy.current = true; setPending(true); setError("")
    try {
      const response = await fetch("/api/teknisi/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Perubahan belum berhasil disimpan.")
      retry(); router.refresh()
      notify({ title: "Status laporan diperbarui", description: `${command.ticket}: perubahan tersimpan dan pelapor diberi notifikasi.`, tone: "success" })
      return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Koneksi bermasalah."
      setError(message); retry()
      notify({ title: "Perubahan belum terkonfirmasi", description: message, tone: "warning" })
      return false
    } finally { busy.current = false; setPending(false) }
  }
  const statusOptions = history
    ? [{ value: "selesai", label: "Selesai" }, { value: "ditolak", label: "Ditolak" }]
    : [{ value: "semua", label: "Semua status" }, ...activeStatuses.map((value) => ({ value, label: statusLabels[value] }))]
  const statusControl = (
    <Select value={status} items={statusOptions} onValueChange={(value) => setStatus(value as string)}>
      <SelectTrigger className="w-full bg-background sm:w-40" aria-label="Status laporan"><SelectValue /></SelectTrigger>
      <SelectContent>{statusOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
    </Select>
  )
  const listFilters = (
    <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center">
      <div className="relative min-w-0 flex-1">
        <Search className="pointer-events-none absolute top-2.5 left-3 size-4 text-muted-foreground" aria-hidden="true" />
        <Input className={cn("pl-9", history && "bg-background")} aria-label="Cari tiket, fasilitas, atau lokasi" placeholder="Cari tiket, fasilitas, atau lokasi" maxLength={200} value={query} onChange={(event) => setQuery(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        {history ? statusControl : null}
        <Select value={period} items={periodOptions} onValueChange={(value) => setPeriod(value as string)}>
          <SelectTrigger className="w-full bg-background sm:w-40" aria-label={history ? status === "ditolak" ? "Periode penolakan" : "Periode penyelesaian" : "Periode pengiriman"}><SelectValue /></SelectTrigger>
          <SelectContent>{periodOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={sort} items={sortOptions} onValueChange={(value) => setSort(value as string)}>
          <SelectTrigger className="w-full bg-background sm:w-32" aria-label="Urutan laporan"><SelectValue /></SelectTrigger>
          <SelectContent>{sortOptions.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </div>
  )
  return <OperationalRefreshContext.Provider value={revision}><RetryContext.Provider value={retry}><ReportContext.Provider value={openReport}><div ref={workspace} tabIndex={-1} className="space-y-4">
    {ticket ? <NotificationReport ticket={ticket} /> : null}
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ClipboardList className="size-4 text-primary" aria-hidden="true" />{history ? "Arsip penanganan fasilitas" : "Manajemen laporan fasilitas"}</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardContent className="space-y-4 p-4 md:p-5">
          {history ? <>
            {listFilters}
            <ReportPage url={`/api/teknisi/history?${params}`} emptyContext="history" hasFilters={hasFilters} onReset={resetFilters} />
          </> : (
            <Tabs value={view} onValueChange={changeView}>
              <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
                <TabsList aria-label="Tampilan laporan fasilitas">
                  <TabsTrigger value="priority" className={workspaceTabClassName}><Layers3 className="size-3.5" aria-hidden="true" />Prioritas ruang</TabsTrigger>
                  <TabsTrigger ref={queueTab} value="queue" className={workspaceTabClassName}><ListTodo className="size-3.5" aria-hidden="true" />Antrean laporan</TabsTrigger>
                </TabsList>
                {statusControl}
              </div>
              <TabsContent value="priority"><Priorities status={status} showAll={() => { changeView("queue"); queueTab.current?.focus() }} onReset={() => setStatus("semua")} /></TabsContent>
              <TabsContent value="queue" className="space-y-4">
                {listFilters}
                <ReportPage url={`/api/teknisi/reports?${params}`} emptyContext="reports" hasFilters={hasFilters} onReset={resetFilters} />
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </div>
    </Card>
    {/* Workspace owns the only detail modal, so list refreshes cannot unmount it. */}
    {selectedReport ? <TechnicianReportDetailDialog key={`${selectedReport.id}:${openCycle}`} report={selectedReport} open={detailOpen} onOpenChange={setDetailOpen} finalFocus={restoreFocus} onCommand={execute} pending={pending} error={error} onRetry={retry} /> : null}
  </div></ReportContext.Provider></RetryContext.Provider></OperationalRefreshContext.Provider>
}
