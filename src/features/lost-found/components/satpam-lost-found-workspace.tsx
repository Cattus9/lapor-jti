"use client"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.

import Image from "next/image"
import { createContext, useContext, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  Eye,
  FileText,
  Handshake,
  ImageIcon,
  Inbox,
  MapPin,
  PackageSearch,
  Paperclip,
  RotateCcw,
  Search,
  SearchCheck,
  SlidersHorizontal,
} from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import type { SatpamDetail, SatpamLostFoundReport, SatpamPendingHandover, SatpamReportKind, SatpamReportPeriod, SatpamReportSort, SatpamReportStatus, SatpamWorkspaceData, SecurityOfficer } from "../types"
import { satpamReportPeriods, satpamReportSorts } from "../domain/satpam-list-filters"
import { SatpamRefreshContext, useSatpamPage, useSatpamResource, useDebouncedSatpamQuery } from "./use-satpam-data"
import { SatpamPageFeedback } from "./satpam-page-feedback"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { statusLabels, type ReportStatus } from "../../reports/domain/report"
import type { CurrentUser } from "@/lib/auth/current-user"
import { cn } from "cn"

const lifecycle = ["Baru", "Diverifikasi", "Diproses", "Barang teridentifikasi", "Diserahkan", "Selesai"] as const
const statusOptions = [...lifecycle, "Ditolak"] as const
// Scoped to this workspace; other consumers of the shared Tabs primitive stay unchanged.
const workspaceTabClassName = "group/workspace-tab data-active:bg-accent data-active:text-accent-foreground data-active:font-semibold data-active:shadow-none data-active:inset-ring data-active:inset-ring-primary/25"
const workspaceTabCountClassName = "rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground group-data-active/workspace-tab:bg-primary/10 group-data-active/workspace-tab:text-accent-foreground"

type StatusHistoryItem = {
  status: SatpamReportStatus
  actor: string
  timestamp: string
  note?: string
}

type MatchedPair = SatpamPendingHandover

const statusActions: Partial<Record<SatpamReportStatus, { label: string; nextStatus: SatpamReportStatus; description: string }>> = {
  Diverifikasi: { label: "Mulai penanganan", nextStatus: "Diproses", description: "Tandai laporan setelah proses pencarian atau pemeriksaan dimulai." },
  Diserahkan: { label: "Selesaikan laporan", nextStatus: "Selesai", description: "Tutup tiket setelah penyerahan tercatat dan tidak ada tindak lanjut." },
}

const tabMeta: Record<SatpamReportKind, { label: string; description: string }> = {
  kehilangan: { label: "Kehilangan", description: "Laporan barang hilang dari pelapor." },
  temuan: { label: "Temuan", description: "Barang yang ditemukan dan dititipkan kepada Satpam." },
}

function statusStep(status: SatpamReportStatus) {
  return lifecycle.indexOf(status as (typeof lifecycle)[number])
}

function StatusBadge({ status }: { status: SatpamReportStatus }) {
  return <SharedStatusBadge status={status} />
}

