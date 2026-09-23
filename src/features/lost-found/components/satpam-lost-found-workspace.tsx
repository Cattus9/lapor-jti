"use client"

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
import { manualReviewPairs, satpamLostFoundReports, type SatpamLostFoundReport, type SatpamReportKind, type SatpamReportStatus } from "@/features/lost-found/mock/satpam-lost-found"
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

type MatchedPair = {
  lossTicket: string
  foundTicket: string
  title: string
  reporter: string
}

const statusActions: Partial<Record<SatpamReportStatus, { label: string; nextStatus: SatpamReportStatus; description: string }>> = {
  Baru: { label: "Verifikasi laporan", nextStatus: "Diverifikasi", description: "Pastikan informasi dan ciri barang dapat ditindaklanjuti." },
  Diverifikasi: { label: "Mulai penanganan", nextStatus: "Diproses", description: "Tandai laporan setelah proses pencarian atau pemeriksaan dimulai." },
  "Barang teridentifikasi": { label: "Konfirmasi penyerahan", nextStatus: "Diserahkan", description: "Gunakan setelah barang benar-benar diserahkan kepada pelapor." },
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
}: {
  report: SatpamLostFoundReport
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onOpenMatching: () => void
}) {
  const [showRejectionForm, setShowRejectionForm] = useState(false)
  const [rejectionReason, setRejectionReason] = useState("")
  const action = statusActions[report.status]

  if (report.status === "Ditolak") {
    return <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4"><p className="text-sm font-medium text-destructive">Laporan ditolak</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tidak ada tindakan lanjutan yang dapat dilakukan pada tiket ini.</p></div>
  }

  if (report.status === "Selesai") {
    return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Laporan selesai</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tiket telah ditutup dan dapat dilihat kembali pada Riwayat.</p></div>
  }

  if (report.status === "Diproses") {
    return <div className="rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex items-start gap-3"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-primary/20 bg-background text-primary"><ArrowLeftRight className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">Lanjutkan melalui pencocokan barang</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Periksa ciri barang, lokasi, dan waktu pada kedua laporan. Konfirmasi pencocokan setelah hasil pemeriksaan sesuai.</p></div></div><div className="mt-4 flex justify-end"><Button type="button" className="shrink-0" onClick={onOpenMatching}><ArrowLeftRight />Buka pencocokan</Button></div></div>
  }

  if (!action) return null

  return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Aksi penanganan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action.description}</p>{showRejectionForm ? <div className="mt-4 space-y-3"><Label htmlFor={`rejection-reason-${report.ticket}`}>Alasan penolakan</Label><Textarea id={`rejection-reason-${report.ticket}`} value={rejectionReason} onChange={(event) => setRejectionReason(event.target.value)} placeholder="Jelaskan alasan laporan tidak dapat diverifikasi" /><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => { setShowRejectionForm(false); setRejectionReason("") }}>Batal</Button><Button type="button" variant="destructive" disabled={!rejectionReason.trim()} onClick={() => { onStatusChange(report.ticket, "Ditolak", rejectionReason.trim()); setShowRejectionForm(false); setRejectionReason("") }}>Tolak laporan</Button></div></div> : <div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="button" onClick={() => onStatusChange(report.ticket, action.nextStatus)}>{action.label}</Button>{report.status === "Baru" || report.status === "Diverifikasi" ? <Button type="button" variant="destructive" onClick={() => setShowRejectionForm(true)}>Tolak laporan</Button> : null}</div>}</div>
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
}: {
  report: SatpamLostFoundReport
  compact?: boolean
  activities: StatusHistoryItem[]
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onOpenMatching: () => void
}) {
  const isFound = report.kind === "temuan"
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button type="button" variant="outline" size={compact ? "icon-sm" : "sm"} className="shrink-0 bg-card hover:bg-muted" aria-label={compact ? `Lihat cepat ${report.title}` : undefined} />}>
        {compact ? <><Eye className="size-3.5" aria-hidden="true" /><span className="sr-only">Lihat cepat</span></> : "Lihat detail"}
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
          <StatusActionPanel report={report} onStatusChange={onStatusChange} onOpenMatching={() => { setOpen(false); onOpenMatching() }} />
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
            <div className="mt-4 flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ImageIcon className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">{report.attachments ? `${report.attachments} lampiran tersedia` : "Tidak ada lampiran"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.attachments ? "Pratinjau file akan tersedia setelah integrasi penyimpanan lampiran." : "Pelapor tidak menambahkan foto atau dokumen pendukung."}</p></div></div>
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
}: {
  kind: SatpamReportKind
  reports: SatpamLostFoundReport[]
  statusHistory: Record<string, StatusHistoryItem[]>
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onOpenMatching: () => void
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
      {reports.length ? <div className="space-y-3">{reports.map((report) => <ReportRow key={report.ticket} report={report} activities={statusHistory[report.ticket] ?? []} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} />)}</div> : <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><SearchCheck className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan yang sesuai</p><p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter status untuk melihat laporan lainnya.</p></div>}
    </div>
  )
}

