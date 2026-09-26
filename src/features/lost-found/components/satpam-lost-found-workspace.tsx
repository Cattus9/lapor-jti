"use client"

import Image from "next/image"
import { useMemo, useState } from "react"
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
  Search,
  SearchCheck,
} from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { satpamLostFoundReports, satpamPendingHandovers, type SatpamLostFoundReport, type SatpamPendingHandover, type SatpamReportKind, type SatpamReportStatus } from "@/features/lost-found/mock/satpam-lost-found"
import type { CurrentUser } from "@/lib/auth/dummy-session"
import { cn } from "cn"

const lifecycle = ["Baru", "Diverifikasi", "Diproses", "Barang teridentifikasi", "Diserahkan", "Selesai"] as const
const statusOptions = [...lifecycle, "Ditolak"] as const

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
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onOpenMatching: () => void
  onOpenHandover?: () => void
}) {
  const [decision, setDecision] = useState<"accept" | "reject" | null>(null)
  const [rejectionReason, setRejectionReason] = useState("")
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
          <Button type="button" onClick={() => setDecision("accept")}>Terima laporan</Button>
          <Button type="button" variant="outline" className="bg-card text-destructive hover:text-destructive" onClick={() => setDecision("reject")}>Tolak laporan</Button>
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
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={closeDecision}>Batal</Button>
              {decision === "reject" ? <Button type="button" variant="destructive" disabled={!rejectionReason.trim()} onClick={() => { onStatusChange(report.ticket, "Ditolak", rejectionReason.trim()); closeDecision() }}>Ya, tolak laporan</Button> : <Button type="button" onClick={() => { onStatusChange(report.ticket, "Diverifikasi"); closeDecision() }}>Ya, terima laporan</Button>}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  }

  if (!action) return null

  return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Aksi penanganan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action.description}</p><div className="mt-4"><Button type="button" onClick={() => onStatusChange(report.ticket, action.nextStatus)}>{action.label}</Button></div></div>
}

function StatusActivity({ activities }: { activities: StatusHistoryItem[] }) {
  return <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold text-foreground">Riwayat status</h3><div className="mt-3 space-y-2">{[...activities].reverse().map((activity, index) => <div key={`${activity.status}-${activity.timestamp}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-medium text-foreground">{activity.status}</p><span className="text-xs text-muted-foreground">{activity.timestamp}</span></div><p className="mt-1 text-xs text-muted-foreground">Oleh {activity.actor}{activity.note ? ` · ${activity.note}` : ""}</p></div></div>)}</div></section>
}

