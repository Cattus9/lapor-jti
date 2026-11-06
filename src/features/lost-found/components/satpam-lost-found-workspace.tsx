"use client"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.

import Image from "next/image"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportAttachmentsEmptyState } from "@/components/reports/report-attachments-empty-state"
import { ReportOpeningTracker, UnopenedReportBadge } from "@/components/reports/report-opening"
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
  Mail,
  MapPin,
  PackagePlus,
  PackageSearch,
  Paperclip,
  Phone,
  RotateCcw,
  Search,
  SearchCheck,
  SlidersHorizontal,
  UserRound,
} from "lucide-react"
import { ReportDetailSection, ReportDetailTable } from "@/components/reports/report-detail-section"
import { SatpamExceptionAction } from "./satpam-exception-action"
import { RegisterInventoryDialog, InventoryDetailDialog } from "./satpam-inventory-workspace"
import { ItemPhotoField, useItemPhoto } from "./item-photo-field"
import type { InventoryItem } from "../domain/inventory"
import { inventoryCandidateId, matchingCandidates, type CandidateCustody, type MatchingCandidate } from "../domain/matching-candidates"

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
  temuan: { label: "Temuan", description: "Informasi barang temuan dan penerimaannya di pos." },
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
    return <div className="rounded-xl border border-border/60 bg-muted/50 p-3.5 sm:p-4"><p className="text-sm font-medium text-foreground">Laporan selesai</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Laporan telah ditutup. Catatan penanganan tersedia pada riwayat status di bawah.</p></div>
  }

  if (report.status === "Diproses") {
    if (report.kind === "temuan" && report.inventoryId) {
      return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Barang sudah tercatat di pos</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Barang tetap tersedia di Pencocokan dengan penanda Tersimpan di pos.</p></div><Button type="button" onClick={onOpenMatching}><ArrowLeftRight aria-hidden="true" />Buka pencocokan</Button></div></div>
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

function ReportDetailTrigger({ report, compact = false, label, quiet = false }: { report: SatpamLostFoundReport; compact?: boolean; label?: string; quiet?: boolean }) {
  const openReport = useContext(ReportDetailContext)
  return <Button type="button" variant={quiet ? "ghost" : compact ? "soft" : "default"} size="sm" className={cn("shrink-0 gap-1.5", quiet && "text-muted-foreground")} aria-haspopup="dialog" data-report-detail={report.id} onClick={(event) => openReport?.(report, event.currentTarget)}>
    {compact ? <><Eye className="size-3.5" aria-hidden="true" /><span>{label ?? "Detail"}</span></> : (label ?? "Lihat detail")}
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
  onMarked,
}: {
  report: SatpamLostFoundReport
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus: () => HTMLElement | true
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => Promise<boolean>
  onOpenMatching: () => void
  onOpenHandover?: () => void
  onReceived: (item: InventoryItem) => void
  onMarked: () => void
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
        <SatpamExceptionAction report={report} onSaved={onMarked} />
        {isFound && !report.inventoryId && ["Baru", "Diproses"].includes(report.status) ? <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Barang sudah diserahkan ke pos?</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Catat langsung sebagai barang titipan di Inventaris.</p></div><Button type="button" variant="soft" aria-haspopup="dialog" onClick={() => setReceiveOpen(true)}><PackagePlus aria-hidden="true" />Catat barang di pos</Button></div> : null}
      </fieldset>}
    >
      <ReportOpeningTracker reportId={open && detail.data && !detail.data.report.firstOpenedAt ? detail.data.report.id : undefined} onMarked={onMarked} />
      <section>
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-foreground">Progres penanganan</p>
            <p className="mt-1 text-xs text-muted-foreground">{detail.data?.closureNote ? "Ditutup tanpa penyerahan" : report.status === "Ditolak" ? "Tidak melanjutkan lifecycle" : `Tahap ${statusStep(report.status) + 1} dari ${lifecycle.length}`}</p>
          </div>
          <StatusBadge status={report.status} />
        </div>
        <div className="mt-5">{detail.data?.closureNote ? <p className="rounded-xl border border-border bg-background p-4 text-sm">{detail.data.closureNote}</p> : <ReportStepper status={report.status} />}</div>
      </section>
      {report.reporterContact ? <ReportDetailSection icon={UserRound} title="Pelapor langsung" description="Kontak disimpan privat untuk tindak lanjut Satpam."><ReportDetailTable rows={[{ icon: UserRound, label: "Nama pelapor", value: report.reporter }, { icon: UserRound, label: "Kontak", value: report.reporterContact }, { icon: UserRound, label: "Pencatat", value: report.recordedBy }]} /></ReportDetailSection> : null}
      <RegisterInventoryDialog open={receiveOpen} onOpenChange={setReceiveOpen} sourceFound={{ ticket: report.ticket, title: report.title, location: report.location, description: report.description }} onSuccess={(item) => { onReceived(item); setReceiveOpen(false); onOpenChange(false); onOpenMatching() }} />
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
            <div className="flex flex-wrap items-center gap-2"><UnopenedReportBadge unseen={report.unopened} /><StatusBadge status={report.status} /></div>
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
  onConfirm: (
    recipient: string,
    recipientEmail: string,
    recipientPhone: string,
    note: string,
    officerId: string,
    location: string,
    ownershipEvidence: string,
    submissionKey: string,
    photo?: File | null
  ) => Promise<boolean>
}) {
  const [recipient, setRecipient] = useState(pair?.reporter ?? "")
  const [recipientEmail, setRecipientEmail] = useState(pair?.reporterEmail ?? "")
  const [recipientPhone, setRecipientPhone] = useState(pair?.reporterContact ?? "")
  const [note, setNote] = useState("")
  const [officerId, setOfficerId] = useState("")
  const [location, setLocation] = useState("Pos Satpam Gedung JTI")
  const [evidence, setEvidence] = useState("")
  const handoverPhoto = useItemPhoto()
  const command = useRef<{ fingerprint: string; key: string } | null>(null)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  if (!pair) return null
  const validOfficer = officers.some((officer) => officer.id === officerId)
  const hasContact = Boolean(recipientEmail.trim() || recipientPhone.trim())

  return <Dialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value) }}>
    <DialogContent>
      <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
        <DialogTitle className="text-xl leading-tight md:text-2xl">Konfirmasi penyerahan</DialogTitle>
        <DialogDescription className="mt-2">Konfirmasi setelah barang diterima pemilik. Kedua laporan langsung selesai.</DialogDescription>
      </div>
      <form className="space-y-5 p-5 md:p-6" aria-busy={pending} onSubmit={async (event) => {
        event.preventDefault()
        const trimmedRecipient = recipient.trim()
        const trimmedEmail = recipientEmail.trim()
        const trimmedPhone = recipientPhone.trim()
        const trimmedLocation = location.trim()
        const trimmedEvidence = evidence.trim()
        const trimmedNote = note.trim()
        const photo = handoverPhoto.file

        if (pending || !validOfficer || !trimmedRecipient || !trimmedLocation || !trimmedEvidence) return

        if (!trimmedEmail && !trimmedPhone) {
          setError("Minimal salah satu antara email atau nomor HP penerima wajib diisi.")
          return
        }
        if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
          setError("Format email penerima tidak valid.")
          return
        }
        if (handoverPhoto.error) {
          setError(handoverPhoto.error)
          return
        }

        setPending(true); setError("")
        try {
          const fingerprint = JSON.stringify([trimmedRecipient, trimmedEmail, trimmedPhone, trimmedNote, officerId, trimmedLocation, trimmedEvidence, photo?.name, photo?.size])
          if (!command.current || command.current.fingerprint !== fingerprint) command.current = { fingerprint, key: crypto.randomUUID() }
          if (await onConfirm(trimmedRecipient, trimmedEmail, trimmedPhone, trimmedNote, officerId, trimmedLocation, trimmedEvidence, command.current.key, photo)) onOpenChange(false)
          else setError("Penyerahan belum berhasil. Periksa pesan kesalahan dan coba kembali.")
        } finally { setPending(false) }
      }}>
        <div className="rounded-xl border border-border/60 bg-muted/30 p-3 text-sm">
          <p className="font-medium">{pair.title}</p>
          <div className="mt-2 grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            <div>
              <span className="font-medium text-foreground">Pemilik (Pelapor):</span> {pair.reporter}
              {pair.reporterEmail ? <span className="block text-muted-foreground">{pair.reporterEmail}</span> : null}
              {pair.reporterContact ? <span className="block text-muted-foreground">{pair.reporterContact}</span> : null}
            </div>
            <div>
              <span className="font-medium text-foreground">Penemu:</span> {pair.foundReporter || "Pihak kampus / pos"}
              {pair.foundReporterEmail ? <span className="block text-muted-foreground">{pair.foundReporterEmail}</span> : null}
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
            <span>Kehilangan: {pair.lossSubmittedAt} WIB</span>
            <span>Temuan: {pair.foundSubmittedAt} WIB</span>
          </div>
        </div>
        <Field>
          <FieldLabel htmlFor="handover-officer">Petugas penanggung jawab</FieldLabel>
          <Select value={officerId || null} onValueChange={(value) => setOfficerId(value ?? "")} items={officers.map((officer) => ({ value: officer.id, label: officer.name }))} disabled={pending || !officers.length} required>
            <SelectTrigger id="handover-officer" className="h-9 w-full bg-background" aria-describedby="handover-officer-description"><SelectValue placeholder="Pilih petugas penyerahan" /></SelectTrigger>
            <SelectContent>{officers.map((officer) => <SelectItem key={officer.id} value={officer.id}>{officer.name}</SelectItem>)}</SelectContent>
          </Select>
          <FieldDescription id="handover-officer-description">{officers.length ? "Pilih petugas yang bertanggung jawab atas penyerahan ini." : "Belum ada petugas aktif. Hubungi pengelola untuk menyiapkan daftar petugas."}</FieldDescription>
        </Field>
        <Field><FieldLabel htmlFor="handover-recipient">Nama penerima</FieldLabel><Input id="handover-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-9 bg-background" maxLength={150} required disabled={pending} placeholder="Nama penerima barang" /></Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field>
            <FieldLabel htmlFor="handover-recipient-email">Email penerima</FieldLabel>
            <Input
              id="handover-recipient-email"
              type="email"
              value={recipientEmail}
              onChange={(event) => setRecipientEmail(event.target.value)}
              className="h-9 bg-background"
              maxLength={150}
              disabled={pending}
              placeholder="nama@example.com"
            />
          </Field>
          <Field>
            <FieldLabel htmlFor="handover-recipient-phone">Nomor HP penerima</FieldLabel>
            <Input
              id="handover-recipient-phone"
              type="tel"
              value={recipientPhone}
              onChange={(event) => setRecipientPhone(event.target.value)}
              className="h-9 bg-background"
              maxLength={30}
              disabled={pending}
              placeholder="081234567890"
            />
          </Field>
        </div>
        <FieldDescription>Minimal salah satu (email atau nomor HP) harus diisi sebagai kontak verifikasi penyerahan.</FieldDescription>
        <ItemPhotoField
          idPrefix="satpam-handover"
          label="Foto dokumentasi penyerahan (opsional)"
          description="Format JPG, PNG, atau WebP (maks. 5 MB) sebagai arsip dokumentasi serah terima fisik."
          photo={handoverPhoto}
          disabled={pending}
          compact
        />
        <Field><FieldLabel htmlFor="handover-location">Lokasi penyerahan</FieldLabel><Input id="handover-location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-9 bg-background" maxLength={200} required disabled={pending} /></Field>
        <Field><FieldLabel htmlFor="handover-evidence">Hasil pemeriksaan kepemilikan</FieldLabel><Textarea id="handover-evidence" value={evidence} onChange={event => setEvidence(event.target.value)} maxLength={1000} required disabled={pending} className="bg-background/70" placeholder="Contoh: Pemilik menjelaskan ciri khusus barang." /><FieldDescription>Catat hasil pemeriksaan sebelum mengonfirmasi penyerahan.</FieldDescription></Field>
        <Field><FieldLabel htmlFor="handover-note">Catatan penyerahan (opsional)</FieldLabel><Textarea id="handover-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={pending} placeholder="Contoh: Identitas penerima telah diperiksa oleh petugas." /></Field>
        {error ? <FieldError>{error}</FieldError> : null}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={() => onOpenChange(false)}>Batal</Button>
          <Button type="submit" disabled={pending || !validOfficer || !recipient.trim() || !location.trim() || !evidence.trim() || !hasContact}><Handshake />{pending ? "Menyimpan..." : "Konfirmasi penyerahan"}</Button>
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

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><BadgeCheck className="size-4" aria-hidden="true" /></span><span>Konfirmasi manual</span></div><DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">Catat kecocokan</DialogTitle><DialogDescription className="mt-2">Lakukan saat pemilik hadir. Pastikan barang tersedia dan kedua laporan merujuk pada barang yang sama.</DialogDescription></div><div className="space-y-5 p-5 md:p-6"><div className="grid gap-3 md:grid-cols-2"><MatchPreviewCard label="Laporan kehilangan" report={loss} /><MatchPreviewCard label="Barang temuan" report={found} /></div><FieldError>{error}</FieldError><p className="text-xs leading-relaxed text-muted-foreground">{canValidate ? "Kedua tiket akan berstatus Barang teridentifikasi dan dapat dilanjutkan ke proses penyerahan." : "Kedua tiket harus berstatus Diproses sebelum kecocokan dapat dicatat."}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => onOpenChange(false)}>Kembali</Button><Button type="button" disabled={!canValidate || pending} onClick={async () => { if (pending) return; setPending(true); setError(""); try { if (!await onConfirm()) setError("Pencocokan belum berhasil. Periksa pesan kesalahan dan coba kembali.") } finally { setPending(false) } }}><BadgeCheck />Catat kecocokan</Button></div></div></DialogContent></Dialog>
}