function ReportRow({ report, activities, onStatusChange, onOpenMatching }: { report: SatpamLostFoundReport; activities: StatusHistoryItem[]; onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void; onOpenMatching: () => void }) {
  const isFound = report.kind === "temuan"

  return (
    <article className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40 md:p-5">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-2xs">{isFound ? <Inbox className="size-5" aria-hidden="true" /> : <PackageSearch className="size-5" aria-hidden="true" />}</span><div className="min-w-0"><h3 className="truncate text-sm font-semibold text-foreground md:text-base">{report.title}</h3><p className="mt-1 text-xs text-muted-foreground">{report.ticket} · {report.reporter}</p></div></div>
        <StatusBadge status={report.status} />
      </div>
      <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-3"><span className="flex min-w-0 items-center gap-1.5"><MapPin className="size-3.5 shrink-0" aria-hidden="true" /><span className="truncate">{report.location}</span></span><span className="flex items-center gap-1.5"><CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />{report.eventDate}</span><span className="flex items-center gap-1.5"><Paperclip className="size-3.5 shrink-0" aria-hidden="true" />{report.attachments} lampiran</span></div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"><span className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />Diperbarui {report.updatedAt}</span><ReportDetailDialog report={report} activities={activities} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} /></div>
    </article>
  )
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
  criteria,
  open,
  onOpenChange,
  onConfirm,
}: {
  loss?: SatpamLostFoundReport
  found?: SatpamLostFoundReport
  criteria: string[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: () => void
}) {
  if (!loss || !found) return null

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent><div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><SearchCheck className="size-4" aria-hidden="true" /></span><span>Tinjauan akhir</span></div><DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">Validasi pencocokan</DialogTitle><DialogDescription className="mt-2">Periksa kedua laporan sebelum mencatat barang sebagai teridentifikasi.</DialogDescription></div><div className="space-y-5 p-5 md:p-6"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)]"><MatchPreviewCard label="Laporan kehilangan" report={loss} /><div className="hidden items-center justify-center md:flex"><ArrowLeftRight className="size-4 text-muted-foreground" aria-hidden="true" /></div><MatchPreviewCard label="Barang temuan" report={found} /></div><section className="rounded-xl border border-border/60 bg-muted/30 p-4"><p className="text-sm font-medium text-foreground">Indikator pemeriksaan</p><ul className="mt-3 space-y-2">{criteria.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul></section><p className="text-xs leading-relaxed text-muted-foreground">Validasi akan memperbarui status kedua tiket menjadi Barang teridentifikasi. Lanjutkan hanya jika hasil pemeriksaan telah sesuai.</p><div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => onOpenChange(false)}>Kembali</Button><Button type="button" onClick={onConfirm}><BadgeCheck />Validasi pencocokan</Button></div></div></DialogContent></Dialog>
}

function MatchPreviewCard({ label, report }: { label: string; report: SatpamLostFoundReport }) {
  const isFound = report.kind === "temuan"

  return <section className="rounded-xl border border-border/60 bg-background/60 p-4"><div className="flex items-start gap-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">{isFound ? <Inbox className="size-4" aria-hidden="true" /> : <PackageSearch className="size-4" aria-hidden="true" />}</span><div className="min-w-0"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 truncate text-sm font-semibold text-foreground">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.ticket}</p></div></div><div className="mt-4 flex min-h-20 items-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 p-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground"><ImageIcon className="size-4" aria-hidden="true" /></span><div><p className="text-xs font-medium text-foreground">{report.attachments ? `${report.attachments} lampiran pendukung` : "Tanpa lampiran"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.attachments ? "Pratinjau foto tersedia setelah penyimpanan lampiran terintegrasi." : "Gunakan detail ciri dan konteks laporan untuk pemeriksaan."}</p></div></div><dl className="mt-4 space-y-3 text-xs"><div><dt className="text-muted-foreground">Ciri barang</dt><dd className="mt-1 leading-relaxed text-foreground">{report.characteristics}</dd></div><div className="grid gap-2 sm:grid-cols-2"><div><dt className="text-muted-foreground">Lokasi</dt><dd className="mt-1 text-foreground">{report.location}</dd></div><div><dt className="text-muted-foreground">Waktu</dt><dd className="mt-1 text-foreground">{report.eventDate}, {report.eventTime}</dd></div></div></dl></section>
}

