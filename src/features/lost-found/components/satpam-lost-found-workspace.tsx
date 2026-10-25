"use client"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.

import Image from "next/image"
import Link from "next/link"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportAttachmentsEmptyState } from "@/components/reports/report-attachments-empty-state"
import { createContext, useContext, useEffect, useId, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import {
  ArrowLeftRight,
  ArrowRight,
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
  PackagePlus,
  PackageSearch,
  Paperclip,
  RotateCcw,
  Search,
  SearchCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react"
import { ReportDetailSection, ReportDetailTable } from "@/components/reports/report-detail-section"
import { RegisterInventoryDialog, InventoryDetailDialog } from "./satpam-inventory-workspace"
import type { InventoryItem } from "../domain/inventory"

import { ContentShell } from "@/components/layout/content-shell"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge"
import { Stepper } from "@/components/ui/stepper"
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
import { lifecycleByCategory, statusLabels, type ReportStatus } from "../../reports/domain/report"
import type { CurrentUser } from "@/lib/auth/current-user"
import { cn } from "cn"

const lifecycle = lifecycleByCategory["kehilangan-temuan"].map((status) => statusLabels[status] as SatpamReportStatus)
const statusOptions = [...lifecycle, "Ditolak"] as const
// Scoped to this workspace; other consumers of the shared Tabs primitive stay unchanged.
const workspaceTabClassName = "group/workspace-tab data-active:bg-accent data-active:text-accent-foreground data-active:font-semibold data-active:shadow-none data-active:inset-ring data-active:inset-ring-primary/25"
const workspaceTabCountClassName = "rounded-md bg-background px-1.5 py-0.5 text-xs text-muted-foreground group-data-active/workspace-tab:bg-primary/10 group-data-active/workspace-tab:text-accent-foreground"

type StatusHistoryItem = {
  status: SatpamReportStatus
  actor: string
  timestamp: string
  note?: string
}

type MatchedPair = SatpamPendingHandover

const statusActions: Partial<Record<SatpamReportStatus, { label: string; nextStatus: SatpamReportStatus; description: string }>> = {
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
  if (status === "Ditolak") {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Laporan ditolak. Lihat alasan pada riwayat status.</div>
  }

  return (
    <div className="overflow-x-auto rounded-md pb-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" role="region" tabIndex={0} aria-label="Tahapan penanganan laporan">
      <Stepper steps={lifecycle.map((label) => ({ value: label, label }))} value={status} variant="circles" className="min-w-lg" aria-label="Progres laporan" />
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
    return <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-3.5 sm:p-4"><p className="text-sm font-medium text-destructive">Laporan ditolak</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tidak ada tindakan lanjutan yang dapat dilakukan pada tiket ini.</p></div>
  }

  if (report.status === "Selesai") {
    return <div className="rounded-xl border border-border/60 bg-muted/50 p-3.5 sm:p-4"><p className="text-sm font-medium text-foreground">Laporan selesai</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tiket telah ditutup dan dapat dilihat kembali pada Riwayat.</p></div>
  }

  if (report.status === "Diproses") {
    if (report.kind === "temuan" && report.inventoryId) {
      return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Barang sudah tercatat di pos</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Lanjutkan pemeriksaan dan penyerahan melalui Inventaris.</p></div><Button nativeButton={false} render={<Link href="/satpam/inventaris" />}><PackagePlus aria-hidden="true" />Buka Inventaris</Button></div></div>
    }
    return <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary"><ArrowLeftRight className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-medium text-foreground">Lanjutkan melalui pencocokan barang</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Periksa ciri barang, lokasi, dan waktu pada kedua laporan. Konfirmasi pencocokan setelah hasil pemeriksaan sesuai.</p></div></div><Button type="button" className="shrink-0" onClick={onOpenMatching}><ArrowLeftRight />Buka pencocokan</Button></div></div>
  }

  if (report.status === "Barang teridentifikasi") {
    return <div className="rounded-xl border border-primary/20 bg-primary/5 p-3.5 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary"><Handshake className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="text-sm font-medium text-foreground">Menunggu penyerahan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pasangan laporan ini siap ditindaklanjuti di tab Penyerahan.</p></div></div><Button type="button" className="shrink-0" onClick={onOpenHandover ?? onOpenMatching}><Handshake />Buka penyerahan</Button></div></div>
  }

  if (report.status === "Baru") {
    return <>
      <div className="rounded-xl border border-border/60 bg-muted/50 p-3.5 sm:p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">Tindak lanjut laporan</p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Mulai pencarian atau pencocokan berdasarkan informasi laporan.</p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => setDecision("accept")}>Proses laporan</Button>
            <Button type="button" variant="outline" className="bg-card text-destructive hover:text-destructive" disabled={pending} onClick={() => setDecision("reject")}>Tolak laporan</Button>
          </div>
        </div>
      </div>
      <Dialog open={decision !== null} onOpenChange={(open) => { if (!open) closeDecision() }}>
        <DialogContent className="z-[80] max-w-md" overlayClassName="z-[70] bg-foreground/30 backdrop-blur-sm dark:bg-background/65" showNestedBackdrop>
          <div className="space-y-5 p-5 pr-14 md:p-6 md:pr-16">
            <div>
              <DialogTitle>{decision === "reject" ? "Tolak laporan ini?" : "Proses laporan ini?"}</DialogTitle>
              <DialogDescription className="mt-2">{decision === "reject" ? `Laporan ${report.title} tidak akan dilanjutkan. Berikan alasan agar keputusan ini jelas.` : `Status laporan ${report.title} akan menjadi Diproses. Ini belum mencatat barang fisik masuk ke pos.`}</DialogDescription>
            </div>
            {decision === "reject" ? <div className="space-y-2"><Label htmlFor={`rejection-reason-${report.ticket}`}>Alasan penolakan</Label><Textarea id={`rejection-reason-${report.ticket}`} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Jelaskan alasan laporan tidak dapat diterima" required /></div> : null}
            <FieldError>{actionError}</FieldError>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button disabled={pending} type="button" variant="outline" onClick={closeDecision}>Batal</Button>
              {decision === "reject" ? <Button type="button" variant="destructive" disabled={!rejectionReason.trim() || pending} onClick={async () => { if (await change("Ditolak", rejectionReason.trim())) closeDecision() }}>Ya, tolak laporan</Button> : <Button type="button" disabled={pending} onClick={async () => { if (await change("Diproses")) closeDecision() }}>Proses laporan</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  }

  if (!action) return null

  return <div className="rounded-xl border border-border/60 bg-muted/50 p-3.5 sm:p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="text-sm font-medium text-foreground">Aksi penanganan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{action.description}</p>{actionError ? <FieldError>{actionError}</FieldError> : null}</div><div className="shrink-0"><Button type="button" disabled={pending} onClick={() => void change(action.nextStatus)}>{action.label}</Button></div></div></div>
}

function StatusActivity({ activities }: { activities: StatusHistoryItem[] }) {
  return <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold text-foreground">Riwayat status</h3><div className="mt-3 space-y-2">{[...activities].reverse().map((activity, index) => <div key={`${activity.status}-${activity.timestamp}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><StatusBadge status={activity.status} /><span className="text-xs text-muted-foreground">{activity.timestamp}</span></div><p className="mt-1 text-xs text-muted-foreground">Oleh {activity.actor}{activity.note ? ` · ${activity.note}` : ""}</p></div></div>)}</div></section>
}

const ReportDetailContext = createContext<((report: SatpamLostFoundReport, trigger: HTMLButtonElement, selectTab?: boolean) => void) | null>(null)

function ReportDetailTrigger({ report, compact = false }: { report: SatpamLostFoundReport; compact?: boolean }) {
  const openReport = useContext(ReportDetailContext)
  return <Button type="button" variant={compact ? "soft" : "default"} size="sm" className="shrink-0 gap-1.5" aria-haspopup="dialog" data-report-detail={report.id} onClick={(event) => openReport?.(report, event.currentTarget)}>
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
  onReceived,
}: {
  report: SatpamLostFoundReport
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus: () => HTMLElement | true
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => Promise<boolean>
  onOpenMatching: () => void
  onOpenHandover?: () => void
  onReceived: () => void
}) {
  const [receiveOpen, setReceiveOpen] = useState(false)
  const isFound = sourceReport.kind === "temuan"
  const detail = useSatpamResource<SatpamDetail>(open ? `/api/satpam/reports/${sourceReport.ticket}` : undefined, { keepPreviousData: true })
  const report = detail.data?.report ?? sourceReport

  return (
    <OperationalReportDialog
      open={open}
      onOpenChange={onOpenChange}
      finalFocus={finalFocus}
      icon={isFound ? Inbox : PackageSearch}
      category={tabMeta[report.kind].label}
      submittedAt={report.submittedAt}
      status={report.status}
      title={report.title}
      updatedAt={report.updatedAt}
      action={<fieldset disabled={detail.loading || Boolean(detail.error)} className="space-y-3">
        <StatusActionPanel report={report} onStatusChange={onStatusChange} onOpenMatching={() => { onOpenChange(false); onOpenMatching() }} onOpenHandover={onOpenHandover ? () => { onOpenChange(false); onOpenHandover() } : undefined} />
        {isFound && !report.inventoryId && ["Baru", "Diproses"].includes(report.status) ? <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Barang sudah diserahkan ke pos?</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Catat langsung sebagai barang titipan di Inventaris.</p></div><Button type="button" variant="soft" aria-haspopup="dialog" onClick={() => setReceiveOpen(true)}><PackagePlus aria-hidden="true" />Catat barang di pos</Button></div> : null}
      </fieldset>}
    >
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
      {report.reporterContact ? <ReportDetailSection icon={UserRound} title="Pelapor langsung" description="Kontak disimpan privat untuk tindak lanjut Satpam."><ReportDetailTable rows={[{ icon: UserRound, label: "Nama pelapor", value: report.reporter }, { icon: UserRound, label: "Kontak", value: report.reporterContact }, { icon: UserRound, label: "Pencatat", value: report.recordedBy }]} /></ReportDetailSection> : null}
      <RegisterInventoryDialog open={receiveOpen} onOpenChange={setReceiveOpen} sourceFound={{ ticket: report.ticket, title: report.title, location: report.location, description: report.description }} onSuccess={() => { onReceived(); setReceiveOpen(false); onOpenChange(false); onOpenMatching() }} />
      <SatpamPageFeedback loading={detail.loading} error={detail.error} />
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
              <div className={cn("p-4", report.characteristics && report.characteristics !== report.description ? "border-b border-border/60 sm:border-b-0 sm:border-r" : "sm:col-span-2")}><dt className="text-xs text-muted-foreground">Pelapor / penemu</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.reporter}</dd></div>
              {report.characteristics && report.characteristics !== report.description ? <div className="p-4"><dt className="text-xs text-muted-foreground">Ciri barang</dt><dd className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">{report.characteristics}</dd></div> : null}
            </dl>
            <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4"><p className="text-xs text-muted-foreground">Deskripsi laporan</p><p className="mt-1.5 text-sm leading-relaxed text-foreground">{report.description}</p></div>
          </section>
          <section className="border-t border-border/60 pt-6">
            <div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Paperclip className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-foreground">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung.</p></div></div>
            {report.photoUrl || report.attachments ? <div className="mt-4 flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">{report.photoUrl ? <ReportPhotoThumbnail key={report.photoUrl} report={report} /> : <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ImageIcon className="size-5" aria-hidden="true" /></span>}<div><p className="text-sm font-medium text-foreground">{report.attachments ? `${report.attachments} lampiran tersedia` : "Tidak ada lampiran"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.photoUrl ? "Foto barang ditampilkan sebagai pratinjau." : "Pratinjau file belum tersedia."}</p></div></div> : <div className="mt-4"><ReportAttachmentsEmptyState /></div>}
          {detail.data?.files.length ? <div className="mt-3 flex flex-wrap gap-2">{detail.data.files.map((file) => <Button key={file.id} variant="outline" size="sm" nativeButton={false} render={<a href={file.url} target="_blank" rel="noopener noreferrer" />}><Paperclip />{file.name}</Button>)}</div> : null}
          </section>
          <StatusActivity activities={detail.data?.history ?? []} />
    </OperationalReportDialog>
  )
}

function ReportList({ kind }: { kind: SatpamReportKind }) {
  const id = useId()
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"aktif" | "semua" | SatpamReportStatus>("aktif")
  const [period, setPeriod] = useState<SatpamReportPeriod>("semua")
  const [sort, setSort] = useState<SatpamReportSort>("terbaru")
  const meta = tabMeta[kind]
  const search = useDebouncedSatpamQuery(query)
  const canonical = status === "aktif" ? "aktif" : status === "semua" ? "semua" : Object.entries(statusLabels).find(([, label]) => label === status)?.[0] ?? "aktif"
  const page = useSatpamPage<SatpamLostFoundReport>(`/api/satpam/reports?kind=${kind}&status=${canonical}&period=${period}&sort=${sort}&q=${encodeURIComponent(search)}`)
  const reports = page.items
  const activeFilterCount = Number(status !== "aktif") + Number(period !== "semua")

  return (
    <div className="space-y-4">
      <div className="border-b border-border/60 pb-3">
        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
          <Field className="min-w-0 w-full sm:w-auto sm:flex-1">
            <FieldLabel htmlFor={`${id}-search`} className="sr-only">Pencarian laporan</FieldLabel>
            <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input id={`${id}-search`} value={query} onChange={(event) => setQuery(event.target.value)} maxLength={200} className="h-9 bg-background pl-9" placeholder="Cari barang, deskripsi, atau lokasi" aria-label={`Cari laporan ${meta.label.toLocaleLowerCase()}`} /></div>
          </Field>
          <Popover>
            <PopoverTrigger render={<Button type="button" variant="outline" aria-label={`Filter laporan ${meta.label.toLocaleLowerCase()}${activeFilterCount ? `, ${activeFilterCount} filter aktif` : ""}`} className={cn("h-9 bg-background", activeFilterCount > 0 && "border-primary/25 bg-accent text-accent-foreground hover:bg-accent hover:text-accent-foreground aria-expanded:bg-accent aria-expanded:text-accent-foreground")} />}>
              <SlidersHorizontal aria-hidden="true" />Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}
            </PopoverTrigger>
            <PopoverContent align="end" aria-labelledby={`${id}-filter-title`} className="w-72 max-w-full space-y-4 p-4">
              <h3 id={`${id}-filter-title`} className="text-sm font-semibold">Filter laporan</h3>
              <Field className="min-w-0">
                <FieldLabel htmlFor={`${id}-status`} className="text-xs text-muted-foreground">Status</FieldLabel>
                <Select value={status} onValueChange={(value) => setStatus((value ?? "aktif") as "aktif" | "semua" | SatpamReportStatus)}>
                  <SelectTrigger id={`${id}-status`} className="!h-9 w-full bg-background"><SelectValue className="min-w-0 truncate">{status === "aktif" ? "Aktif (belum selesai)" : status === "semua" ? "Semua status" : status}</SelectValue></SelectTrigger>
                  <SelectContent matchTriggerWidth={false} className="min-w-52">
                    <SelectItem value="aktif">Aktif (belum selesai)</SelectItem>
                    <SelectItem value="semua">Semua status</SelectItem>
                    {statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}
                  </SelectContent>
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
                <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={!activeFilterCount} onClick={() => { setStatus("aktif"); setPeriod("semua") }}><RotateCcw aria-hidden="true" />Reset filter</Button>
              </div>
            </PopoverContent>
          </Popover>
          <Field className="min-w-0 w-auto flex-1 sm:w-36 sm:flex-none">
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
      <div className="flex gap-3 sm:gap-4">
        <ReportPhotoThumbnail key={report.photoUrl ?? "empty"} report={report} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="min-w-0">
              <h3 className="text-sm font-semibold text-foreground md:text-base">{report.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{report.reporter} · Dikirim {report.submittedAt} WIB</p>
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

  return <div className={cn("relative flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-muted/40 text-center text-muted-foreground", thumbnailSize)}>{hasPreview ? <Image src={report.photoUrl!} alt={`Foto barang pada laporan ${report.title}`} fill sizes={size === "large" ? "(min-width: 640px) 128px, 112px" : size === "compact" ? "80px" : "(min-width: 640px) 96px, 80px"} className="object-cover" unoptimized onError={() => setImageFailed(true)} /> : <><ImageIcon className="size-5" aria-hidden="true" /><span className="px-1 text-xs leading-tight">{report.attachments > 0 ? "Pratinjau belum tersedia" : "Tidak ada foto"}</span></>}</div>
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
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm"><p className="font-medium">{pair.title}</p><p className="mt-1 text-xs text-muted-foreground">Kehilangan dikirim {pair.lossSubmittedAt} WIB</p><p className="mt-1 text-xs text-muted-foreground">Temuan dikirim {pair.foundSubmittedAt} WIB</p></div>
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
  return <section className="rounded-xl border border-border/60 bg-background/60 p-4"><div className="flex items-start gap-3"><ReportPhotoThumbnail report={report} size="large" /><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">Dikirim {report.submittedAt} WIB</p><div className="mt-2"><StatusBadge status={report.status} /></div></div></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">Deskripsi barang</dt><dd className="mt-1 leading-relaxed whitespace-pre-wrap text-foreground">{report.description || report.characteristics}</dd></div><div className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Lokasi</dt><dd className="mt-1 text-foreground">{report.location}</dd></div><div><dt className="text-muted-foreground">Waktu</dt><dd className="mt-1 text-foreground">{report.eventDate}, {report.eventTime}</dd></div></div></dl></section>
}

function MatchingWorkspace({
  onRecordMatch,
  onOpenHandover,
  pendingCount,
  onRefresh,
}: {
  onRecordMatch: (lossTicket: string, foundTicket: string) => Promise<boolean>
  onOpenHandover: () => void
  pendingCount: number
  onRefresh?: () => void
}) {
  const lostPage = useSatpamPage<SatpamLostFoundReport>("/api/satpam/reports?kind=kehilangan&matching=1")
  const lostReports = lostPage.items

  const [inventoryRev, setInventoryRev] = useState(0)

  const [selectedLost, setSelectedLost] = useState("")
  const [selectedFound, setSelectedFound] = useState("")
  const [selectedInventoryId, setSelectedInventoryId] = useState("")
  const [matchingPreviewOpen, setMatchingPreviewOpen] = useState(false)

  // Candidate Search & Filter states
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebouncedSatpamQuery(searchQuery).toLowerCase().trim()
  const [sourceFilter, setSourceFilter] = useState<"semua" | "temuan" | "inventaris">("semua")
  const [statusFilter, setStatusFilter] = useState<"diproses" | "baru" | "semua">("diproses")
  const foundPage = useSatpamPage<SatpamLostFoundReport>(`/api/satpam/reports?kind=temuan&matching=1&q=${encodeURIComponent(debouncedSearch)}&status=${statusFilter}`)
  const foundReports = foundPage.items
  // Search/status belong in SQL so candidates beyond the first page remain discoverable.
  const inventoryParams = new URLSearchParams({ rev: String(inventoryRev), q: debouncedSearch, status: "tersimpan" })
  const inventoryResource = useSatpamPage<InventoryItem>(`/api/satpam/inventory?${inventoryParams}`)
  const inventoryItems = inventoryResource.items

  // Dialog states
  const [registerInventoryOpen, setRegisterInventoryOpen] = useState(false)
  const [selectedInventoryDetail, setSelectedInventoryDetail] = useState<InventoryItem | null>(null)
  const [inventoryDetailOpen, setInventoryDetailOpen] = useState(false)

  const activeLossTicket = lostReports.some((report) => report.ticket === selectedLost) ? selectedLost : ""
  const activeFoundTicket = foundReports.some((report) => report.ticket === selectedFound) ? selectedFound : ""
  const loss = lostReports.find((report) => report.ticket === activeLossTicket)
  const found = foundReports.find((report) => report.ticket === activeFoundTicket)
  const selectedInventoryItem = inventoryItems.find((item) => item.id === selectedInventoryId)

  const canValidate = Boolean(loss && found && loss.status === "Diproses" && found.status === "Diproses")
  const hasSelectedPair = Boolean(loss && (found || selectedInventoryItem))
  const reportNeedingAcceptance = loss && loss.status !== "Diproses" ? loss : found && found.status !== "Diproses" ? found : undefined

  // Filter temuan reports based on status filter and search query
  const filteredTemuanReports = foundReports.filter((report) => {
    if (sourceFilter === "inventaris") return false

    // Status filter:
    // Default is "diproses" (ready to match). User can select "baru" or "semua"
    if (statusFilter === "diproses" && report.status !== "Diproses") return false
    if (statusFilter === "baru" && report.status !== "Baru") return false

    // Query filter:
    if (debouncedSearch) {
      const matchTitle = report.title.toLowerCase().includes(debouncedSearch)
      const matchDesc = report.description.toLowerCase().includes(debouncedSearch)
      const matchChar = report.characteristics.toLowerCase().includes(debouncedSearch)
      const matchLoc = report.location.toLowerCase().includes(debouncedSearch)
      const matchTicket = report.ticket.toLowerCase().includes(debouncedSearch)
      if (!matchTitle && !matchDesc && !matchChar && !matchLoc && !matchTicket) return false
    }

    return true
  })

  // Filter inventory items based on status and search query
  const filteredInventoryItems = inventoryItems.filter((item) => {
    if (item.status !== "tersimpan") return false
    if (sourceFilter === "temuan") return false

    // If status filter is "baru", inventory items don't have "Baru" (they are accepted in pos)
    if (statusFilter === "baru") return false

    // If status filter is "diproses", show "tersimpan" (ready in pos)
    if (statusFilter === "diproses" && item.status !== "tersimpan") return false

    // Query filter:
    if (debouncedSearch) {
      const matchName = item.itemName.toLowerCase().includes(debouncedSearch)
      const matchDesc = item.description.toLowerCase().includes(debouncedSearch)
      const matchLoc = item.storageLocation.toLowerCase().includes(debouncedSearch)
      const matchFounder = (item.founderName ?? "").toLowerCase().includes(debouncedSearch)
      if (!matchName && !matchDesc && !matchLoc && !matchFounder) return false
    }

    return true
  })

  const totalCandidates = filteredTemuanReports.length + filteredInventoryItems.length

  function handleInventoryCreated(item: InventoryItem) {
    setInventoryRev((prev) => prev + 1)
    onRefresh?.()
    setSelectedInventoryId(item.id)
    setSelectedFound("")
    setRegisterInventoryOpen(false)
  }

  function handleInventoryItemUpdated(item: InventoryItem) {
    setInventoryRev((prev) => prev + 1)
    onRefresh?.()
    setSelectedInventoryDetail(item)
    if (item.status === "diserahkan") { setSelectedLost(""); setSelectedInventoryId("") }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-foreground">Cocokkan barang</h2>{!loss && !lostPage.loading && !lostPage.error && lostPage.total > 0 ? <Badge variant="secondary">{lostPage.total} laporan</Badge> : null}</div>
          {loss ? <p className="text-sm text-muted-foreground">Pilih barang yang sesuai dengan laporan kehilangan.</p> : lostReports.length ? <p className="text-sm text-muted-foreground">Pilih laporan kehilangan untuk melihat kandidat barang.</p> : null}
        </div>
        <Button type="button" className="self-start sm:self-auto" aria-haspopup="dialog" onClick={() => setRegisterInventoryOpen(true)}><PackagePlus aria-hidden="true" />Terima barang</Button>
      </div>

      {!loss ? (
        <section aria-label="Pilih laporan kehilangan" className="space-y-3">
          <SatpamPageFeedback
            loading={lostPage.loading}
            error={lostPage.error}
            nextCursor={lostPage.nextCursor}
            loadMore={lostPage.loadMore}
          />

          {lostReports.length === 0 && !lostPage.loading && !lostPage.error ? (
            <CollectionEmptyState icon={PackageSearch} title="Belum ada laporan untuk dicocokkan" description="Laporan kehilangan yang siap ditangani akan muncul di sini." size="compact" className="bg-background" />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {lostReports.map((report) => (
                <Card
                  key={report.ticket}
                  className="group flex flex-col gap-0 justify-between rounded-xl border border-border/70 bg-background p-3.5 shadow-xs transition-all duration-200 motion-safe:hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xs motion-reduce:transition-none cursor-pointer"
                  onClick={() => {
                    setSelectedLost(report.ticket)
                    setSelectedFound("")
                    setSelectedInventoryId("")
                    setMatchingPreviewOpen(false)
                  }}
                >
                  <div>
                    <div className="flex items-start gap-3">
                      <ReportPhotoThumbnail report={report} size="compact" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-1">
                          <Badge variant="outline" tone="warning" className="text-xs px-1.5 py-0">
                            Laporan Kehilangan
                          </Badge>
                          <StatusBadge status={report.status} />
                        </div>
                        <h4 className="mt-1 font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {report.title}
                        </h4>
                        <p className="mt-0.5 text-xs text-muted-foreground truncate">
                          {report.location}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5 truncate">
                          {report.eventDate}, {report.eventTime} WIB
                        </p>
                      </div>
                    </div>

                    {(report.description || report.characteristics) && (
                      <p className="mt-3 text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded-lg">
                        {report.description || report.characteristics}
                      </p>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                    <Button
                      type="button"
                      variant="default"
                      size="sm"
                      className="h-8 text-xs gap-1.5 font-medium"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedLost(report.ticket)
                        setSelectedFound("")
                        setSelectedInventoryId("")
                        setMatchingPreviewOpen(false)
                      }}
                    >
                      <span>Pilih untuk Cocokkan</span>
                      <ArrowRight className="size-3.5" aria-hidden="true" />
                    </Button>
                    <ReportDetailTrigger report={report} compact />
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
      ) : (
        /* Step 2: Loss Report Selected -> Show Detail at Top, Candidate Section Below */
        <div className="space-y-5">
          {/* Top Card: Selected Loss Report Compact Summary */}
          <Card className="gap-0 rounded-xl border border-border bg-background p-4 shadow-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ReportPhotoThumbnail report={loss} size="compact" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" tone="warning" className="text-xs px-1.5 py-0 font-medium">
                      Laporan Kehilangan
                    </Badge>
                    <StatusBadge status={loss.status} />
                    <span className="text-xs text-muted-foreground truncate">
                      {loss.location} · Pelapor: <strong className="text-foreground font-medium">{loss.reporter}</strong>
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-foreground truncate mt-0.5">
                    {loss.title}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ReportDetailTrigger report={loss} compact />
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setSelectedLost("")
                    setSelectedFound("")
                    setSelectedInventoryId("")
                  }}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Ganti laporan</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Bottom Section: Candidates for Matching with Temuan / Inventory */}
          <section className="rounded-xl border border-border/60 bg-background p-4 space-y-4">
            {/* Header Toolbar */}
            <div className="flex flex-col gap-2 pb-3 border-b border-border/60 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">
                    Pilih barang yang sesuai
                  </h3>
                  <Badge variant="secondary" className="text-xs">
                    {totalCandidates} ditampilkan
                  </Badge>
                </div>
              </div>

            </div>

            {/* Search and Filters Toolbar */}
            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search
                  className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
                  aria-hidden="true"
                />
                <Input
                  placeholder="Cari nama, ciri, atau lokasi barang"
                  aria-label="Cari kandidat barang"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-background pl-9"
                />
              </div>

              {/* Filter Selects */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="w-full sm:w-48">
                  <Select
                    value={sourceFilter}
                    onValueChange={(val) => setSourceFilter(val as typeof sourceFilter)}
                  >
                    <SelectTrigger aria-label="Sumber kandidat barang" className="h-9 w-full bg-background">
                      <SelectValue className="min-w-0 truncate">
                        {sourceFilter === "semua"
                          ? "Semua Sumber"
                          : sourceFilter === "temuan"
                          ? "Laporan Temuan"
                          : "Inventaris Pos Satpam"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent matchTriggerWidth={false} className="min-w-52">
                      <SelectItem value="semua">Semua Sumber</SelectItem>
                      <SelectItem value="temuan">Laporan Temuan</SelectItem>
                      <SelectItem value="inventaris">Inventaris Pos Satpam</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="w-full sm:w-52">
                  <Select
                    value={statusFilter}
                    onValueChange={(val) => setStatusFilter(val as typeof statusFilter)}
                  >
                    <SelectTrigger aria-label="Status kandidat barang" className="h-9 w-full bg-background">
                      <SelectValue className="min-w-0 truncate">
                        {statusFilter === "diproses"
                          ? "Diproses (Siap cocok)"
                          : statusFilter === "baru"
                          ? "Baru (Belum diterima)"
                          : "Semua Status"}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent matchTriggerWidth={false} className="min-w-56">
                      <SelectItem value="diproses">
                        Diproses (Siap cocok)
                      </SelectItem>
                      <SelectItem value="baru">
                        Baru (Belum diterima)
                      </SelectItem>
                      <SelectItem value="semua">Semua Status</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Page Feedback */}
            <SatpamPageFeedback
              loading={foundPage.loading || inventoryResource.loading}
              error={foundPage.error || inventoryResource.error}
              nextCursor={foundPage.nextCursor}
              loadMore={foundPage.loadMore}
            />
            {sourceFilter !== "temuan" && statusFilter !== "baru" && inventoryResource.nextCursor ? <Button type="button" variant="outline" disabled={inventoryResource.loading || Boolean(inventoryResource.error)} onClick={inventoryResource.loadMore}>Muat inventaris berikutnya</Button> : null}
            {inventoryResource.error ? <Button type="button" variant="outline" onClick={() => setInventoryRev((value) => value + 1)}>Muat ulang inventaris</Button> : null}

            {/* Candidate Items List */}
            {totalCandidates === 0 && !foundPage.loading && !inventoryResource.loading && !foundPage.error && !inventoryResource.error ? (
              <CollectionEmptyState icon={PackageSearch} title="Belum ada barang yang sesuai" description="Ubah pencarian atau filter untuk melihat kandidat lain." size="compact" className="bg-background" />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {/* Temuan Reports */}
                {filteredTemuanReports.map((report) => (
                  <Card
                    key={`report-${report.ticket}`}
                    className={cn(
                      "group flex flex-col gap-0 justify-between rounded-xl border p-3.5 transition-all duration-200 cursor-pointer",
                      selectedFound === report.ticket
                        ? "border-primary bg-primary/5 ring-2 ring-primary/25 shadow-xs"
                        : "border-border/70 bg-background motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs motion-reduce:transition-none"
                    )}
                    onClick={() => {
                      setSelectedFound(report.ticket === selectedFound ? "" : report.ticket)
                      setSelectedInventoryId("")
                      setMatchingPreviewOpen(false)
                    }}
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <ReportPhotoThumbnail report={report} size="compact" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <Badge variant="outline" tone="cyan" className="text-xs px-1.5 py-0">
                              Laporan Temuan
                            </Badge>
                            {selectedFound === report.ticket && (
                              <Badge variant="default" className="text-xs px-1.5 py-0 gap-1 bg-primary text-primary-foreground">
                                <Check className="size-2.5" />
                                Dipilih
                              </Badge>
                            )}
                          </div>
                          <h4 className="mt-1 font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {report.title}
                          </h4>
                          <div className="mt-1 flex items-center gap-1.5">
                            <StatusBadge status={report.status} />
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">
                          Lokasi: <span className="text-foreground">{report.location}</span>
                        </p>
                        <p className="truncate">
                          Waktu: {report.submittedAt} WIB
                        </p>
                        {(report.description || report.characteristics) && (
                          <p className="line-clamp-2 mt-1.5 bg-muted/30 p-2 rounded-lg leading-relaxed">
                            {report.description || report.characteristics}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                      <Button
                        type="button"
                        variant={selectedFound === report.ticket ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs font-medium gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedFound(report.ticket === selectedFound ? "" : report.ticket)
                          setSelectedInventoryId("")
                          setMatchingPreviewOpen(false)
                        }}
                      >
                        {selectedFound === report.ticket ? (
                          <>
                            <Check className="size-3" />
                            <span>Terpilih</span>
                          </>
                        ) : (
                          <span>Pilih Pasangan</span>
                        )}
                      </Button>
                      <ReportDetailTrigger report={report} compact />
                    </div>
                  </Card>
                ))}

                {/* Inventory Items */}
                {filteredInventoryItems.map((item) => (
                  <Card
                    key={`inv-${item.id}`}
                    className={cn(
                      "group flex flex-col gap-0 justify-between rounded-xl border p-3.5 transition-all duration-200 cursor-pointer",
                      selectedInventoryId === item.id
                        ? "border-primary bg-primary/5 ring-2 ring-primary/25 shadow-xs"
                        : "border-border/70 bg-background motion-safe:hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xs motion-reduce:transition-none"
                    )}
                    onClick={() => {
                      setSelectedInventoryId(item.id === selectedInventoryId ? "" : item.id)
                      setSelectedFound("")
                      setMatchingPreviewOpen(false)
                    }}
                  >
                    <div>
                      <div className="flex items-start gap-3">
                        <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                          {item.photoUrl ? (
                            <Image
                              src={item.photoUrl}
                              alt={item.itemName}
                              fill
                              className="object-cover"
                              sizes="48px"
                              unoptimized
                            />
                          ) : (
                            <div className="flex size-full items-center justify-center text-muted-foreground">
                              <PackageSearch className="size-5" aria-hidden="true" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between gap-1">
                            <Badge variant="outline" tone="warning" className="text-xs px-1.5 py-0">
                              Inventaris Pos
                            </Badge>
                            {selectedInventoryId === item.id && (
                              <Badge variant="default" className="text-xs px-1.5 py-0 gap-1 bg-primary text-primary-foreground">
                                <Check className="size-2.5" />
                                Dipilih
                              </Badge>
                            )}
                          </div>
                          <h4 className="mt-1 font-semibold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                            {item.itemName}
                          </h4>
                          <div className="mt-1">
                            <Badge variant="outline" tone={item.status === "tersimpan" ? "success" : "neutral"}>{item.status === "tersimpan" ? "Tersimpan" : "Diserahkan"}</Badge>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs text-muted-foreground">
                        <p className="truncate">
                          Lokasi Simpan: <span className="text-foreground">{item.storageLocation}</span>
                        </p>
                        {item.founderName && (
                          <p className="truncate">
                            Penemu: <span className="text-foreground">{item.founderName}</span>
                          </p>
                        )}
                        <p className="truncate">
                          Dicatat: {item.createdAt} WIB
                        </p>
                        {item.description && (
                          <p className="line-clamp-2 mt-1.5 bg-muted/30 p-2 rounded-lg leading-relaxed">
                            {item.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between border-t border-border/50 pt-2.5">
                      <Button
                        type="button"
                        variant={selectedInventoryId === item.id ? "default" : "outline"}
                        size="sm"
                        className="h-8 text-xs font-medium gap-1"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedInventoryId(item.id === selectedInventoryId ? "" : item.id)
                          setSelectedFound("")
                          setMatchingPreviewOpen(false)
                        }}
                      >
                        {selectedInventoryId === item.id ? (
                          <>
                            <Check className="size-3" />
                            <span>Terpilih</span>
                          </>
                        ) : (
                          <span>Pilih Pasangan</span>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="shrink-0 gap-1.5 bg-card hover:bg-muted h-8 text-xs"
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedInventoryDetail(item)
                          setInventoryDetailOpen(true)
                        }}
                      >
                        <Eye className="size-3.5" aria-hidden="true" />
                        <span>Detail</span>
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {/* Bottom Action Shelf (Photo 4 Style) */}
            {hasSelectedPair && canValidate ? (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-3.5 sm:p-4 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-primary/25 bg-primary/10 text-primary shadow-2xs">
                      <BadgeCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Konfirmasi kecocokan
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Pastikan kedua laporan merujuk pada barang yang sama.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      type="button"
                      className="gap-2"
                      onClick={() => setMatchingPreviewOpen(true)}
                    >
                      <BadgeCheck className="size-4" aria-hidden="true" />
                      <span>Catat kecocokan</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : hasSelectedPair && selectedInventoryItem ? (
              <div className="rounded-xl border border-border bg-muted/40 p-3.5 sm:p-4 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary shadow-2xs">
                      <PackageSearch className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        {selectedInventoryItem.itemName}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Periksa barang, lalu lanjutkan penyerahan kepada pemilik.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <Button
                      type="button"
                      className="gap-2"
                      onClick={() => {
                        setSelectedInventoryDetail(selectedInventoryItem)
                        setInventoryDetailOpen(true)
                      }}
                    >
                      <Handshake className="size-4" aria-hidden="true" />
                      <span>Periksa &amp; serahkan</span>
                    </Button>
                  </div>
                </div>
              </div>
            ) : hasSelectedPair && found && reportNeedingAcceptance ? (
              <div className="rounded-xl border border-border/70 bg-muted/40 p-3.5 sm:p-4 shadow-xs">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground shadow-2xs">
                      <ArrowLeftRight className="size-5" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">
                        Proses laporan terlebih dahulu
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {reportNeedingAcceptance.title} masih berstatus {reportNeedingAcceptance.status}.
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0">
                    <ReportDetailTrigger report={reportNeedingAcceptance} compact />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3.5 text-xs text-muted-foreground">
                <ArrowLeftRight className="size-4 shrink-0 text-muted-foreground/70" aria-hidden="true" />
                <span>Pilih barang untuk melanjutkan.</span>
              </div>
            )}
          </section>
        </div>
      )}

      {/* Pending Handover notification banner if any */}
      {pendingCount > 0 && (
        <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background p-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5">
            <Handshake className="size-4 shrink-0 text-primary" aria-hidden="true" />
            <p className="text-sm text-foreground">
              <span className="font-medium">{pendingCount} pasangan</span> siap diserahkan
            </p>
          </div>
          <Button type="button" variant="soft" size="sm" onClick={onOpenHandover}>Buka penyerahan<ArrowRight aria-hidden="true" /></Button>
        </div>
      )}

      {/* Confirmation Dialog for Matching Loss & Found Reports */}
      <MatchingConfirmationDialog
        loss={loss}
        found={found}
        canValidate={canValidate}
        open={matchingPreviewOpen}
        onOpenChange={setMatchingPreviewOpen}
        onConfirm={async () => {
          if (!loss || !found || !canValidate) return false
          const ok = await onRecordMatch(loss.ticket, found.ticket)
          if (ok) {
            setSelectedLost("")
            setSelectedFound("")
            setMatchingPreviewOpen(false)
          }
          return ok
        }}
      />

      {/* Register New Inventory Dialog */}
      <RegisterInventoryDialog
        open={registerInventoryOpen}
        onOpenChange={setRegisterInventoryOpen}
        onSuccess={handleInventoryCreated}
      />

      {/* Inventory Item Detail & Handover Dialog */}
      {selectedInventoryDetail && (
        <InventoryDetailDialog
          key={selectedInventoryDetail.id}
          item={selectedInventoryDetail}
          linkedLoss={loss ? { ticket: loss.ticket, title: loss.title } : undefined}
          open={inventoryDetailOpen}
          onOpenChange={(open) => {
            setInventoryDetailOpen(open)
            if (!open) setSelectedInventoryDetail(null)
          }}
          onUpdated={handleInventoryItemUpdated}
        />
      )}
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



function SatpamLostFoundContent({ user, data, ticket, openDetail = false }: { user: CurrentUser; data: SatpamWorkspaceData; ticket?: string; openDetail?: boolean }) {
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
  const openReport = (report: SatpamLostFoundReport, trigger: HTMLButtonElement, selectTab = false) => {
    if (selectTab) setActiveTab(report.kind)
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
    {ticket ? <NotificationReport ticket={ticket} openDetail={openDetail} /> : null}
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
          <TabsContent value="pencocokan">
            <MatchingWorkspace
              onRecordMatch={recordMatch}
              onOpenHandover={() => setActiveTab("penyerahan")}
              pendingCount={data.pending.total}
              onRefresh={() => {
                setRevision((value) => value + 1)
                router.refresh()
              }}
            />
          </TabsContent>

          <TabsContent value="penyerahan"><HandoverWorkspace officers={data.officers} onConfirmHandover={confirmHandover} /></TabsContent>
        </Tabs>
      </CardContent></div>
    </Card>
    {selectedReport ? <ReportDetailDialog key={`${selectedReport.id}:${detailOpenCycle}`} report={selectedReport} open={detailOpen} onOpenChange={setDetailOpen} finalFocus={restoreDetailFocus} onStatusChange={updateStatus} onReceived={() => { setRevision(value => value + 1); router.refresh(); notify({ title: "Barang diterima di pos", description: "Temuan sudah ditautkan ke Inventaris.", tone: "success" }) }} onOpenMatching={() => setActiveTab("pencocokan")} onOpenHandover={() => setActiveTab("penyerahan")} /> : null}
  </ContentShell></div></ReportDetailContext.Provider></SatpamRefreshContext.Provider>
}

function NotificationReport({ ticket, openDetail }: { ticket: string; openDetail: boolean }) {
  const detail = useSatpamResource<SatpamDetail>(`/api/satpam/reports/${encodeURIComponent(ticket)}`)
  const openReport = useContext(ReportDetailContext)
  const reportContainer = useRef<HTMLDivElement>(null)
  const openedTicket = useRef<string | undefined>(undefined)
  // Deep links use the same operational modal and never reopen it after a status refresh.
  useEffect(() => {
    if (!openDetail || !detail.data || detail.data.report.ticket !== ticket || openedTicket.current === ticket) return
    const trigger = reportContainer.current?.querySelector<HTMLButtonElement>("[data-report-detail]")
    if (!trigger || !openReport) return
    openedTicket.current = ticket
    openReport(detail.data.report, trigger, true)
  }, [openDetail, detail.data, openReport, ticket])
  return <div ref={reportContainer} className="space-y-3"><SatpamPageFeedback loading={detail.loading} error={detail.error} />{detail.data ? <ReportRow report={detail.data.report} /> : null}</div>
}

export function SatpamLostFoundWorkspace({ user, data, ticket, openDetail = false }: { user: CurrentUser; data: SatpamWorkspaceData; ticket?: string; openDetail?: boolean }) {
  return <DashboardLayout role="satpam"><SatpamLostFoundContent user={user} data={data} ticket={ticket} openDetail={openDetail} /></DashboardLayout>
}