function MatchPreviewCard({ label, report }: { label: string; report: SatpamLostFoundReport }) {
  const isLoss = label.toLowerCase().includes("kehilangan")
  return <section className="rounded-xl border border-border/60 bg-background/60 p-4">
    <div className="flex items-start gap-3">
      <ReportPhotoThumbnail report={report} size="large" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-1 text-sm font-semibold text-foreground">{report.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Dikirim {report.submittedAt} WIB</p>
        <div className="mt-2"><StatusBadge status={report.status} /></div>
      </div>
    </div>
    <dl className="mt-4 space-y-3 text-xs">
      <div>
        <dt className="text-muted-foreground">Deskripsi barang</dt>
        <dd className="mt-1 leading-relaxed whitespace-pre-wrap text-foreground">{report.description || report.characteristics}</dd>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt className="text-muted-foreground">Lokasi</dt>
          <dd className="mt-1 text-foreground">{report.location}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Waktu</dt>
          <dd className="mt-1 text-foreground">{report.eventDate}, {report.eventTime}</dd>
        </div>
      </div>
      <div className="border-t border-border/60 pt-3">
        <dt className="font-medium text-foreground">{isLoss ? "Kontak Penerima (Pemilik)" : "Kontak Penemu"}</dt>
        <dd className="mt-1.5 space-y-1 text-foreground">
          <p className="flex items-center gap-1.5 font-medium">
            <UserRound className="size-3.5 text-muted-foreground" aria-hidden="true" />
            <span>{report.reporter || "-"}</span>
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{report.reporterEmail || "Email tidak terdaftar"}</span>
          </p>
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Phone className="size-3.5 shrink-0" aria-hidden="true" />
            <span>{report.reporterContact || "Nomor HP tidak terdaftar"}</span>
          </p>
        </dd>
      </div>
    </dl>
  </section>
}