function MatchingWorkspace({
  reports,
  statusHistory,
  onStatusChange,
  onRecordMatch,
  onConfirmHandover,
  onOpenMatching,
}: {
  reports: SatpamLostFoundReport[]
  statusHistory: Record<string, StatusHistoryItem[]>
  onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void
  onRecordMatch: (lossTicket: string, foundTicket: string) => void
  onConfirmHandover: (pair: MatchedPair, recipient: string, note: string) => void
  onOpenMatching: () => void
}) {
  const lostReports = reports.filter((report) => report.kind === "kehilangan" && report.status === "Diproses")
  const foundReports = reports.filter((report) => report.kind === "temuan" && report.status === "Diproses")
  const [selectedLost, setSelectedLost] = useState(lostReports[0]?.ticket ?? "")
  const [selectedFound, setSelectedFound] = useState(foundReports[0]?.ticket ?? "")
  const [matchedPair, setMatchedPair] = useState<MatchedPair | null>(null)
  const [matchingPreviewOpen, setMatchingPreviewOpen] = useState(false)
  const [handoverOpen, setHandoverOpen] = useState(false)
  const [handoverRecorded, setHandoverRecorded] = useState(false)
  const [handoverRecipient, setHandoverRecipient] = useState("")
  const activeLossTicket = lostReports.some((report) => report.ticket === selectedLost) ? selectedLost : lostReports[0]?.ticket ?? ""
  const activeFoundTicket = foundReports.some((report) => report.ticket === selectedFound) ? selectedFound : foundReports[0]?.ticket ?? ""
  const candidate = manualReviewPairs.find((item) => item.lossTicket === activeLossTicket && item.foundTicket === activeFoundTicket)
  const loss = lostReports.find((report) => report.ticket === activeLossTicket)
  const found = foundReports.find((report) => report.ticket === activeFoundTicket)

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-2 border-b border-border/60 pb-4 md:flex-row md:items-end md:justify-between"><div><h2 className="text-base font-semibold text-foreground">Pencocokan barang</h2><p className="mt-1 text-sm text-muted-foreground">Bandingkan laporan kehilangan dengan temuan aktif sebelum menandai barang teridentifikasi.</p></div><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><BadgeCheck className="size-4 text-primary" aria-hidden="true" />Gunakan ciri fisik dan konteks lokasi</span></div>
      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_2.5rem_minmax(0,1fr)]">
        <CandidateList title="Laporan kehilangan" reports={lostReports} selectedTicket={activeLossTicket} activities={statusHistory} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} onSelect={(ticket) => { setSelectedLost(ticket); setMatchedPair(null); setMatchingPreviewOpen(false); setHandoverRecorded(false); setHandoverRecipient("") }} />
        <div className="hidden h-full items-center justify-center xl:flex"><ArrowLeftRight className="size-5 text-muted-foreground" aria-hidden="true" /></div>
        <CandidateList title="Barang temuan" reports={foundReports} selectedTicket={activeFoundTicket} activities={statusHistory} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} onSelect={(ticket) => { setSelectedFound(ticket); setMatchedPair(null); setMatchingPreviewOpen(false); setHandoverRecorded(false); setHandoverRecipient("") }} />
      </div>
      <Card className="gap-1 rounded-xl border-border bg-muted/50 p-1.5 shadow-none"><div className="rounded-lg border border-border/60 bg-card p-4 md:p-5"><div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between"><div className="min-w-0"><div className="flex items-center gap-2"><span className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-primary"><SearchCheck className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-foreground">Indikasi kesesuaian</p><p className="mt-0.5 text-xs text-muted-foreground">{loss && found ? `${loss.ticket} dibandingkan dengan ${found.ticket}` : "Pilih dua laporan untuk mulai membandingkan."}</p></div></div>{candidate ? <div className="mt-4 space-y-2.5"><Badge tone="primary" variant="outline">Perlu konfirmasi Satpam</Badge><ul className="space-y-2">{candidate.criteria.map((item) => <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground"><Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />{item}</li>)}</ul><p className="text-xs leading-relaxed text-muted-foreground">Indikator ini membantu pemeriksaan, bukan keputusan otomatis.</p></div> : <p className="mt-4 text-sm leading-relaxed text-muted-foreground">Belum ada pasangan yang dapat diperiksa. Bandingkan ciri, lokasi, dan waktu sebelum membuat keputusan.</p>}</div>{!matchedPair ? <Button type="button" className="lg:mt-0" disabled={!candidate} onClick={() => setMatchingPreviewOpen(true)}><Eye className="size-4" />Tinjau pencocokan</Button> : null}</div></div></Card>
      {matchedPair ? <Card className="gap-1 rounded-xl border-emerald-200 bg-emerald-50/60 p-1.5 shadow-none"><div className="rounded-lg border border-emerald-200 bg-card p-4 md:p-5"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-700"><BadgeCheck className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-semibold text-foreground">{handoverRecorded ? `${matchedPair.title} telah diserahkan` : `${matchedPair.title} siap diserahkan`}</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{handoverRecorded ? `Barang telah diterima oleh ${handoverRecipient}. Kedua tiket kini berstatus Diserahkan.` : `${matchedPair.lossTicket} dan ${matchedPair.foundTicket} telah dipasangkan. Konfirmasi penyerahan kepada ${matchedPair.reporter} saat barang diterima.`}</p></div></div>{handoverRecorded ? null : <Button type="button" className="shrink-0" onClick={() => setHandoverOpen(true)}><Handshake />Konfirmasi penyerahan</Button>}</div></div></Card> : null}
      <MatchingConfirmationDialog loss={loss} found={found} criteria={candidate?.criteria ?? []} open={matchingPreviewOpen} onOpenChange={setMatchingPreviewOpen} onConfirm={() => { if (loss && found) { onRecordMatch(loss.ticket, found.ticket); setMatchedPair({ lossTicket: loss.ticket, foundTicket: found.ticket, title: loss.title, reporter: loss.reporter }); setMatchingPreviewOpen(false) } }} />
      <HandoverDialog pair={matchedPair} open={handoverOpen} onOpenChange={setHandoverOpen} onConfirm={(recipient, note) => { if (matchedPair) { onConfirmHandover(matchedPair, recipient, note); setHandoverRecipient(recipient); setHandoverRecorded(true) } }} />
    </div>
  )
}

