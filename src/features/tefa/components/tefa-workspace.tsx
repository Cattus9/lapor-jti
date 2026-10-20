"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Archive, ArrowRight, ClipboardCheck, ClipboardList, Headphones, Inbox, TimerReset } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { OperationalRefreshContext, useDebouncedOperationalQuery, useOperationalPage, useOperationalResource } from "@/components/reports/use-operational-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { ConfigSelect, EmptyRows, OperationsStatus, SearchField } from "@/features/operations/components/operations-ui"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { ManagementCommand } from "@/features/management/domain/management"
import type { ManagementReport } from "@/features/management/types"
import type { TefaDashboard } from "../types"
import { TefaReportDetail } from "./tefa-report-detail"
import { TefaPanel } from "./tefa-ui"

export type TefaView = "dashboard" | "reports" | "history"
export function TefaWorkspace({ user, view, initialStatus = "all", initialTicket }: { user: CurrentUser; view: TefaView; initialStatus?: string; initialTicket?: string }) {
  const [revision, setRevision] = useState(0)
  return <DashboardLayout role="tefa" user={user}><OperationalRefreshContext.Provider value={revision}><TefaContent view={view} initialStatus={initialStatus} initialTicket={initialTicket} refresh={() => setRevision((value) => value + 1)} /></OperationalRefreshContext.Provider></DashboardLayout>
}