export function MatchingCandidateCard({ candidate, selected, disabled, onSelect, detail }: {
  candidate: MatchingCandidate; selected: boolean; disabled: boolean; onSelect: () => void; detail: React.ReactNode
}) {
  const [failedPhoto, setFailedPhoto] = useState<string>()
  const stored = candidate.custody === "di-pos"
  return <Card className={cn("gap-3 rounded-xl border bg-card p-4 shadow-none ring-0 transition-colors", selected ? "border-primary/60" : "border-border/70 hover:border-primary/30")}>
    <div className="flex items-start gap-3">
      <div className="relative size-12 shrink-0 overflow-hidden rounded-lg border border-border/60 bg-muted/40">
        {candidate.photoUrl && failedPhoto !== candidate.photoUrl ? <Image src={candidate.photoUrl} alt={`Foto ${candidate.title}`} fill sizes="48px" unoptimized className="object-cover" onError={() => setFailedPhoto(candidate.photoUrl)} /> : <div className="flex size-full items-center justify-center text-muted-foreground"><PackageSearch className="size-5" aria-hidden="true" /></div>}
      </div>
      <div className="min-w-0 space-y-1.5"><h4 className="text-sm font-semibold text-foreground">{candidate.title}</h4><Badge variant="outline" tone={stored ? "success" : "neutral"}>{stored ? "Tersimpan di pos" : "Belum diterima di pos"}</Badge></div>
    </div>
    <div className="flex-1 space-y-2 text-xs leading-relaxed text-muted-foreground">
      <p className="flex items-start gap-1.5"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" /><span>{candidate.location}</span></p>
      {candidate.description ? <p className="line-clamp-2">{candidate.description}</p> : null}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3">
      <Button type="button" variant={selected ? "default" : "soft"} size="sm" disabled={disabled} aria-pressed={selected} aria-label={`${selected ? "Batalkan pilihan" : "Pilih barang"}: ${candidate.title}`} onClick={onSelect}>{selected ? <Check aria-hidden="true" /> : null}{selected ? "Terpilih" : "Pilih barang"}</Button>
      {detail}
    </div>
  </Card>
}

