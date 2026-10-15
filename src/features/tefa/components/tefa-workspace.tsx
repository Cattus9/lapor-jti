"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Archive, ArrowRight, BookOpen, ClipboardCheck, ClipboardList, FilePenLine, GraduationCap, Headphones, Inbox, MonitorPlay, TimerReset, type LucideIcon } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { ConfigSelect, EmptyRows, PageControls, SearchField } from "@/features/operations/components/operations-ui"
import type { CurrentUser } from "@/lib/auth/current-user"
import { filterTefaPreview, isTefaPreviewClosed, tefaPreviewServices, type TefaPreviewReport } from "../domain/tefa-preview"
import { TefaReportDetail } from "./tefa-report-detail"
import { useTefaPreview } from "./tefa-preview-provider"
import { formatTefaDate, TefaPanel, TefaPreviewNotice } from "./tefa-ui"

const serviceIcons: Record<typeof tefaPreviewServices[number], LucideIcon> = {
  "JTI E-Learning": MonitorPlay,
  "JTI Evaluasi Pembelajaran": GraduationCap,
  "JTI Ruang Baca": BookOpen,
  "JTI Surat": FilePenLine,
}
export type TefaView = "dashboard" | "reports" | "history"

export function TefaWorkspace({ user, view, initialStatus = "all" }: { user: CurrentUser; view: TefaView; initialStatus?: string }) {
  const { reports, reset } = useTefaPreview()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const trigger = useRef<HTMLButtonElement | null>(null)
  const selected = reports.find((report) => report.id === selectedId)
  const title = view === "dashboard" ? "Ringkasan TEFA" : view === "history" ? "Riwayat Layanan JTI" : "Kelola Laporan Layanan JTI"
  function open(report: TefaPreviewReport, button: HTMLButtonElement) { trigger.current = button; setSelectedId(report.id) }
  return <DashboardLayout role="tefa" user={user}><ContentShell><PageHeader title={title} description={view === "dashboard" ? `Selamat datang, ${user.name}. Ruang kerja penanganan kendala layanan JTI.` : view === "history" ? "Tinjau hasil penanganan dan catatan laporan yang telah ditutup." : "Tinjau kendala layanan dan catat tindak lanjutnya dalam satu tempat."} /><TefaPreviewNotice reset={() => { reset(); setSelectedId(null) }} />{view === "dashboard" ? <TefaOverview reports={reports} onOpen={open} /> : <TefaReportList key={`${view}-${initialStatus}`} reports={reports} history={view === "history"} initialStatus={initialStatus} onOpen={open} />}{selected ? <TefaReportDetail key={selected.id} report={selected} actor={user.name} onClose={() => setSelectedId(null)} finalFocus={() => trigger.current?.isConnected ? trigger.current : true} /> : null}</ContentShell></DashboardLayout>
}