function TefaContent({ view, initialStatus, initialTicket, refresh }: { view: TefaView; initialStatus: string; initialTicket?: string; refresh: () => void }) {
  const [selected, setSelected] = useState<{ ticket: string; initial?: ManagementReport } | null>(() => initialTicket ? { ticket: initialTicket } : null)
  const [pending, setPending] = useState(false), [error, setError] = useState("")
  const busy = useRef(false), trigger = useRef<HTMLButtonElement | null>(null)
  const overview = useOperationalResource<TefaDashboard>("/api/tefa/dashboard", { keepPreviousData: true })
  function open(report: ManagementReport, button: HTMLButtonElement) { trigger.current = button; setError(""); setSelected({ ticket: report.ticket, initial: report }) }
  async function command(value: ManagementCommand) {
    if (busy.current) return false
    busy.current = true; setPending(true); setError("")
    try {
      const response = await fetch("/api/tefa/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Hasil perubahan belum dapat dipastikan. Muat ulang status sebelum mencoba lagi.")
      return true
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koneksi bermasalah."); return false }
    finally { busy.current = false; setPending(false); refresh() }
  }
  return <ContentShell><PageHeader title={view === "dashboard" ? "Ringkasan TEFA" : view === "history" ? "Riwayat Layanan JTI" : "Kelola Laporan Layanan JTI"} description="Pantau dan tindak lanjuti laporan layanan yang ditugaskan kepada TEFA." />
    <OperationsStatus loading={overview.loading && !overview.data} error={overview.error} retry={refresh} />
    {view === "dashboard" && overview.data ? <TefaOverview data={overview.data} onOpen={open} /> : null}
    {view !== "dashboard" ? <TefaReportList key={`${view}-${initialStatus}`} history={view === "history"} initialStatus={initialStatus} services={overview.data?.services ?? []} onOpen={open} refresh={refresh} /> : null}
    {selected ? <TefaReportDetail key={selected.ticket} ticket={selected.ticket} initialReport={selected.initial} pending={pending} error={error} onCommand={command} onRetry={refresh} onClose={() => { if (!busy.current) { setSelected(null); setError("") } }} finalFocus={() => trigger.current?.isConnected ? trigger.current : true} /> : null}
  </ContentShell>
}

export function TefaOverview({ data, onOpen }: { data: TefaDashboard; onOpen: (report: ManagementReport, button: HTMLButtonElement) => void }) {
  return <><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Laporan baru" value={data.newReports} icon={Inbox} detail="Perlu respons awal" detailValue={`${data.newReports} laporan`} href="/tefa/laporan?status=baru" /><KpiCard label="Sedang ditangani" value={data.inProgress} icon={TimerReset} iconTone="amber" detail="Dalam proses" detailValue={`${data.inProgress} laporan`} href="/tefa/laporan?status=diproses" /><KpiCard label="Selesai bulan ini" value={data.completedThisMonth} icon={ClipboardCheck} iconTone="green" detail="Waktu selesai (WIB)" detailValue={`${data.completedThisMonth} laporan`} href="/tefa/riwayat" /><KpiCard label="Layanan aktif" value={data.services.filter((service) => service.available).length} icon={Headphones} detail="Katalog layanan" detailValue="Ditugaskan ke TEFA" href="/tefa/laporan" /></div>
    <TefaPanel icon={ClipboardList} title="Laporan yang perlu ditinjau" description="Laporan aktif terlama didahulukan agar tidak terlewat." action={<Button size="sm" variant="outline" nativeButton={false} render={<Link href="/tefa/laporan" />}>Buka antrean<ArrowRight /></Button>}><div className="space-y-3">{data.queue.length ? data.queue.map((report) => <TefaReportRow key={report.id} report={report} onOpen={onOpen} />) : <EmptyRows>Tidak ada laporan yang perlu ditangani.</EmptyRows>}</div></TefaPanel>
    <TefaPanel icon={Headphones} title="Cakupan layanan TEFA" description="Katalog dan jumlah laporan aktif dibaca dari database."><div className="grid gap-3 sm:grid-cols-2">{data.services.map((service) => <div key={service.id} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Headphones className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{service.name}</p><p className="mt-1 text-xs text-muted-foreground">{service.activeReports} laporan aktif{!service.available ? ". Katalog tidak menerima laporan TEFA baru." : ""}</p></div></div>)}</div>{!data.services.length ? <EmptyRows>Belum ada layanan yang ditugaskan kepada TEFA.</EmptyRows> : null}</TefaPanel></>
}

function TefaReportList({ history, initialStatus, services, onOpen, refresh }: { history: boolean; initialStatus: string; services: TefaDashboard["services"]; onOpen: (report: ManagementReport, button: HTMLButtonElement) => void; refresh: () => void }) {
  const [query, setQuery] = useState(""), [serviceId, setServiceId] = useState("all"), [status, setStatus] = useState(initialStatus)
  const q = useDebouncedOperationalQuery(query)
  const params = new URLSearchParams({ view: history ? "history" : "reports", status: status === "all" ? "semua" : status, q })
  if (serviceId !== "all") params.set("serviceId", serviceId)
  const page = useOperationalPage<ManagementReport>(`/api/tefa/reports?${params}`)
  return <TefaPanel icon={history ? Archive : Inbox} title={history ? "Arsip penanganan" : "Antrean layanan"} description={history ? "Laporan yang selesai atau ditolak beserta catatan penanganannya." : "Cari laporan dan buka detail untuk meninjau kendalanya."}><div className="mb-5 flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row"><SearchField label="Cari judul, pelapor, atau layanan" value={query} onChange={setQuery} /><div className="grid gap-3 sm:grid-cols-2 lg:w-96"><ConfigSelect label="Filter layanan" value={serviceId} onChange={setServiceId} options={[{ value: "all", label: "Semua layanan" }, ...services.map((service) => ({ value: service.id, label: service.name }))]} /><ConfigSelect label="Filter status" value={status} onChange={setStatus} options={[{ value: "all", label: "Semua status" }, ...(history ? [{ value: "selesai", label: "Selesai" }, { value: "ditolak", label: "Ditolak" }] : [{ value: "baru", label: "Baru" }, { value: "diproses", label: "Diproses" }])]} /></div></div>
    <OperationsStatus loading={page.loading} error={page.error} retry={refresh} /><div className="space-y-3">{page.items.map((report) => <TefaReportRow key={report.id} report={report} onOpen={onOpen} />)}{!page.loading && !page.error && !page.items.length ? <EmptyRows>Tidak ada laporan yang sesuai filter.</EmptyRows> : null}</div>{page.nextCursor ? <div className="mt-4 flex justify-center"><Button variant="outline" disabled={page.loading || Boolean(page.error)} onClick={page.loadMore}>Muat 6 laporan berikutnya</Button></div> : null}<p className="mt-4 text-xs text-muted-foreground">{page.items.length} dari {page.total} laporan</p></TefaPanel>
}

function TefaReportRow({ report, onOpen }: { report: ManagementReport; onOpen: (report: ManagementReport, button: HTMLButtonElement) => void }) {
  return <div className="rounded-xl border border-border bg-background/30 p-4 transition-colors hover:border-primary/40 focus-within:border-primary/40 motion-reduce:transition-none"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-semibold">{report.title}</p><StatusBadge status={report.status} /></div><p className="mt-1 text-xs text-muted-foreground">{report.reporter}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="outline" tone="teal">{report.service}</Badge><span className="text-xs text-muted-foreground">Dikirim {report.submittedAt} WIB</span></div><div className="mt-4 flex justify-end border-t border-border/60 pt-3"><Button type="button" size="sm" variant="outline" className="border-primary/20 bg-primary/5 text-primary-action-hover hover:bg-primary/10 hover:text-primary-action-hover dark:text-primary dark:hover:text-primary" aria-haspopup="dialog" aria-label={`Lihat detail ${report.title}`} onClick={(event) => onOpen(report, event.currentTarget)}>Lihat detail<ArrowRight /></Button></div></div>
}