function MatchingWorkspace({
  onRecordMatch,
  onRefresh,
  receivedItem,
  onReceiptAcknowledged,
}: {
  onRecordMatch: (lossTicket: string, foundTicket: string) => Promise<boolean>
  onRefresh?: () => void
  receivedItem?: InventoryItem
  onReceiptAcknowledged: () => void
}) {
  const lostPage = useSatpamPage<SatpamLostFoundReport>("/api/satpam/reports?kind=kehilangan&matching=1")
  const lostReports = lostPage.items

  const [inventoryRev, setInventoryRev] = useState(0)

  const [selectedLost, setSelectedLost] = useState("")
  const [selectedCandidateId, setSelectedCandidateId] = useState("")
  const [matchingPreviewOpen, setMatchingPreviewOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const debouncedSearch = useDebouncedSatpamQuery(searchQuery).trim()
  const [custodyFilter, setCustodyFilter] = useState<CandidateCustody>("semua")
  const foundPage = useSatpamPage<SatpamLostFoundReport>(`/api/satpam/reports?kind=temuan&matching=1&rev=${inventoryRev}&q=${encodeURIComponent(debouncedSearch)}&status=semua`)
  const inventoryResource = useSatpamPage<InventoryItem>(`/api/satpam/inventory?rev=${inventoryRev}&q=${encodeURIComponent(debouncedSearch)}&status=tersimpan`)
  const [registerInventoryOpen, setRegisterInventoryOpen] = useState(false)
  const [receiptSource, setReceiptSource] = useState<SatpamLostFoundReport>()
  const [selectedInventoryDetail, setSelectedInventoryDetail] = useState<InventoryItem | null>(null)
  const [inventoryDetailOpen, setInventoryDetailOpen] = useState(false)
  const [receipt, setReceipt] = useState<InventoryItem>()
  const [receivedId, setReceivedId] = useState<string>()
  if (receivedItem && receivedItem.id !== receivedId) {
    setReceivedId(receivedItem.id)
    setReceipt(receivedItem)
    setSelectedCandidateId(inventoryCandidateId(receivedItem))
    setCustodyFilter("semua")
    setSearchQuery("")
  }
  useEffect(() => { if (receivedItem) onReceiptAcknowledged() }, [receivedItem, onReceiptAcknowledged])
  const loss = lostReports.find(report => report.ticket === selectedLost)
  const waitingForSearch = searchQuery.trim() !== debouncedSearch
  const candidatesLoading = foundPage.loading || inventoryResource.loading || waitingForSearch
  const candidatesError = foundPage.error || inventoryResource.error
  // A just-confirmed receipt bridges the refresh, never an old failed response.
  const items = receipt && inventoryResource.loading && !debouncedSearch
    ? [receipt, ...inventoryResource.items.filter(item => item.id !== receipt.id)] : inventoryResource.items
  const candidates = matchingCandidates(foundPage.items, items, custodyFilter)
  const selectedCandidate = candidates.find(candidate => candidate.id === selectedCandidateId)
  const found = selectedCandidate?.custody === "belum-diterima" ? selectedCandidate.report : undefined
  const selectedInventoryItem = selectedCandidate?.custody === "di-pos" ? selectedCandidate.item : undefined
  const canValidate = Boolean(loss && found && loss.status === "Diproses" && found.status === "Diproses")
  const hasSelectedPair = Boolean(loss && selectedCandidate)
  const reportNeedingAcceptance = loss && loss.status !== "Diproses" ? loss : found && found.status !== "Diproses" ? found : undefined
  const totalCandidates = candidates.length
  const candidatesUnavailable = candidatesLoading || Boolean(candidatesError) || lostPage.loading || Boolean(lostPage.error)
  const moreCandidates = (custodyFilter !== "di-pos" && foundPage.nextCursor) || (custodyFilter !== "belum-diterima" && inventoryResource.nextCursor)

  function handleInventoryCreated(item: InventoryItem) {
    setReceipt(item)
    setSelectedCandidateId(inventoryCandidateId(item))
    setCustodyFilter("semua")
    setSearchQuery("")
    setInventoryRev(value => value + 1)
    onRefresh?.()
    setRegisterInventoryOpen(false)
    setReceiptSource(undefined)
  }

  function handleInventoryItemUpdated(item: InventoryItem) {
    setInventoryRev((prev) => prev + 1)
    onRefresh?.()
    setSelectedInventoryDetail(item)
    if (item.status === "diserahkan") { setSelectedLost(""); setSelectedCandidateId(""); setReceipt(undefined) }
  }
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2"><h2 className="text-base font-semibold text-foreground">Cocokkan barang</h2>{!loss && !lostPage.loading && !lostPage.error && lostPage.total > 0 ? <Badge variant="secondary">{lostPage.total} laporan</Badge> : null}</div>
          {!loss && lostReports.length ? <p className="text-sm text-muted-foreground">Pilih laporan kehilangan.</p> : null}
        </div>
        <Button type="button" variant={loss ? "soft" : "default"} className="self-start sm:self-auto" aria-haspopup="dialog" onClick={() => { setReceiptSource(undefined); setRegisterInventoryOpen(true) }}><PackagePlus aria-hidden="true" />Terima barang</Button>
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
                  className="group flex flex-col gap-0 justify-between rounded-xl border border-border/70 bg-background p-3.5 shadow-none ring-0 transition-colors hover:border-primary/40 motion-reduce:transition-none"
                  onClick={() => {
                    setSelectedLost(report.ticket)
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
          <Card className="gap-0 rounded-xl border border-border/60 bg-background p-4 shadow-none ring-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <ReportPhotoThumbnail report={loss} size="compact" />
                <div className="min-w-0 space-y-1.5">
                  <p className="text-xs font-medium text-muted-foreground">Laporan kehilangan</p>
                  <div className="flex flex-wrap items-center gap-2"><h3 className="text-base font-semibold text-foreground">{loss.title}</h3><StatusBadge status={loss.status} /></div>
                  <p className="text-xs leading-relaxed text-muted-foreground">{loss.location} · Pelapor: {loss.reporter}</p>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <ReportDetailTrigger report={loss} compact quiet />
                <Button
                  type="button"
                  variant="soft"
                  size="sm"
                  onClick={() => {
                    setSelectedLost("")
                    setSelectedCandidateId("")
                  }}
                >
                  <RotateCcw className="size-3.5" aria-hidden="true" />
                  <span>Ganti laporan</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Bottom Section: Candidates for Matching with Temuan / Inventory */}
          <section aria-labelledby="matching-candidates-title" className="space-y-4 border-t border-border/60 pt-5">
            {/* Header Toolbar */}
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 id="matching-candidates-title" className="text-sm font-semibold text-foreground">
                    Barang temuan
                  </h3>
                  <Badge variant="secondary" className="text-xs" aria-label={`${totalCandidates} barang ditampilkan`}>
                    {totalCandidates}
                  </Badge>
                </div>
              </div>

            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <Field className="min-w-0 sm:flex-1">
                <FieldLabel className="sr-only" htmlFor="matching-search">Cari barang</FieldLabel>
                <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="matching-search" type="search" maxLength={100} placeholder="Nama, ciri, atau lokasi barang" value={searchQuery} onChange={event => setSearchQuery(event.target.value)} className="bg-background pl-9" />
                </div>
              </Field>
              <Field className="min-w-0 sm:w-60 sm:flex-none">
                <FieldLabel className="sr-only" htmlFor="matching-custody">Keberadaan barang</FieldLabel>
                <Select items={[{ value: "semua", label: "Semua barang" }, { value: "belum-diterima", label: "Belum diterima di pos" }, { value: "di-pos", label: "Tersimpan di pos" }]} value={custodyFilter} onValueChange={value => setCustodyFilter(value as CandidateCustody)}>
                  <SelectTrigger id="matching-custody" className="w-full bg-background"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="semua">Semua barang</SelectItem><SelectItem value="belum-diterima">Belum diterima di pos</SelectItem><SelectItem value="di-pos">Tersimpan di pos</SelectItem></SelectContent>
                </Select>
              </Field>
              {searchQuery || custodyFilter !== "semua" ? <Button type="button" variant="ghost" size="sm" onClick={() => { setSearchQuery(""); setCustodyFilter("semua") }}>Reset filter</Button> : null}
            </div>
            {receipt ? <div role="status" className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm"><span><strong className="font-medium">{receipt.sourceFoundTitle || receipt.itemName}</strong> sudah diterima di pos.</span><Button variant="ghost" size="sm" onClick={() => setReceipt(undefined)}>Tutup</Button></div> : null}
            <div className="space-y-3 rounded-xl bg-background p-3 md:p-4">
            <SatpamPageFeedback loading={candidatesLoading} error={candidatesError} />
            {candidatesError ? <Button type="button" variant="outline" onClick={() => setInventoryRev(value => value + 1)}>Muat ulang barang</Button> : null}
            {totalCandidates === 0 && !candidatesLoading && !candidatesError ? (
              <CollectionEmptyState icon={PackageSearch} title={searchQuery || custodyFilter !== "semua" ? "Tidak ada barang yang sesuai" : "Belum ada barang untuk dicocokkan"} description={searchQuery || custodyFilter !== "semua" ? "Ubah pencarian atau reset filter untuk melihat barang lain." : "Laporan temuan dan barang yang diterima di pos akan muncul di sini."} size="compact" className="border-border/60 bg-background" />
            ) : <div role="group" aria-label="Kandidat barang" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {candidates.map(candidate => <MatchingCandidateCard key={candidate.id} candidate={candidate} selected={selectedCandidateId === candidate.id} disabled={candidatesUnavailable} onSelect={() => { setSelectedCandidateId(candidate.id === selectedCandidateId ? "" : candidate.id); setMatchingPreviewOpen(false) }} detail={candidate.custody === "belum-diterima" ? <ReportDetailTrigger report={candidate.report} compact quiet /> : <Button type="button" variant="ghost" size="sm" className="text-muted-foreground" disabled={candidatesUnavailable} onClick={() => { setSelectedInventoryDetail(candidate.item); setInventoryDetailOpen(true) }}><Eye aria-hidden="true" />Detail</Button>} />)}
            </div>}
            {moreCandidates ? <Button type="button" variant="outline" disabled={candidatesUnavailable} onClick={() => { if (custodyFilter !== "di-pos") foundPage.loadMore(); if (custodyFilter !== "belum-diterima") inventoryResource.loadMore() }}>Muat barang berikutnya</Button> : null}
            </div>

            {selectedCandidate ? <div className="sticky bottom-3 z-10 space-y-3 rounded-xl border border-border bg-card p-4 shadow-none">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0"><p className="text-sm font-semibold">{selectedCandidate.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{selectedInventoryItem ? "Cocokkan ciri barang sebelum penyerahan." : reportNeedingAcceptance ? `Laporan ${reportNeedingAcceptance.title} masih berstatus ${reportNeedingAcceptance.status}. Tinjau laporan untuk melanjutkan.` : "Barang belum diterima di pos."}</p></div>
                {selectedInventoryItem ? <Button type="button" disabled={candidatesUnavailable} onClick={() => { setSelectedInventoryDetail(selectedInventoryItem); setInventoryDetailOpen(true) }}><SearchCheck aria-hidden="true" />Periksa kecocokan</Button> : hasSelectedPair && canValidate ? <Button type="button" disabled={candidatesUnavailable} onClick={() => setMatchingPreviewOpen(true)}><SearchCheck aria-hidden="true" />Periksa kecocokan</Button> : reportNeedingAcceptance ? <ReportDetailTrigger report={reportNeedingAcceptance} compact label="Tinjau laporan" /> : null}
              </div>
              {found ? <div className="flex flex-col gap-3 border-t border-border/60 pt-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Barang sudah diserahkan ke pos?</p></div><Button type="button" variant="soft" disabled={candidatesUnavailable} onClick={() => { setReceiptSource(found); setRegisterInventoryOpen(true) }}><PackagePlus aria-hidden="true" />Catat barang di pos</Button></div> : null}
            </div> : null}
          </section>
        </div>
      )}

      {/* Confirmation Dialog for Matching Loss & Found Reports */}
      <MatchingConfirmationDialog
        loss={loss}
        found={found}
        canValidate={canValidate && !candidatesUnavailable}
        open={matchingPreviewOpen}
        onOpenChange={setMatchingPreviewOpen}
        onConfirm={async () => {
          if (!loss || !found || !canValidate || candidatesUnavailable) return false
          const ok = await onRecordMatch(loss.ticket, found.ticket)
          if (ok) {
            setSelectedLost("")
            setSelectedCandidateId("")
            setMatchingPreviewOpen(false)
          }
          return ok
        }}
      />

      {/* Register New Inventory Dialog */}
      <RegisterInventoryDialog
        open={registerInventoryOpen}
        onOpenChange={setRegisterInventoryOpen}
        sourceFound={receiptSource ? { ticket: receiptSource.ticket, title: receiptSource.title, location: receiptSource.location, description: receiptSource.description } : undefined}
        onSuccess={handleInventoryCreated}
      />

      {/* Inventory Item Detail & Handover Dialog */}
      {selectedInventoryDetail && (
        <InventoryDetailDialog
          key={`${selectedInventoryDetail.id}:${loss?.ticket ?? "none"}`}
          item={selectedInventoryDetail}
          linkedLoss={loss}
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


function HandoverWorkspace({ officers, onConfirmHandover, onRefresh }: {
  officers: SecurityOfficer[]
  onRefresh: () => void
  onConfirmHandover: (
    pair: MatchedPair,
    recipient: string,
    recipientEmail: string,
    recipientPhone: string,
    note: string,
    officerId: string,
    location: string,
    ownershipEvidence: string,
    submissionKey: string,
    photo?: File | null
  ) => Promise<boolean>
}) {
  const page = useSatpamPage<MatchedPair>("/api/satpam/pending")
  const pendingPairs = page.items
  const [selectedPair, setSelectedPair] = useState<MatchedPair | null>(null)

  return (
    <div className="space-y-4">
      <div className="border-b border-border/60 pb-4">
        <h2 className="text-base font-semibold text-foreground">Menunggu penyerahan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Periksa keberadaan barang dan kepemilikan saat pemilik datang.</p>
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
                    <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><UserRound className="size-3.5" aria-hidden="true" />Penerima: {pair.reporter}</span>
                      {pair.reporterEmail ? <span className="flex items-center gap-1"><Mail className="size-3.5" aria-hidden="true" />{pair.reporterEmail}</span> : null}
                      {pair.reporterContact ? <span className="flex items-center gap-1"><Phone className="size-3.5" aria-hidden="true" />{pair.reporterContact}</span> : null}
                    </div>
                  </div>
                </div>
                <SharedStatusBadge status="Menunggu penyerahan" />
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />Dicocokkan {pair.matchedAt}</span>
                <SatpamExceptionAction matchId={pair.id} onSaved={onRefresh} /><Button type="button" size="sm" onClick={() => setSelectedPair(pair)}><Handshake />Catat penyerahan</Button>
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
      <HandoverDialog
        key={selectedPair?.id ?? "closed"}
        officers={officers}
        pair={selectedPair}
        open={Boolean(selectedPair)}
        onOpenChange={(open) => { if (!open) setSelectedPair(null) }}
        onConfirm={async (recipient, recipientEmail, recipientPhone, note, officerId, location, evidence, key, photo) =>
          selectedPair ? onConfirmHandover(selectedPair, recipient, recipientEmail, recipientPhone, note, officerId, location, evidence, key, photo) : false
        }
      />
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
  const [receivedInventory, setReceivedInventory] = useState<InventoryItem>()
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
  async function execute(command: unknown, photo?: File | null) {
    if (busy.current) return false
    busy.current = true; setError("")
    try {
      let response: Response
      if (photo && photo.size > 0) {
        const formData = new FormData()
        formData.append("command", JSON.stringify(command))
        formData.append("photo", photo)
        response = await fetch("/api/satpam/reports", { method: "POST", body: formData })
      } else {
        response = await fetch("/api/satpam/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(command) })
      }
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
  const confirmHandover = (
    pair: MatchedPair,
    recipient: string,
    recipientEmail: string,
    recipientPhone: string,
    note: string,
    officerId: string,
    location: string,
    ownershipEvidence: string,
    submissionKey: string,
    photo?: File | null
  ) => execute({
    type: "handover",
    matchId: pair.id,
    recipient,
    recipientEmail: recipientEmail.trim() || undefined,
    recipientPhone: recipientPhone.trim() || undefined,
    note,
    officerId,
    location,
    ownershipEvidence,
    submissionKey,
  }, photo)
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
              receivedItem={receivedInventory}
              onReceiptAcknowledged={() => setReceivedInventory(undefined)}
              onRecordMatch={recordMatch}
              onRefresh={() => {
                setRevision((value) => value + 1)
                router.refresh()
              }}
            />
          </TabsContent>

          <TabsContent value="penyerahan"><HandoverWorkspace onRefresh={() => setRevision(value => value + 1)} officers={data.officers} onConfirmHandover={confirmHandover} /></TabsContent>
        </Tabs>
      </CardContent></div>
    </Card>
    {selectedReport ? <ReportDetailDialog key={`${selectedReport.id}:${detailOpenCycle}`} report={selectedReport} open={detailOpen} onOpenChange={setDetailOpen} finalFocus={restoreDetailFocus} onStatusChange={updateStatus} onMarked={() => setRevision(value => value + 1)} onReceived={(item) => { setReceivedInventory(item); setRevision(value => value + 1); router.refresh(); notify({ title: "Barang diterima di pos", description: "Barang tetap tersedia di Pencocokan dengan penanda Tersimpan di pos.", tone: "success" }) }} onOpenMatching={() => setActiveTab("pencocokan")} onOpenHandover={() => setActiveTab("penyerahan")} /> : null}
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