function CandidateList({ title, reports, selectedTicket, activities, onStatusChange, onOpenMatching, onSelect }: { title: string; reports: SatpamLostFoundReport[]; selectedTicket: string; activities: Record<string, StatusHistoryItem[]>; onStatusChange: (ticket: string, status: SatpamReportStatus, note?: string) => void; onOpenMatching: () => void; onSelect: (ticket: string) => void }) {
  return (
    <section className="rounded-xl border border-border/60 bg-background/50 p-3.5"><div className="flex items-center justify-between gap-3"><h3 className="text-sm font-semibold text-foreground">{title}</h3><span className="text-xs text-muted-foreground">{reports.length} aktif</span></div><div className="mt-3 space-y-2">{reports.map((report) => <article key={report.ticket} className={cn("group flex items-center gap-2 rounded-xl border p-2.5 transition-colors", selectedTicket === report.ticket ? "border-primary bg-primary/5" : "border-border bg-card hover:border-primary/40 hover:bg-muted/40")}><Button type="button" variant="ghost" className="h-auto min-w-0 flex-1 justify-start rounded-lg p-0 text-left whitespace-normal hover:bg-transparent focus-visible:ring-3 focus-visible:ring-ring/50" aria-pressed={selectedTicket === report.ticket} onClick={() => onSelect(report.ticket)}><span className="flex min-w-0 flex-1 items-start gap-2.5"><span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-muted-foreground">{report.kind === "temuan" ? <Inbox className="size-3.5" aria-hidden="true" /> : <PackageSearch className="size-3.5" aria-hidden="true" />}</span><span className="min-w-0"><span className="block truncate text-sm font-medium text-foreground">{report.title}</span><span className="mt-1 block truncate text-xs font-normal text-muted-foreground">{report.ticket} · {report.location}</span></span></span></Button><ReportDetailDialog report={report} compact activities={activities[report.ticket] ?? []} onStatusChange={onStatusChange} onOpenMatching={onOpenMatching} /></article>)}</div></section>
  )
}

function SatpamLostFoundContent({ user }: { user: CurrentUser }) {
  const { notify } = useActivityNotifications()
  const [reports, setReports] = useState(satpamLostFoundReports)
  const [statusHistory, setStatusHistory] = useState<Record<string, StatusHistoryItem[]>>(() => Object.fromEntries(satpamLostFoundReports.map((report) => [report.ticket, [{ status: report.status, actor: "Sistem", timestamp: report.submittedAt, note: "Tiket dibuat" }]])))
  const [activeTab, setActiveTab] = useState<"kehilangan" | "temuan" | "pencocokan">("kehilangan")
  const lostCount = reports.filter((report) => report.kind === "kehilangan" && report.status !== "Selesai" && report.status !== "Ditolak").length
  const foundCount = reports.filter((report) => report.kind === "temuan" && report.status !== "Selesai" && report.status !== "Ditolak").length

  function updateStatus(ticket: string, status: SatpamReportStatus, note?: string, announce = true) {
    const report = reports.find((item) => item.ticket === ticket)
    setReports((current) => current.map((report) => report.ticket === ticket ? { ...report, status, updatedAt: "Baru saja" } : report))
    setStatusHistory((current) => ({ ...current, [ticket]: [...(current[ticket] ?? []), { status, actor: user.name, timestamp: "Baru saja", note }] }))
    if (announce) notify({ title: "Status laporan diperbarui", description: `${report?.ticket ?? ticket} kini berstatus ${status}.`, tone: status === "Ditolak" ? "warning" : "success" })
  }

  function recordMatch(lossTicket: string, foundTicket: string) {
    updateStatus(lossTicket, "Barang teridentifikasi", `Dicocokkan dengan tiket ${foundTicket}`, false)
    updateStatus(foundTicket, "Barang teridentifikasi", `Dicocokkan dengan tiket ${lossTicket}`, false)
    notify({ title: "Pencocokan barang dicatat", description: `${lossTicket} dan ${foundTicket} telah ditandai untuk proses penyerahan.`, tone: "success" })
  }

  function confirmHandover(pair: MatchedPair, recipient: string, note: string) {
    const detail = note || `Barang diterima oleh ${recipient}`
    updateStatus(pair.lossTicket, "Diserahkan", detail, false)
    updateStatus(pair.foundTicket, "Diserahkan", detail, false)
    notify({ title: "Penyerahan barang dikonfirmasi", description: `${pair.title} telah diserahkan kepada ${recipient}.`, tone: "success" })
  }

  return (
    <ContentShell><PageHeader title="Kehilangan & Temuan" description={`Kelola laporan aktif dan pencocokan barang, ${user.name}.`} /><Card className="shrink-0 gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><Inbox className="size-4 text-primary" aria-hidden="true" />Kehilangan & Temuan</div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-4 md:p-5"><Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "kehilangan" | "temuan" | "pencocokan")}><TabsList><TabsTrigger value="kehilangan">Kehilangan <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{lostCount}</span></TabsTrigger><TabsTrigger value="temuan">Temuan <span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{foundCount}</span></TabsTrigger><TabsTrigger value="pencocokan"><ArrowLeftRight className="size-3.5" aria-hidden="true" />Pencocokan barang</TabsTrigger></TabsList><TabsContent value="kehilangan"><ReportList kind="kehilangan" reports={reports} statusHistory={statusHistory} onStatusChange={updateStatus} onOpenMatching={() => setActiveTab("pencocokan")} /></TabsContent><TabsContent value="temuan"><ReportList kind="temuan" reports={reports} statusHistory={statusHistory} onStatusChange={updateStatus} onOpenMatching={() => setActiveTab("pencocokan")} /></TabsContent><TabsContent value="pencocokan"><MatchingWorkspace reports={reports} statusHistory={statusHistory} onStatusChange={updateStatus} onRecordMatch={recordMatch} onConfirmHandover={confirmHandover} onOpenMatching={() => setActiveTab("pencocokan")} /></TabsContent></Tabs></CardContent></div></Card></ContentShell>
  )
}

export function SatpamLostFoundWorkspace({ user }: { user: CurrentUser }) {
  return <DashboardLayout role="satpam"><SatpamLostFoundContent user={user} /></DashboardLayout>
}