function ReportDetailDialog({
  report,
  compact = false,
  activities,
  onStatusChange,
  onOpenMatching,
  onOpenHandover,
}: {
  report: SatpamLostFoundReport
  compact?: boolean
  activities: StatusHistoryItem[]
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onOpenMatching: () => void
  onOpenHandover?: () => void
}) {
  const isFound = report.kind === "temuan"
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="shrink-0 gap-1.5 bg-card hover:bg-muted" />}>
        {compact ? <><Eye className="size-3.5" aria-hidden="true" /><span>Detail</span></> : "Lihat detail"}
      </DialogTrigger>
      <DialogContent>
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
          <StatusActionPanel report={report} onStatusChange={onStatusChange} onOpenMatching={() => { setOpen(false); onOpenMatching() }} onOpenHandover={onOpenHandover ? () => { setOpen(false); onOpenHandover() } : undefined} />
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
          </section>
          <StatusActivity activities={activities} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportList({
  kind,
  reports: sourceReports,
  statusHistory,
  onStatusChange,
  onOpenMatching,
  onOpenHandover,
}: {
  kind: SatpamReportKind
  reports: SatpamLostFoundReport[]
  statusHistory: Record<string, StatusHistoryItem[]>
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onOpenMatching: () => void
  onOpenHandover: () => void
}) {
  const [query, setQuery] = useState("")
  const [status, setStatus] = useState<"semua" | SatpamReportStatus>("semua")
  const meta = tabMeta[kind]
  const reports = useMemo(() => sourceReports.filter((report) => report.kind === kind && (status === "semua" || report.status === status) && `${report.title} ${report.ticket} ${report.location}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [kind, query, sourceReports, status])

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 lg:flex-row lg:items-end lg:justify-between">
        <div><h2 className="text-base font-semibold text-foreground">{meta.label}</h2><p className="mt-1 text-sm text-muted-foreground">{meta.description}</p></div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_11rem] lg:w-[29rem]">
          <div className="relative"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Cari tiket, barang, atau lokasi" aria-label={`Cari laporan ${meta.label.toLocaleLowerCase()}`} /></div>
          <Select value={status} onValueChange={(value) => setStatus(value as "semua" | SatpamReportStatus)}><SelectTrigger className="h-9 w-full bg-background"><SelectValue placeholder="Semua status" /></SelectTrigger><SelectContent><SelectItem value="semua">Semua status</SelectItem>{statusOptions.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">{reports.length} laporan ditemukan</p>
      {reports.length ? <div className="space-y-3">{reports.map((report) => <ReportRow key={report.ticket} report={report} activities={statusHistory[report.ticket] ?? []} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} onOpenHandover={onOpenHandover} />)}</div> : <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><SearchCheck className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan yang sesuai</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter status untuk melihat laporan lainnya.</p></div>}
    </div>
  )
}

function ReportRow({ report, activities, onStatusChange, onOpenMatching, onOpenHandover }: { report: SatpamLostFoundReport; activities: StatusHistoryItem[]; onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void; onOpenMatching: () => void; onOpenHandover: () => void }) {
  const isFound = report.kind === "temuan"

  return (
    <Card role="article" className="gap-0 border border-border bg-background/60 p-4 shadow-none ring-0 transition-colors hover:border-primary/40 md:p-5">
      <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 sm:grid-cols-[6rem_minmax(0,1fr)] sm:gap-4">
        <ReportPhotoThumbnail key={report.photoUrl ?? "empty"} report={report} />
        <div className="min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div className="flex min-w-0 items-start gap-2.5">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-foreground shadow-2xs">{isFound ? <Inbox className="size-4" aria-hidden="true" /> : <PackageSearch className="size-4" aria-hidden="true" />}</span>
              <div className="min-w-0"><h3 className="text-sm font-semibold text-foreground md:text-base">{report.title}</h3><p className="mt-1 text-xs text-muted-foreground">{report.ticket} · {report.reporter}</p></div>
            </div>
            <StatusBadge status={report.status} />
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground"><span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{report.location}</span></span><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />{report.eventDate}</span><span className="flex items-center gap-1.5"><Paperclip className="size-3.5 shrink-0" aria-hidden="true" />{report.attachments} lampiran</span></div>
        </div>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex flex-wrap items-center gap-2"><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />Diperbarui {report.updatedAt}</span><Badge variant="outline" tone={isFound ? "cyan" : "violet"}>{isFound ? "Temuan" : "Kehilangan"}</Badge></div><ReportDetailDialog report={report} activities={activities} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} onOpenHandover={onOpenHandover} /></div>
    </Card>
  )
}

function ReportPhotoThumbnail({ report, size = "default" }: { report: SatpamLostFoundReport; size?: "default" | "compact" | "large" }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasPreview = Boolean(report.photoUrl) && !imageFailed
  const thumbnailSize = size === "large" ? "size-28 sm:size-32" : size === "compact" ? "size-20" : "size-20 sm:size-24"

  return <div className={cn("relative flex shrink-0 flex-col items-center justify-center gap-1 overflow-hidden rounded-lg border border-border bg-muted/40 text-center text-muted-foreground", thumbnailSize)}>{hasPreview ? <Image src={report.photoUrl!} alt={`Foto barang pada laporan ${report.title}`} fill sizes={size === "large" ? "(min-width: 640px) 128px, 112px" : size === "compact" ? "80px" : "(min-width: 640px) 96px, 80px"} className="object-cover" unoptimized onError={() => setImageFailed(true)} /> : <><ImageIcon className="size-5" aria-hidden="true" /><span className="px-1 text-[10px] leading-tight">{report.attachments > 0 ? "Pratinjau belum tersedia" : "Tidak ada foto"}</span></>}</div>
}

function HandoverDialog({
  pair,
  open,
  onOpenChange,
  onConfirm,
}: {
  pair: MatchedPair | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (recipient: string, note: string) => void
}) {
  const [recipient, setRecipient] = useState("")
  const [note, setNote] = useState("")

  if (!pair) return null

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Handshake className="size-4" aria-hidden="true" /></span><span>Konfirmasi penyerahan</span></div><DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{pair.title}</DialogTitle><DialogDescription className="mt-2">Catat penerima sebelum mengubah kedua tiket menjadi Diserahkan.</DialogDescription></div><div className="space-y-5 p-5 md:p-6"><div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)]"><div className="rounded-xl border border-border/60 bg-background/60 p-3"><p className="text-xs text-muted-foreground">Laporan kehilangan</p><p className="mt-1 text-sm font-medium text-foreground">{pair.lossTicket}</p></div><div className="hidden items-center justify-center sm:flex"><ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden="true" /></div><div className="rounded-xl border border-border/60 bg-background/60 p-3"><p className="text-xs text-muted-foreground">Barang temuan</p><p className="mt-1 text-sm font-medium text-foreground">{pair.foundTicket}</p></div></div><div className="space-y-2"><Label htmlFor="handover-recipient">Nama penerima</Label><Input id="handover-recipient" value={recipient} onChange={(event) => setRecipient(event.target.value)} className="h-9 bg-background" placeholder="Nama pelapor yang menerima barang" /></div><div className="space-y-2"><Label htmlFor="handover-note">Catatan penyerahan</Label><Textarea id="handover-note" value={note} onChange={(event) => setNote(event.target.value)} placeholder="Contoh: Identitas penerima telah diverifikasi oleh petugas." /></div><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => onOpenChange(false)}>Batal</Button><Button type="button" disabled={!recipient.trim()} onClick={() => { onConfirm(recipient.trim(), note.trim()); setRecipient(""); setNote(""); onOpenChange(false) }}><Handshake />Konfirmasi penyerahan</Button></div></div></DialogContent></Dialog>
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
  onConfirm: () => void
}) {
  if (!loss || !found) return null

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><BadgeCheck className="size-4" aria-hidden="true" /></span><span>Konfirmasi manual</span></div><DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">Catat kecocokan</DialogTitle><DialogDescription className="mt-2">Pastikan kedua laporan merujuk pada barang yang sama sebelum melanjutkan.</DialogDescription></div><div className="space-y-5 p-5 md:p-6"><div className="grid gap-3 md:grid-cols-2"><MatchPreviewCard label="Laporan kehilangan" report={loss} /><MatchPreviewCard label="Barang temuan" report={found} /></div><p className="text-xs leading-relaxed text-muted-foreground">{canValidate ? "Kedua tiket akan berstatus Barang teridentifikasi dan dapat dilanjutkan ke proses penyerahan." : "Kedua tiket harus berstatus Diproses sebelum kecocokan dapat dicatat."}</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => onOpenChange(false)}>Kembali</Button><Button type="button" disabled={!canValidate} onClick={onConfirm}><BadgeCheck />Catat kecocokan</Button></div></div></DialogContent></Dialog>
}

function MatchPreviewCard({ label, report }: { label: string; report: SatpamLostFoundReport }) {
  return <section className="rounded-xl border border-border/60 bg-background/60 p-4"><div className="flex items-start gap-3"><ReportPhotoThumbnail report={report} size="large" /><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-semibold text-foreground">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.ticket}</p><div className="mt-2"><StatusBadge status={report.status} /></div></div></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">Ciri barang</dt><dd className="mt-1 leading-relaxed text-foreground">{report.characteristics}</dd></div><div className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Lokasi</dt><dd className="mt-1 text-foreground">{report.location}</dd></div><div><dt className="text-muted-foreground">Waktu</dt><dd className="mt-1 text-foreground">{report.eventDate}, {report.eventTime}</dd></div></div></dl></section>
}

function MatchingWorkspace({
  reports,
  statusHistory,
  onStatusChange,
  onRecordMatch,
  onOpenMatching,
  onOpenHandover,
  pendingCount,
}: {
  reports: SatpamLostFoundReport[]
  statusHistory: Record<string, StatusHistoryItem[]>
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onRecordMatch: (lossTicket: string, foundTicket: string) => void
  onOpenMatching: () => void
  onOpenHandover: () => void
  pendingCount: number
}) {
  const activeReports = reports.filter((report) => report.status === "Baru" || report.status === "Diverifikasi" || report.status === "Diproses")
  const lostReports = activeReports.filter((report) => report.kind === "kehilangan")
  const foundReports = activeReports.filter((report) => report.kind === "temuan")
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
        <MatchingReportList title="Laporan kehilangan" reports={lostReports} selectedTicket={activeLossTicket} activities={statusHistory} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} onSelect={(ticket) => { setSelectedLost(ticket); setMatchingPreviewOpen(false) }} />
        <MatchingReportList title="Barang temuan" reports={foundReports} selectedTicket={activeFoundTicket} activities={statusHistory} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} onSelect={(ticket) => { setSelectedFound(ticket); setMatchingPreviewOpen(false) }} />
      </div>
      {pendingCount > 0 && <div className="flex flex-col gap-3 rounded-xl border border-border/60 bg-muted/30 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2.5"><Handshake className="size-4 shrink-0 text-primary" aria-hidden="true" /><p className="text-sm text-foreground"><span className="font-medium">{pendingCount} pasangan</span> menunggu penyerahan</p></div><Button type="button" variant="outline" size="sm" className="bg-card" onClick={onOpenHandover}>Lihat penyerahan</Button></div>}
      <MatchingConfirmationDialog loss={loss} found={found} canValidate={canValidate} open={matchingPreviewOpen} onOpenChange={setMatchingPreviewOpen} onConfirm={() => { if (loss && found && canValidate) { onRecordMatch(loss.ticket, found.ticket); setSelectedLost(""); setSelectedFound(""); setMatchingPreviewOpen(false) } }} />
    </div>
  )
}

function HandoverWorkspace({ pendingPairs, onConfirmHandover }: {
  pendingPairs: MatchedPair[]
  onConfirmHandover: (pair: MatchedPair, recipient: string, note: string) => void
}) {
  const [selectedPair, setSelectedPair] = useState<MatchedPair | null>(null)

  return (
    <div className="space-y-4">
      <div className="border-b border-border/60 pb-4">
        <h2 className="text-base font-semibold text-foreground">Menunggu penyerahan</h2>
        <p className="mt-1 text-sm text-muted-foreground">Barang yang sudah dicocokkan dan siap diserahkan kepada pelapor.</p>
      </div>
      <p className="text-xs text-muted-foreground">{pendingPairs.length} pasangan menunggu penyerahan</p>
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
                <Badge variant="outline" tone="warning">Menunggu penyerahan</Badge>
              </div>
              <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />Dicocokkan {pair.matchedAt}</span>
                <Button type="button" size="sm" onClick={() => setSelectedPair(pair)}><Handshake />Catat penyerahan</Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center">
          <Handshake className="size-6 text-muted-foreground" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-foreground">Belum ada barang yang menunggu</p>
          <p className="mt-1 text-xs text-muted-foreground">Pasangan yang dicatat akan muncul di sini.</p>
        </div>
      )}
      <HandoverDialog pair={selectedPair} open={Boolean(selectedPair)} onOpenChange={(open) => { if (!open) setSelectedPair(null) }} onConfirm={(recipient, note) => { if (selectedPair) { onConfirmHandover(selectedPair, recipient, note); setSelectedPair(null) } }} />
    </div>
  )
}

function MatchingReportList({ title, reports, selectedTicket, activities, onStatusChange, onOpenMatching, onSelect }: { title: string; reports: SatpamLostFoundReport[]; selectedTicket: string; activities: Record<string, StatusHistoryItem[]>; onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void; onOpenMatching: () => void; onSelect: (ticket: string) => void }) {
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
          <ReportDetailDialog report={report} compact activities={activities[report.ticket] ?? []} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} />
        </article>)}
      </div>
    </section>
  )
}

function SatpamLostFoundContent({ user }: { user: CurrentUser }) {
  const { notify } = useActivityNotifications()
  const [reports, setReports] = useState(satpamLostFoundReports)
  const [pendingPairs, setPendingPairs] = useState<MatchedPair[]>(satpamPendingHandovers)
  const [statusHistory, setStatusHistory] = useState<Record<string, StatusHistoryItem[]>>(() => Object.fromEntries(satpamLostFoundReports.map((report) => [report.ticket, [{ status: report.status, actor: "Sistem", timestamp: report.submittedAt, note: "Tiket dibuat" }]])))
  const [activeTab, setActiveTab] = useState<"kehilangan" | "temuan" | "pencocokan" | "penyerahan">("kehilangan")
  const lostCount = reports.filter((report) => report.kind === "kehilangan" && report.status !== "Selesai" && report.status !== "Ditolak").length
  const foundCount = reports.filter((report) => report.kind === "temuan" && report.status !== "Selesai" && report.status !== "Ditolak").length

  function updateStatus(ticket: string, status: SatpamReportStatus, note?: string, announce = true) {
    const report = reports.find((item) => item.ticket === ticket)
    setReports((current) => current.map((report) => report.ticket === ticket ? { ...report, status, updatedAt: "Baru saja" } : report))
    setStatusHistory((current) => ({ ...current, [ticket]: [...(current[ticket] ?? []), { status, actor: user.name, timestamp: "Baru saja", note }] }))
    if (announce) notify({ title: "Status laporan diperbarui", description: `${report?.ticket ?? ticket} kini berstatus ${status}.`, tone: status === "Ditolak" ? "warning" : "success" })
  }

  function recordMatch(lossTicket: string, foundTicket: string) {
    const loss = reports.find((report) => report.ticket === lossTicket && report.kind === "kehilangan")
    const found = reports.find((report) => report.ticket === foundTicket && report.kind === "temuan")
    if (loss?.status !== "Diproses" || found?.status !== "Diproses") return
    updateStatus(lossTicket, "Barang teridentifikasi", `Dicocokkan dengan tiket ${foundTicket}`, false)
    updateStatus(foundTicket, "Barang teridentifikasi", `Dicocokkan dengan tiket ${lossTicket}`, false)
    setPendingPairs((current) => [...current, { lossTicket, foundTicket, title: loss.title, reporter: loss.reporter, matchedAt: "Baru saja" }])
    notify({ title: "Pencocokan barang dicatat", description: `${lossTicket} dan ${foundTicket} telah ditandai untuk proses penyerahan.`, tone: "success" })
  }

  function confirmHandover(pair: MatchedPair, recipient: string, note: string) {
    const detail = note || `Barang diterima oleh ${recipient}`
    updateStatus(pair.lossTicket, "Diserahkan", detail, false)
    updateStatus(pair.foundTicket, "Diserahkan", detail, false)
    setPendingPairs((current) => current.filter((item) => item.lossTicket !== pair.lossTicket || item.foundTicket !== pair.foundTicket))
    notify({ title: "Penyerahan barang dikonfirmasi", description: `${pair.title} telah diserahkan kepada ${recipient}.`, tone: "success" })
  }

  return (
    <ContentShell><PageHeader title="Kehilangan & Temuan" description={`Kelola laporan, pencocokan, dan penyerahan barang, ${user.name}.`} /><Card className="shrink-0 gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><Inbox className="size-4 text-primary" aria-hidden="true" />Kehilangan & Temuan</div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-4 md:p-5"><Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "kehilangan" | "temuan" | "pencocokan" | "penyerahan")}><TabsList className="touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"><TabsTrigger value="kehilangan">Kehilangan <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{lostCount}</span></TabsTrigger><TabsTrigger value="temuan">Temuan <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{foundCount}</span></TabsTrigger><TabsTrigger value="pencocokan"><ArrowLeftRight className="size-3.5" aria-hidden="true" />Pencocokan</TabsTrigger><TabsTrigger value="penyerahan"><Handshake className="size-3.5" aria-hidden="true" />Penyerahan <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{pendingPairs.length}</span></TabsTrigger></TabsList><TabsContent value="kehilangan"><ReportList kind="kehilangan" reports={reports} statusHistory={statusHistory} onStatusChange={updateStatus} onOpenMatching={() => setActiveTab("pencocokan")} onOpenHandover={() => setActiveTab("penyerahan")} /></TabsContent><TabsContent value="temuan"><ReportList kind="temuan" reports={reports} statusHistory={statusHistory} onStatusChange={updateStatus} onOpenMatching={() => setActiveTab("pencocokan")} onOpenHandover={() => setActiveTab("penyerahan")} /></TabsContent><TabsContent value="pencocokan"><MatchingWorkspace reports={reports} statusHistory={statusHistory} onStatusChange={updateStatus} onRecordMatch={recordMatch} onOpenMatching={() => setActiveTab("pencocokan")} onOpenHandover={() => setActiveTab("penyerahan")} pendingCount={pendingPairs.length} /></TabsContent><TabsContent value="penyerahan"><HandoverWorkspace pendingPairs={pendingPairs} onConfirmHandover={confirmHandover} /></TabsContent></Tabs></CardContent></div></Card></ContentShell>
  )
}

export function SatpamLostFoundWorkspace({ user }: { user: CurrentUser }) {
  return <DashboardLayout role="satpam"><SatpamLostFoundContent user={user} /></DashboardLayout>
}