export function TefaOverview({ reports, onOpen }: { reports: TefaPreviewReport[]; onOpen: (report: TefaPreviewReport, button: HTMLButtonElement) => void }) {
  const active = filterTefaPreview(reports, { history: false })
  const fresh = reports.filter((report) => report.status === "Baru").length
  const processing = reports.filter((report) => report.status === "Diproses").length
  const closed = reports.filter((report) => isTefaPreviewClosed(report.status)).length
  return <>
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><KpiCard label="Laporan baru" value={fresh} icon={Inbox} detail="Data contoh" detailValue="Perlu ditinjau" href="/tefa/laporan?status=Baru" /><KpiCard label="Sedang ditangani" value={processing} icon={TimerReset} iconTone="amber" detail="Data contoh" detailValue="Dalam proses" href="/tefa/laporan?status=Diproses" /><KpiCard label="Laporan ditutup" value={closed} icon={ClipboardCheck} iconTone="green" detail="Data contoh" detailValue="Selesai / ditolak" href="/tefa/riwayat" /><KpiCard label="Jenis layanan" value={tefaPreviewServices.length} icon={Headphones} detail="Cakupan pratinjau" detailValue="Layanan JTI" href="/tefa/laporan" /></div>
    <TefaPanel icon={ClipboardList} title="Laporan yang perlu ditinjau" description="Daftar singkat laporan aktif pada pratinjau TEFA." action={<Button size="sm" variant="outline" nativeButton={false} render={<Link href="/tefa/laporan" />}>Buka antrean<ArrowRight /></Button>}><div className="space-y-3">{active.length ? active.slice(0, 6).map((report) => <TefaReportRow key={report.id} report={report} onOpen={onOpen} />) : <EmptyRows>Seluruh laporan contoh telah ditutup. Lihat hasilnya pada Riwayat.</EmptyRows>}</div></TefaPanel>
    <TefaPanel icon={Headphones} title="Cakupan layanan TEFA" description="Fokus pada kendala penggunaan layanan JTI, bukan pengelolaan akun atau konfigurasi jurusan."><div className="grid gap-3 sm:grid-cols-2">{tefaPreviewServices.map((service) => { const Icon = serviceIcons[service]; const count = active.filter((report) => report.service === service).length; return <div key={service} className="flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-4"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium">{service}</p><p className="mt-1 text-xs text-muted-foreground">{count} laporan aktif pada contoh</p></div></div> })}</div></TefaPanel>
  </>
}

export function TefaReportList({ reports, history, initialStatus = "all", onOpen }: { reports: TefaPreviewReport[]; history: boolean; initialStatus?: string; onOpen: (report: TefaPreviewReport, button: HTMLButtonElement) => void }) {
  const [query, setQuery] = useState("")
  const [service, setService] = useState("all")
  const [status, setStatus] = useState(initialStatus)
  const [page, setPage] = useState(1)
  const statuses = history ? ["Selesai", "Ditolak"] : ["Baru", "Diproses"]
  const matching = filterTefaPreview(reports, { history, query, service, status })
  const pageSize = 6
  const currentPage = Math.min(page, Math.max(1, Math.ceil(matching.length / pageSize)))
  const items = matching.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const filtered = Boolean(query || service !== "all" || status !== "all")
  function clear() { setQuery(""); setService("all"); setStatus("all"); setPage(1) }
  return <TefaPanel icon={history ? Archive : Inbox} title={history ? "Arsip penanganan" : "Antrean layanan"} description={history ? "Laporan contoh yang selesai atau ditolak beserta catatannya." : "Cari laporan lalu buka detail untuk meninjau kendalanya."}>
    <div className="mb-5 flex flex-col gap-3 border-b border-border/60 pb-5 lg:flex-row"><SearchField label="Cari judul, pelapor, atau layanan" value={query} onChange={(value) => { setQuery(value); setPage(1) }} /><div className="grid gap-3 sm:grid-cols-2 lg:w-96"><ConfigSelect label="Filter layanan" value={service} onChange={(value) => { setService(value); setPage(1) }} options={[{ value: "all", label: "Semua layanan" }, ...tefaPreviewServices.map((value) => ({ value, label: value }))]} /><ConfigSelect label="Filter status" value={status} onChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: "all", label: "Semua status" }, ...statuses.map((value) => ({ value, label: value }))]} /></div></div>
    <div className="space-y-3">{items.length ? items.map((report) => <TefaReportRow key={report.id} report={report} onOpen={onOpen} />) : <EmptyRows><p>{filtered ? "Tidak ada laporan contoh yang sesuai filter." : history ? "Belum ada laporan contoh yang ditutup." : "Tidak ada antrean contoh yang perlu ditangani."}</p>{filtered ? <Button type="button" variant="outline" size="sm" className="mt-3" onClick={clear}>Hapus filter</Button> : null}</EmptyRows>}</div><PageControls page={currentPage} total={matching.length} size={pageSize} onChange={setPage} />
  </TefaPanel>
}

function TefaReportRow({ report, onOpen }: { report: TefaPreviewReport; onOpen: (report: TefaPreviewReport, button: HTMLButtonElement) => void }) {
  const Icon = serviceIcons[report.service]
  return <div className="rounded-xl border border-border bg-background/30 p-4 transition-colors hover:border-primary/40 focus-within:border-primary/40 motion-reduce:transition-none"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><p className="break-words text-sm font-semibold">{report.title}</p><StatusBadge status={report.status} /></div><p className="mt-1 text-xs text-muted-foreground">{report.reporter}</p><div className="mt-3 flex flex-wrap items-center gap-2"><Badge variant="outline" tone="teal">{report.service}</Badge><span className="text-xs text-muted-foreground">Dikirim {formatTefaDate(report.submittedAt)} WIB</span></div></div></div><div className="mt-4 flex justify-end border-t border-border/60 pt-3"><Button type="button" size="sm" variant="outline" className="border-primary/20 bg-primary/5 text-primary-action-hover hover:bg-primary/10 hover:text-primary-action-hover dark:text-primary dark:hover:text-primary" aria-haspopup="dialog" aria-label={`Lihat detail ${report.title}`} onClick={(event) => onOpen(report, event.currentTarget)}>Lihat detail<ArrowRight /></Button></div></div>
}