function ReportStepper({ status }: { status: SatpamReportStatus }) {
  const activeStep = statusStep(status)

  if (status === "Ditolak") {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Laporan ditolak karena informasi yang diberikan tidak dapat diverifikasi.</div>
  }

  return (
    <div className="overflow-x-auto pb-1" aria-label="Tahapan penanganan laporan">
      <div className="flex min-w-[32rem] items-start">
        {lifecycle.map((step, index) => {
          const completed = index < activeStep
          const current = index === activeStep

          return (
            <div key={step} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className={cn("flex size-7 items-center justify-center rounded-full border text-xs", completed || current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground", current && "ring-3 ring-primary/15")}>
                  {completed ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn("text-center text-[11px] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{step}</span>
              </div>
              {index < lifecycle.length - 1 ? <span className={cn("mt-3.5 h-px flex-1", index < activeStep ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusActionPanel({
  report,
  onStatusChange,
  onOpenMatching,
  onOpenHandover,
}: {
  report: SatpamLostFoundReport
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => Promise<boolean>
  onOpenMatching: () => void
  onOpenHandover?: () => void
}) {
  const [decision, setDecision] = useState<"accept" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
  const [pending, setPending] = useState(false)
  const [actionError, setActionError] = useState("")
  async function change(status: SatpamReportStatus, note?: string) {
    if (pending) return false
    setPending(true); setActionError("")
    try { const ok = await onStatusChange(report.ticket, status, note); if (!ok) setActionError("Aksi belum berhasil. Periksa pesan kesalahan dan coba kembali."); return ok }
    finally { setPending(false) }
  }
  const action = statusActions[report.status]

  function closeDecision() {
    setDecision(null)
    setRejectionReason("")
  }

  if (report.status === "Ditolak") {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4"><p className="text-sm font-medium text-destructive">Laporan ditolak</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tidak ada tindakan lanjutan yang dapat dilakukan pada tiket ini.</p></div>
  }

  if (report.status === "Selesai") {
    return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Laporan selesai</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tiket telah ditutup dan dapat dilihat kembali pada Riwayat.</p></div>
  }

  if (report.status === "Diproses") {
    return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary"><ArrowLeftRight className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">Lanjutkan melalui pencocokan barang</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Periksa ciri barang, lokasi, dan waktu pada kedua laporan. Konfirmasi pencocokan setelah hasil pemeriksaan sesuai.</p></div></div><div className="mt-4 flex justify-end"><Button type="button" className="shrink-0" onClick={onOpenMatching}><ArrowLeftRight />Buka pencocokan</Button></div></div>
  }

  if (report.status === "Barang teridentifikasi") {
    return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><p className="text-sm font-medium text-foreground">Menunggu penyerahan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Pasangan laporan ini siap ditindaklanjuti di tab Penyerahan.</p><div className="mt-4 flex justify-end"><Button type="button" onClick={onOpenHandover ?? onOpenMatching}><Handshake />Buka penyerahan</Button></div></div>
  }

  if (report.status === "Baru") {
    return <>
      <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
        <p className="text-sm font-medium text-foreground">Tinjau laporan</p>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">Periksa informasi dan ciri barang sebelum memutuskan.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button type="button" disabled={pending} onClick={() => setDecision("accept")}>Terima laporan</Button>
          <Button type="button" variant="outline" className="bg-card text-destructive hover:text-destructive" disabled={pending} onClick={() => setDecision("reject")}>Tolak laporan</Button>
        </div>
      </div>
      <Dialog open={decision !== null} onOpenChange={(open) => { if (!open) closeDecision() }}>
        <DialogContent className="z-[80] max-w-md" overlayClassName="z-[70] bg-foreground/30 backdrop-blur-sm dark:bg-background/65" showNestedBackdrop>
          <div className="space-y-5 p-5 pr-14 md:p-6 md:pr-16">
            <div>
              <DialogTitle>{decision === "reject" ? "Tolak laporan ini?" : "Terima laporan ini?"}</DialogTitle>
              <DialogDescription className="mt-2">{decision === "reject" ? `Laporan ${report.title} tidak akan dilanjutkan. Berikan alasan agar keputusan ini jelas.` : `Laporan ${report.title} akan masuk tahap Diverifikasi.`}</DialogDescription>
            </div>
            {decision === "reject" ? <div className="space-y-2"><Label htmlFor={`rejection-reason-${report.ticket}`}>Alasan penolakan</Label><Textarea id={`rejection-reason-${report.ticket}`} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Jelaskan alasan laporan tidak dapat diterima" required /></div> : null}
            <FieldError>{actionError}</FieldError>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="outline" onClick={closeDecision}>Batal</Button>
              {decision === "reject" ? <Button type="button" variant="destructive" disabled={!rejectionReason.trim() || pending} onClick={async () => { if (await change("Ditolak", rejectionReason.trim())) closeDecision() }}>Ya, tolak laporan</Button> : <Button type="button" disabled={pending} onClick={async () => { if (await change("Diverifikasi")) closeDecision() }}>Ya, terima laporan</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  }

  if (!action) return null

  return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Aksi penanganan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action.description}</p><FieldError>{actionError}</FieldError><div className="mt-4"><Button type="button" disabled={pending} onClick={() => void change(action.nextStatus)}>{action.label}</Button></div></div>
}

function StatusActivity({ activities }: { activities: StatusHistoryItem[] }) {
  return <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold text-foreground">Riwayat status</h3><div className="mt-3 space-y-2">{[...activities].reverse().map((activity, index) => <div key={`${activity.status}-${activity.timestamp}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><StatusBadge status={activity.status} /><span className="text-xs text-muted-foreground">{activity.timestamp}</span></div><p className="mt-1 text-xs text-muted-foreground">Oleh {activity.actor}{activity.note ? ` · ${activity.note}` : ""}</p></div></div>)}</div></section>
}

const ReportDetailContext = createContext<((report: SatpamLostFoundReport, trigger: HTMLButtonElement) => void) | null>(null)

function ReportDetailTrigger({ report, compact = false }: { report: SatpamLostFoundReport; compact?: boolean }) {
  const openReport = useContext(ReportDetailContext)
  return <Button type="button" variant={compact ? "outline" : "default"} size="sm" className={cn("shrink-0 gap-1.5", compact && "bg-card hover:bg-muted")} aria-haspopup="dialog" data-report-detail={report.id} onClick={(event) => openReport?.(report, event.currentTarget)}>
    {compact ? <><Eye className="size-3.5" aria-hidden="true" /><span>Detail</span></> : "Lihat detail"}
  </Button>
}

function ReportDetailDialog({
  report: sourceReport,
  open,
  onOpenChange,
  finalFocus,
  onStatusChange,
  onOpenMatching,
  onOpenHandover,
}: {
  report: SatpamLostFoundReport
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus: () => HTMLElement | true
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => Promise<boolean>
  onOpenMatching: () => void
  onOpenHandover?: () => void
}) {
  const isFound = sourceReport.kind === "temuan"
  const detail = useSatpamResource<SatpamDetail>(open ? `/api/satpam/reports/${sourceReport.ticket}` : undefined, { keepPreviousData: true })
  const report = detail.data?.report ?? sourceReport

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={finalFocus}>
        <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
              {isFound ? <Inbox className="size-4" aria-hidden="true" /> : <PackageSearch className="size-4" aria-hidden="true" />}
            </span>
            <span>{tabMeta[report.kind].label}</span>
            <span aria-hidden="true">·</span>
            <span>{report.ticket}</span>
            <StatusBadge status={report.status} />
          </div>
          <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{report.title}</DialogTitle>
          <DialogDescription className="mt-2">Diperbarui {report.updatedAt}. Tinjau informasi sebelum melanjutkan penanganan.</DialogDescription>
        </div>
        <div className="space-y-6 p-5 md:p-6">
          <section>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-foreground">Progres penanganan</p>
                <p className="mt-1 text-xs text-muted-foreground">{report.status === "Ditolak" ? "Tidak melanjutkan lifecycle" : `Tahap ${statusStep(report.status) + 1} dari ${lifecycle.length}`}</p>
              </div>
              <StatusBadge status={report.status} />
            </div>
            <div className="mt-5"><ReportStepper status={report.status} /></div>
          </section>
          <SatpamPageFeedback loading={detail.loading} error={detail.error} />
          {detail.data ? <fieldset disabled={detail.loading || Boolean(detail.error)}><StatusActionPanel report={report} onStatusChange={onStatusChange} onOpenMatching={() => { onOpenChange(false); onOpenMatching() }} onOpenHandover={onOpenHandover ? () => { onOpenChange(false); onOpenHandover() } : undefined} /></fieldset> : null}
          <section className="border-t border-border/60 pt-6">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><FileText className="size-4" aria-hidden="true" /></span>
              <div><h3 className="text-sm font-semibold text-foreground">Detail laporan</h3><p className="mt-0.5 text-xs text-muted-foreground">Informasi yang dikirimkan oleh pelapor atau penemu.</p></div>
            </div>
            <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
              <div className="border-b border-border/60 p-4 sm:border-r"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />Tanggal kejadian</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.eventDate}</dd></div>
              <div className="border-b border-border/60 p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Waktu kejadian</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.eventTime}</dd></div>
              <div className="p-4 sm:col-span-2"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />Lokasi</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.location}</dd></div>
            </dl>
            <dl className="mt-3 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
              <div className="border-b border-border/60 p-4 sm:border-b-0 sm:border-r"><dt className="text-xs text-muted-foreground">Pelapor / penemu</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.reporter}</dd></div>
              <div className="p-4"><dt className="text-xs text-muted-foreground">Ciri-ciri barang</dt><dd className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">{report.characteristics}</dd></div>
            </dl>
            <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4"><p className="text-xs text-muted-foreground">Kronologi</p><p className="mt-1.5 text-sm leading-relaxed text-foreground">{report.description}</p></div>
          </section>
          <section className="border-t border-border/60 pt-6">
            <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Paperclip className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-foreground">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung.</p></div></div>
            <div className="mt-4 flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">{report.photoUrl ? <ReportPhotoThumbnail key={report.photoUrl} report={report} /> : <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ImageIcon className="size-5" aria-hidden="true" /></span>}<div><p className="text-sm font-medium text-foreground">{report.attachments ? `${report.attachments} lampiran tersedia` : "Tidak ada lampiran"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.photoUrl ? "Foto barang ditampilkan sebagai pratinjau." : report.attachments ? "Pratinjau file belum tersedia." : "Pelapor tidak menambahkan foto atau dokumen pendukung."}</p></div></div>
          {detail.data?.files.length ? <div className="mt-3 flex flex-wrap gap-2">{detail.data.files.map((file) => <Button key={file.id} variant="outline" size="sm" nativeButton={false} render={<a href={file.url} target="_blank" rel="noopener noreferrer" />}><Paperclip />{file.name}</Button>)}</div> : null}
          </section>
          <StatusActivity activities={detail.data?.history ?? []} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportList({ kind }: { kind: SatpamReportKind }) {
  const id = useId()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"semua" | SatpamReportStatus>("semua")
  const [period, setPeriod] = useState<SatpamReportPeriod>("semua")
  const [sort, setSort] = useState<SatpamReportSort>("terbaru")
  const meta = tabMeta[kind]
  const search = useDebouncedSatpamQuery(query)
  const canonical = status === "semua" ? "semua" : Object.entries(statusLabels).find(([, label]) => label === status)?.[0] ?? "semua"
  const page = useSatpamPage<SatpamLostFoundReport>(`/api/satpam/reports?kind=${kind}&status=${canonical}&period=${period}&sort=${sort}&q=${encodeURIComponent(search)}`)
  const reports = page.items
  const activeFilterCount = Number(status !== "semua") + Number(period !== "semua")

  return (
    <div className="space-y-4">
      <div className="border-b border-border/60 pb-3">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_auto_9rem]">
          <Field className="col-span-2 min-w-0 sm:col-span-1">
            <FieldLabel htmlFor={`${id}-search`} className="sr-only">Pencarian laporan</FieldLabel>
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id={`${id}-search`} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} className="h-9 bg-background pl-9" placeholder="Cari tiket, barang, atau lokasi" aria-label={`Cari laporan ${meta.label.toLocaleLowerCase()}`} /></div>
          </Field>
          <Popover>
            <PopoverTrigger render={<Button type="button" variant="outline" aria-label={`Filter laporan ${meta.label.toLocaleLowerCase()}${activeFilterCount ? `, ${activeFilterCount} filter aktif` : ""}`} className={cn("h-9 bg-background", activeFilterCount > 0 && "border-primary/25 bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground")} />}>
              <SlidersHorizontal aria-hidden="true" />Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </PopoverTrigger>
            <PopoverContent align="end" aria-labelledby={`${id}-filter-title`} className="w-72 max-w-[calc(100vw-2rem)] space-y-4 p-4">
              <h3 id={`${id}-filter-title`} className="text-sm font-semibold">Filter laporan</h3>
              <Field className="min-w-0">
                <FieldLabel htmlFor={`${id}-status`} className="text-xs text-muted-foreground">Status</FieldLabel>
                <Select value={status} onValueChange={(value) => setStatus((value ?? "semua") as "semua" | SatpamReportStatus)}>
                  <SelectTrigger id={`${id}-status`} className="!h-9 w-full bg-background"><SelectValue className="min-w-0 truncate">{status === "semua" ? "Semua status" : status}</SelectValue></SelectTrigger>
                  <SelectContent matchTriggerWidth={false} className="min-w-52"><SelectItem value="semua">Semua status</SelectItem>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent>
                </Select>
              </Field>
              <Field className="min-w-0">
                <FieldLabel htmlFor={`${id}-period`} className="text-xs text-muted-foreground">Periode pengiriman</FieldLabel>
                <Select value={period} onValueChange={(value) => setPeriod((value ?? "semua") as SatpamReportPeriod)}>
                  <SelectTrigger id={`${id}-period`} aria-describedby={`${id}-period-description`} className="!h-9 w-full bg-background"><SelectValue className="min-w-0 truncate">{satpamReportPeriods[period]}</SelectValue></SelectTrigger>
                  <SelectContent matchTriggerWidth={false} className="min-w-44">{Object.entries(satpamReportPeriods).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
                <FieldDescription id={`${id}-period-description`}>Berdasarkan tanggal laporan dikirim (WIB).</FieldDescription>
              </Field>
              <div className="border-t border-border/60 pt-3">
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={!activeFilterCount} onClick={() => { setStatus("semua"); setPeriod("semua") }}><RotateCcw aria-hidden="true" />Reset filter</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Field className="min-w-0">
            <FieldLabel htmlFor={`${id}-sort`} className="sr-only">Urutan pengiriman laporan</FieldLabel>
            <Select value={sort} onValueChange={(value) => setSort((value ?? "terbaru") as SatpamReportSort)}>
              <SelectTrigger id={`${id}-sort`} className="!h-9 w-full bg-background"><SelectValue>{satpamReportSorts[sort]}</SelectValue></SelectTrigger>
              <SelectContent>{Object.entries(satpamReportSorts).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
            </Select>
          </Field>
        </div>
      </div>
      <p className="text-xs text-muted-foreground" role="status">{page.loading ? "Memuat laporan..." : page.error ? "Data belum tersedia" : `${page.total} laporan ditemukan`}</p>
      <SatpamPageFeedback loading={page.loading} error={page.error} nextCursor={page.nextCursor} loadMore={page.loadMore} />
      {reports.length ? <div className="space-y-3">{reports.map((report) => <ReportRow key={report.ticket} report={report} />)}</div> : !page.loading && !page.error ? <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><SearchCheck className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan yang sesuai</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci, status, atau periode untuk melihat laporan lainnya.</p></div> : null}
    </div>
  )
}

function ReportRow({ report }: { report: SatpamLostFoundReport }) {
  const isFound = report.kind === "temuan"

  return (
    <Card role="article" className="gap-0 border border-border bg-background/60 p-4 shadow-none ring-0 transition-colors hover:border-primary/40 md:p-5">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
        <ReportPhotoThumbnail key={report.photoUrl ?? "empty"} report={report} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground md:text-base">{report.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{report.ticket} · {report.reporter}</p>
            </div>
            <StatusBadge status={report.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground"><span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{report.location}</span></span><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />{report.eventDate}</span><span className="flex items-center gap-1.5"><Paperclip className="size-3.5 shrink-0" aria-hidden="true" />{report.attachments} lampiran</span></div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />Diperbarui {report.updatedAt}</span><Badge variant="outline" tone={isFound ? "cyan" : "violet"}>{isFound ? "Temuan" : "Kehilangan"}</Badge></div><ReportDetailTrigger report={report} /></div>
    </Card>
  )
}

function ReportPhotoThumbnail({ report, size = "default" }: { report: SatpamLostFoundReport; size?: "default" | "compact" | "large" }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasPreview = Boolean(report.photoUrl) && !imageFailed
  const thumbnailSize = size === "large" ? "size-28 sm:size-32" : size === "compact" ? "size-20" : "size-20 sm:size-24"

  return <div className={cn("relative flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-muted/40 text-center text-muted-foreground", thumbnailSize)}>{hasPreview ? <Image src={report.photoUrl!} alt={`Foto barang pada laporan ${report.title}`} fill sizes={size === "large" ? "(min-width: 640px) 128px, 112px" : size === "compact" ? "80px" : "(min-width: 640px) 96px, 80px"} className="object-cover" unoptimized onError={() => setImageFailed(true)} /> : <><ImageIcon className="size-5" aria-hidden="true" /><span className="px-1 text-[10px] leading-tight">{report.attachments > 0 ? "Pratinjau belum tersedia" : "Tidak ada foto"}</span></>}</div>
}

function HandoverDialog({ pair, officers, open, onOpenChange, onConfirm }: {
  pair: MatchedPair | null
  officers: SecurityOfficer[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (recipient: string, note: string, officerId: string, location: string) => Promise<boolean>
}) {
  const [recipient, setRecipient] = useState("")
  const [note, setNote] = useState("")
  const [officerId, setOfficerId] = useState("")
  const [location, setLocation] = useState("Pos Satpam Gedung JTI")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  if (!pair) return null
  const validOfficer = officers.some((officer) => officer.id === officerId)
  return <Dialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value) }}>
    <DialogContent>
      <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
        <DialogTitle className="text-xl leading-tight md:text-2xl">Konfirmasi penyerahan</DialogTitle>
        <DialogDescription className="mt-2">Catat penerima dan petugas sebelum kedua tiket menjadi Diserahkan.</DialogDescription>
      </div>
      <form className="space-y-5 p-5 md:p-6" aria-busy={pending} onSubmit={async (event) => {
        event.preventDefault()
        if (pending || !validOfficer || !recipient.trim() || !location.trim()) return
        setPending(true); setError("")
        try {
          if (await onConfirm(recipient.trim(), note.trim(), officerId, location.trim())) onOpenChange(false)
          else setError("Penyerahan belum berhasil. Periksa pesan kesalahan dan coba kembali.")
        } finally { setPending(false) }
      }}>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm"><p className="font-medium">{pair.title}</p><p className="mt-1 text-xs text-muted-foreground">{pair.lossTicket} / {pair.foundTicket}</p></div>
        <Field>
          <FieldLabel htmlFor="handover-officer">Petugas penanggung jawab</FieldLabel>
          <Select value={officerId || null} onValueChange={(value) => setOfficerId(value ?? "")} items={officers.map((officer) => ({ value: officer.id, label: officer.name }))} disabled={pending || !officers.length} required>
            <SelectTrigger id="handover-officer" className="h-9 w-full bg-background" aria-describedby="handover-officer-description"><SelectValue placeholder="Pilih petugas penyerahan" /></SelectTrigger>
            <SelectContent>{officers.map((officer) => <SelectItem key={officer.id} value={officer.id}>{officer.name}</SelectItem>)}</SelectContent>
          </Select>
          <FieldDescription id="handover-officer-description">{officers.length ? "Pilih petugas yang bertanggung jawab atas penyerahan ini." : "Belum ada petugas aktif. Hubungi pengelola untuk menyiapkan daftar petugas."}</FieldDescription>
        </Field>
        <Field><FieldLabel htmlFor="handover-recipient">Nama penerima</FieldLabel><Input id="handover-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-9 bg-background" maxLength={150} required disabled={pending} placeholder="Nama penerima barang" /></Field>
        <Field><FieldLabel htmlFor="handover-location">Lokasi penyerahan</FieldLabel><Input id="handover-location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-9 bg-background" maxLength={200} required disabled={pending} /></Field>
        <Field><FieldLabel htmlFor="handover-note">Catatan penyerahan (opsional)</FieldLabel><Textarea id="handover-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={pending} placeholder="Contoh: Identitas penerima telah diperiksa oleh petugas." /></Field>
        {error ? <FieldError>{error}</FieldError> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" disabled={pending || !validOfficer || !recipient.trim() || !location.trim()}><Handshake />{pending ? "Menyimpan..." : "Konfirmasi penyerahan"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}

function MatchingConfirmationDialog({
  loss,
  found,
  canValidate,
  open,
  onOpenChange,
  onConfirm,
}: {
  loss?: SatpamLostFoundReport
  found?: SatpamLostFoundReport
  canValidate: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => Promise<boolean>
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  if (!loss || !found) return null

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><BadgeCheck className="size-4" aria-hidden="true" /></span><span>Konfirmasi manual</span></div><DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">Catat kecocokan</DialogTitle><DialogDescription className="mt-2">Pastikan kedua laporan merujuk pada barang yang sama sebelum melanjutkan.</DialogDescription></div><div className="space-y-5 p-5 md:p-6"><div className="grid gap-3 md:grid-cols-2"><MatchPreviewCard label="Laporan kehilangan" report={loss} /><MatchPreviewCard label="Barang temuan" report={found} /></div><FieldError>{error}</FieldError><p className="text-xs leading-relaxed text-muted-foreground">{canValidate ? "Kedua tiket akan berstatus Barang teridentifikasi dan dapat dilanjutkan ke proses penyerahan." : "Kedua tiket harus berstatus Diproses sebelum kecocokan dapat dicatat."}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => onOpenChange(false)}>Kembali</Button><Button type="button" disabled={!canValidate || pending} onClick={async () => { if (pending) return; setPending(true); setError(""); try { if (!await onConfirm()) setError("Pencocokan belum berhasil. Periksa pesan kesalahan dan coba kembali.") } finally { setPending(false) } }}><BadgeCheck />Catat kecocokan</Button></div></div></DialogContent></Dialog>
}

function MatchPreviewCard({ label, report }: { label: string; report: SatpamLostFoundReport }) {
  return <section className="rounded-xl border border-border/60 bg-background/60 p-4"><div className="flex items-start gap-3"><ReportPhotoThumbnail report={report} size="large" /><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.ticket}</p><div className="mt-2"><StatusBadge status={report.status} /></div></div></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">Ciri barang</dt><dd className="mt-1 leading-relaxed text-foreground">{report.characteristics}</dd></div><div className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Lokasi</dt><dd className="mt-1 text-foreground">{report.location}</dd></div><div><dt className="text-muted-foreground">Waktu</dt><dd className="mt-1 text-foreground">{report.eventDate}, {report.eventTime}</dd></div></div></dl></section>
}

function MatchingWorkspace({
  onRecordMatch,
  onOpenHandover,
  pendingCount,
}: {
  onRecordMatch: (lossTicket: string, foundTicket: string) => Promise<boolean>
  onOpenHandover: () => void
  pendingCount: number
}) {
  const lostPage = useSatpamPage<SatpamLostFoundReport>("/api/satpam/reports?kind=kehilangan&matching=1")
  const foundPage = useSatpamPage<SatpamLostFoundReport>("/api/satpam/reports?kind=temuan&matching=1")
  const lostReports = lostPage.items
  const foundReports = foundPage.items
  const [selectedLost, setSelectedLost] = useState("")
  const [selectedFound, setSelectedFound] = useState("")
  const [matchingPreviewOpen, setMatchingPreviewOpen] = useState(false)
  const activeLossTicket = lostReports.some((report) => report.ticket === selectedLost) ? selectedLost : ""
  const activeFoundTicket = foundReports.some((report) => report.ticket === selectedFound) ? selectedFound : ""
  const loss = lostReports.find((report) => report.ticket === activeLossTicket)
  const found = foundReports.find((report) => report.ticket === activeFoundTicket)
  const canValidate = loss?.status === "Diproses" && found?.status === "Diproses"
  const hasSelectedPair = Boolean(loss && found)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="text-base font-semibold text-foreground">Pencocokan barang</h2><p className="mt-1 text-sm text-muted-foreground">Bandingkan laporan secara manual, lalu pilih pasangan yang sesuai.</p></div><div className="flex shrink-0 flex-col items-start gap-1.5 sm:items-end"><Button type="button" disabled={!canValidate} onClick={() => setMatchingPreviewOpen(true)}><BadgeCheck />Catat kecocokan</Button>{hasSelectedPair && !canValidate ? <p className="text-xs text-muted-foreground">Kedua laporan harus berstatus Diproses.</p> : null}</div></div>
      <div className="grid items-stretch gap-4 xl:grid-cols-2">
        <div className="space-y-3"><SatpamPageFeedback loading={lostPage.loading} error={lostPage.error} nextCursor={lostPage.nextCursor} loadMore={lostPage.loadMore} /><MatchingReportList title="Laporan kehilangan" reports={lostReports} selectedTicket={activeLossTicket} onSelect={(ticket) => { setSelectedLost(ticket); setMatchingPreviewOpen(false) }} /></div>
        <div className="space-y-3"><SatpamPageFeedback loading={foundPage.loading} error={foundPage.error} nextCursor={foundPage.nextCursor} loadMore={foundPage.loadMore} /><MatchingReportList title="Barang temuan" reports={foundReports} selectedTicket={activeFoundTicket} onSelect={(ticket) => { setSelectedFound(ticket); setMatchingPreviewOpen(false) }} /></div>
      </div>
      {pendingCount > 0 && <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2.5"><Handshake className="size-4 shrink-0 text-primary" aria-hidden="true" /><p className="text-sm text-foreground"><span className="font-medium">{pendingCount} pasangan</span> menunggu penyerahan</p></div><Button type="button" variant="outline" size="sm" className="bg-card" onClick={onOpenHandover}>Lihat penyerahan</Button></div>}
      <MatchingConfirmationDialog loss={loss} found={found} canValidate={canValidate} open={matchingPreviewOpen} onOpenChange={setMatchingPreviewOpen} onConfirm={async () => { if (!loss || !found || !canValidate) return false; const ok = await onRecordMatch(loss.ticket, found.ticket); if (ok) { setSelectedLost(""); setSelectedFound(""); setMatchingPreviewOpen(false) } return ok }} />
    </div>
  )
}

function HandoverWorkspace({ officers, onConfirmHandover }: {
  officers: SecurityOfficer[]
  onConfirmHandover: (pair: MatchedPair, recipient: string, note: string, officerId: string, location: string) => Promise<boolean>
}) {
  const page = useSatpamPage<MatchedPair>("/api/satpam/pending")
  const pendingPairs = page.items
  const [selectedPair, setSelectedPair] = useState<MatchedPair | null>(null)

  return (
    <div className="space-y-4">
      <div className="border-b border-border/60 pb-4">
        <h2 className="text-base font-semibold text-foreground">Menunggu penyerahan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Barang yang sudah dicocokkan dan siap diserahkan kepada pelapor.</p>
      </div>
      <p className="text-xs text-muted-foreground">{page.total} pasangan menunggu penyerahan</p>
      <SatpamPageFeedback loading={page.loading} error={page.error} nextCursor={page.nextCursor} loadMore={page.loadMore} />
      {pendingPairs.length ? (
        <div className="space-y-3">
          {pendingPairs.map((pair) => (
            <Card key={`${pair.lossTicket}-${pair.foundTicket}`} role="article" className="gap-0 rounded-xl border-border bg-background/60 p-4 shadow-none md:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-2xs"><Handshake className="size-5" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-foreground md:text-base">{pair.title}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">Pelapor kehilangan: {pair.reporter}</p>
                  </div>
                </div>
                <SharedStatusBadge status="Menunggu penyerahan" />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />Dicocokkan {pair.matchedAt}</span>
                <Button type="button" size="sm" onClick={() => setSelectedPair(pair)}><Handshake />Catat penyerahan</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : !page.loading && !page.error ? (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center">
          <Handshake className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">Belum ada barang yang menunggu</p>
          <p className="mt-1 text-xs text-muted-foreground">Pasangan yang dicatat akan muncul di sini.</p>
        </div>
      ) : null}
      <HandoverDialog key={selectedPair?.id ?? "closed"} officers={officers} pair={selectedPair} open={Boolean(selectedPair)} onOpenChange={(open) => { if (!open) setSelectedPair(null) }} onConfirm={async (recipient, note, officerId, location) => selectedPair ? onConfirmHandover(selectedPair, recipient, note, officerId, location) : false} />
    </div>
  )
}

function MatchingReportList({ title, reports, selectedTicket, onSelect }: { title: string; reports: SatpamLostFoundReport[]; selectedTicket: string; onSelect: (ticket: string) => void }) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/50 p-3.5">
      <div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-foreground">{title}</h3><span className="text-xs text-muted-foreground">{reports.length} laporan</span></div>
      <div className="mt-3 space-y-2">
        {reports.length === 0 ? <p className="flex min-h-28 items-center justify-center rounded-lg border border-dashed border-border p-3 text-center text-xs text-muted-foreground">Belum ada laporan aktif untuk dibandingkan.</p> : reports.map((report) => <article key={report.ticket} className={cn("flex min-h-28 items-center gap-2 rounded-xl border p-2.5 transition-colors", selectedTicket === report.ticket ? "border-primary bg-primary/5" : "border-border bg-card")}>
          <Button type="button" variant="ghost" className="h-auto min-w-0 flex-1 justify-start gap-3 rounded-lg p-0 text-left whitespace-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50" aria-pressed={selectedTicket === report.ticket} onClick={() => onSelect(report.ticket)}>
            <ReportPhotoThumbnail report={report} size="compact" />
            <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{report.title}</span><span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{report.ticket} · {report.location}</span></span>
            <StatusBadge status={report.status} />
          </Button>
          <ReportDetailTrigger report={report} compact />
        </article>)}
      </div>
    </section>
  )
}

function SatpamLostFoundContent({ user, data, ticket }: { user: CurrentUser; data: SatpamWorkspaceData; ticket?: string }) {
  const { notify } = useActivityNotifications()
  const router = useRouter()
  const [revision, setRevision] = useState(0)
  const busy = useRef(false)
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"kehilangan" | "temuan" | "pencocokan" | "penyerahan">("kehilangan")
  // Detail outlives list skeletons, pagination and removal from the current status filter.
  const [selectedReport, setSelectedReport] = useState<SatpamLostFoundReport | null>(null)
  const [detailOpen, setDetailOpen] = useState(false)
  const [detailOpenCycle, setDetailOpenCycle] = useState(0)
  const detailTrigger = useRef<HTMLButtonElement | null>(null)
  const workspace = useRef<HTMLDivElement | null>(null)
  const openReport = (report: SatpamLostFoundReport, trigger: HTMLButtonElement) => {
    detailTrigger.current = trigger
    setSelectedReport(report)
    setDetailOpenCycle((value) => value + 1)
    setDetailOpen(true)
  }
  const restoreDetailFocus = () => {
    if (detailTrigger.current?.isConnected) return detailTrigger.current
    return workspace.current?.querySelector<HTMLButtonElement>(`[data-report-detail="${selectedReport?.id}"]`)
      ?? workspace.current?.querySelector<HTMLButtonElement>('[role="tab"][aria-selected="true"]')
      ?? workspace.current ?? true
  }
  async function execute(command: unknown) {
    if (busy.current) return false
    busy.current = true; setError("")
    try {
      const response = await fetch("/api/satpam/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Aksi belum berhasil disimpan.")
      setRevision((value) => value + 1)
      router.refresh()
      notify({ title: "Penanganan laporan diperbarui", description: "Perubahan berhasil disimpan ke database.", tone: "success" })
      return true
    } catch (error) { setError(error instanceof Error ? error.message : "Koneksi bermasalah."); return false }
    finally { busy.current = false }
  }
  function updateStatus(ticket: string, status: SatpamReportStatus, note?: string) {
    const canonical = Object.entries(statusLabels).find(([, label]) => label === status)?.[0] as ReportStatus | undefined
    return execute({ type: "status", ticket, status: canonical, note })
  }
  const recordMatch = (lossTicket: string, foundTicket: string) => execute({ type: "match", lossTicket, foundTicket })
  const confirmHandover = (pair: MatchedPair, recipient: string, note: string, officerId: string, location: string) => execute({ type: "handover", matchId: pair.id, recipient, note, officerId, location })
  return <SatpamRefreshContext.Provider value={revision}><ReportDetailContext.Provider value={openReport}><div ref={workspace} tabIndex={-1} className="flex h-full min-h-0 min-w-0 flex-1 flex-col"><ContentShell>
    <PageHeader title="Kehilangan & Temuan" description={`Kelola laporan, pencocokan, dan penyerahan barang, ${user.name}.`} />
    {error ? <FieldError>{error}<Button type="button" variant="link" size="sm" onClick={() => { setRevision((value) => value + 1); router.refresh() }}>Muat ulang data</Button></FieldError> : null}
    {ticket ? <NotificationReport ticket={ticket} /> : null}
    <Card className="shrink-0 gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><Inbox className="size-4 text-primary" aria-hidden="true" />Kehilangan & Temuan</div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-4 md:p-5">
        <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as typeof activeTab)}>
          <TabsList aria-label="Navigasi kehilangan dan temuan" className="touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            <TabsTrigger value="kehilangan" className={workspaceTabClassName}>Kehilangan <span className={workspaceTabCountClassName}>{data.counts.lostReports}</span></TabsTrigger>
            <TabsTrigger value="temuan" className={workspaceTabClassName}>Temuan <span className={workspaceTabCountClassName}>{data.counts.foundReports}</span></TabsTrigger>
            <TabsTrigger value="pencocokan" className={workspaceTabClassName}><ArrowLeftRight className="size-3.5" aria-hidden="true" />Pencocokan</TabsTrigger>
            <TabsTrigger value="penyerahan" className={workspaceTabClassName}><Handshake className="size-3.5" aria-hidden="true" />Penyerahan <span className={workspaceTabCountClassName}>{data.pending.total}</span></TabsTrigger>
          </TabsList>
          <TabsContent value="kehilangan"><ReportList kind="kehilangan" /></TabsContent>
          <TabsContent value="temuan"><ReportList kind="temuan" /></TabsContent>
          <TabsContent value="pencocokan"><MatchingWorkspace onRecordMatch={recordMatch} onOpenHandover={() => setActiveTab("penyerahan")} pendingCount={data.pending.total} /></TabsContent>
          <TabsContent value="penyerahan"><HandoverWorkspace officers={data.officers} onConfirmHandover={confirmHandover} /></TabsContent>
        </Tabs>
      </CardContent></div>
    </Card>
    {selectedReport ? <ReportDetailDialog key={`${selectedReport.id}:${detailOpenCycle}`} report={selectedReport} open={detailOpen} onOpenChange={setDetailOpen} finalFocus={restoreDetailFocus} onStatusChange={updateStatus} onOpenMatching={() => setActiveTab("pencocokan")} onOpenHandover={() => setActiveTab("penyerahan")} /> : null}
  </ContentShell></div></ReportDetailContext.Provider></SatpamRefreshContext.Provider>
}

function NotificationReport({ ticket }: { ticket: string }) {
  const detail = useSatpamResource<SatpamDetail>(`/api/satpam/reports/${encodeURIComponent(ticket)}`)
  return <div className="space-y-3"><SatpamPageFeedback loading={detail.loading} error={detail.error} />{detail.data ? <ReportRow report={detail.data.report} /> : null}</div>
}

export function SatpamLostFoundWorkspace({ user, data, ticket }: { user: CurrentUser; data: SatpamWorkspaceData; ticket?: string }) {
  return <DashboardLayout role="satpam"><SatpamLostFoundContent user={user} data={data} ticket={ticket} /></DashboardLayout>
}
