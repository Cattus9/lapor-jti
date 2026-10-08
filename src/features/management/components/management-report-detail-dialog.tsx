"use client"

import { useId, useState, type ComponentProps } from "react"
import Image from "next/image"
import { CalendarDays, Check, Clock3, MapPin, MessageSquareText, Paperclip, ScrollText, UserRound, UserRoundCog } from "lucide-react"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportAttachmentsEmptyState } from "@/components/reports/report-attachments-empty-state"
import { useOperationalResource } from "@/components/reports/use-operational-data"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import { lifecycleByCategory, statusLabels } from "../../reports/domain/report"
import type { ManagementCommand } from "../domain/management"
import type { ManagementDetail, ManagementReport, MonitoringReportCategory, MonitoringReportStatus } from "../types"
import { cn } from "cn"

export function ManagementStatusBadge({ status }: { status: MonitoringReportStatus }) { return <StatusBadge status={status} /> }
export function ManagementCategoryBadge({ category }: { category: MonitoringReportCategory }) { return <Badge tone={category === "Layanan" ? "violet" : category === "Lainnya" ? "warning" : "neutral"} variant="outline">{category}</Badge> }

function ReportStepper({ report }: { report: ManagementReport }) {
  if (report.statusKey === "ditolak") return <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Laporan ditolak. Alasan penolakan tersimpan pada riwayat status.</p>
  const stages = lifecycleByCategory[report.categoryKey], current = stages.indexOf(report.statusKey)
  return <section aria-label="Progres penanganan"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Progres penanganan</p><span className="text-xs text-muted-foreground">Tahap {current + 1} dari {stages.length}</span></div><div className="overflow-x-auto pb-1"><ol className="mt-5 flex min-w-72 items-start">{stages.map((step, index) => <li key={step} className="flex min-w-0 flex-1 items-start" aria-current={index === current ? "step" : undefined}><div className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={cn("flex size-7 items-center justify-center rounded-full border text-xs", index <= current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground", index === current && "ring-3 ring-primary/15")}>{index < current ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}</span><span className="text-center text-xs text-muted-foreground">{statusLabels[step]}</span></div>{index < stages.length - 1 ? <span className={cn("mt-3.5 h-px flex-1", index < current ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}</li>)}</ol></div></section>
}

export function ManagementReportDetailDialog({ ticket, initialReport, open, onOpenChange, finalFocus, onCommand, pending = false, error = "", onRetry, readOnly = false }: {
  ticket: string; initialReport?: ManagementReport; open: boolean; onOpenChange: (open: boolean) => void
  finalFocus?: ComponentProps<typeof OperationalReportDialog>["finalFocus"]
  onCommand?: (command: ManagementCommand) => Promise<boolean>; pending?: boolean; error?: string; onRetry: () => void; readOnly?: boolean
}) {
  const detail = useOperationalResource<ManagementDetail>(open ? `/api/manajemen/${readOnly ? "monitoring" : "reports"}/${encodeURIComponent(ticket)}` : undefined, { keepPreviousData: true })
  const report = detail.data?.report ?? initialReport
  const [decision, setDecision] = useState<"selesai" | "ditolak" | null>(null), [note, setNote] = useState("")
  const noteId = useId()
  const ready = Boolean(detail.data) && !detail.loading && !detail.error && !pending
  const editable = !readOnly && report?.handler === "Manajemen Jurusan" && Boolean(onCommand)
  const validDecision = decision === "selesai" ? report?.statusKey === "diproses" : report?.statusKey === "baru"
  async function confirm() {
    if (!decision || !ready || !validDecision || !note.trim() || !onCommand) return
    if (await onCommand({ ticket, status: decision, note: note.trim() })) { setDecision(null); setNote("") }
  }
  function choose(value: "selesai" | "ditolak") { setNote(""); setDecision(value) }
  return <OperationalReportDialog open={open} onOpenChange={(value) => { if (!pending) { if (!value) { setDecision(null); setNote("") }; onOpenChange(value) } }} finalFocus={finalFocus} icon={MessageSquareText} category={report?.category ?? "Laporan"} ticket={ticket} status={report?.status ?? "Memuat"} title={report?.title ?? "Detail laporan"} updatedAt={report?.updatedAt ?? "..."}>
    {report ? <ReportStepper report={report} /> : null}
    <section className="rounded-xl border border-border/60 bg-muted/50 p-4" aria-label="Aksi penanganan">
      <p className="text-sm font-medium">{readOnly ? "Monitoring laporan" : report?.statusKey === "selesai" ? "Laporan selesai" : report?.statusKey === "ditolak" ? "Laporan ditolak" : "Aksi penanganan"}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{readOnly ? `Penanganan dilakukan oleh ${report?.handler ?? "pengelola terkait"}. Tampilan ini hanya untuk pemantauan.` : report?.statusKey === "baru" ? "Tinjau informasi sebelum memulai penanganan laporan." : report?.statusKey === "diproses" ? "Catat tanggapan akhir sebelum laporan dinyatakan selesai." : "Tiket telah ditutup. Catatan dan riwayat tetap dapat dilihat kembali."}</p>
      {editable && report?.statusKey === "baru" ? <div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={!ready} onClick={() => void onCommand?.({ ticket, status: "diproses", note: "" })}>{pending ? "Menyimpan…" : "Mulai penanganan"}</Button><Button type="button" variant="outline" disabled={!ready} onClick={() => choose("ditolak")}>Tolak laporan</Button></div> : editable && report?.statusKey === "diproses" ? <Button type="button" className="mt-4" disabled={!ready} onClick={() => choose("selesai")}>Selesaikan laporan</Button> : null}
      {detail.loading ? <p className="mt-3 text-xs text-muted-foreground" role="status">Memuat status terbaru…</p> : null}
      {detail.error ? <div className="mt-3 space-y-2"><FieldError>{detail.error}</FieldError><Button type="button" variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button></div> : null}
      {error ? <FieldError className="mt-3">{error}</FieldError> : null}
    </section>
    {!detail.data ? <div className="space-y-3" aria-label="Memuat detail"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div> : <>
      <section className="border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><ScrollText className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold">Detail laporan</h3><p className="mt-0.5 text-xs text-muted-foreground">Informasi yang dikirimkan oleh pelapor.</p></div></div>
        <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">{[
          { icon: UserRound, label: "Pelapor", value: detail.data.report.reporter }, { icon: MessageSquareText, label: "Layanan atau konteks", value: detail.data.report.context },
          { icon: MapPin, label: "Lokasi atau kanal", value: detail.data.report.location }, { icon: CalendarDays, label: "Waktu kejadian", value: `${detail.data.report.eventDate}, ${detail.data.report.eventTime} WIB` },
          { icon: UserRoundCog, label: detail.data.report.program ? "Unit atau program studi terkait" : "Unit pelapor", value: detail.data.report.program ?? detail.data.report.reporterUnit }, { icon: Clock3, label: "Dikirim", value: `${detail.data.report.submittedAt} WIB` },
        ].map(({ icon: Icon, label, value }, index) => <div key={label} className={cn("border-b border-border/60 p-4", index % 2 === 0 && "sm:border-r")}><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</dt><dd className="mt-1.5 break-words text-sm font-medium">{value}</dd></div>)}<div className="p-4 sm:col-span-2"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><ScrollText className="size-3.5" aria-hidden="true" />Deskripsi laporan</dt><dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{detail.data.report.description}</dd></div></dl>
      </section>
      <section className="border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Paperclip className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung.</p></div></div><div className="mt-4 space-y-2">{detail.data.files.length ? detail.data.files.map((file) => <div key={file.id} className="rounded-xl border border-border/60 p-3">{file.previewUrl ? <Image unoptimized width={800} height={600} src={file.previewUrl} alt={file.name} className="mb-3 h-auto max-h-64 w-full rounded-lg object-contain" loading="lazy" /> : null}<Button nativeButton={false} render={<a href={file.url} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm" className="max-w-full"><Paperclip /><span className="truncate">{file.name}</span></Button></div>) : <ReportAttachmentsEmptyState />}</div></section>
      <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold">Riwayat status</h3><div className="mt-3 space-y-2">{[...detail.data.history].reverse().map((entry, index) => <div key={`${entry.status}-${entry.timestamp}-${index}`} className="rounded-xl border border-border/60 bg-background/60 p-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={entry.status} /><span className="text-xs text-muted-foreground">{entry.timestamp}</span></div><p className="mt-1 text-xs text-muted-foreground">Oleh {entry.actor}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.note}</p></div>)}</div></section>
    </>}
    <Dialog open={Boolean(decision)} onOpenChange={(value) => { if (!value && !pending) setDecision(null) }}><DialogContent className="z-[80] max-w-lg p-5 md:p-6" overlayClassName="z-[70] bg-foreground/30 backdrop-blur-sm dark:bg-background/65 [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none" showNestedBackdrop>
      <DialogTitle>{decision === "selesai" ? "Selesaikan laporan" : "Tolak laporan"}</DialogTitle><DialogDescription className="mt-1.5">Tanggapan ini disimpan dalam riwayat dan dapat dilihat oleh pelapor.</DialogDescription>
      <Field className="mt-4"><FieldLabel htmlFor={noteId}>{decision === "selesai" ? "Tanggapan akhir" : "Alasan penolakan"}</FieldLabel><Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={pending} /><FieldDescription>{decision === "selesai" ? "Jelaskan tindak lanjut dan hasil penanganan." : "Jelaskan mengapa laporan tidak dapat ditindaklanjuti."} Maksimal 2.000 karakter.</FieldDescription>{!validDecision ? <FieldError>Status telah berubah. Tutup konfirmasi untuk melihat status terbaru.</FieldError> : error ? <FieldError>{error}</FieldError> : null}</Field>
      <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={pending} onClick={() => setDecision(null)}>Batal</Button><Button type="button" disabled={!ready || !validDecision || !note.trim()} onClick={() => void confirm()}>{pending ? "Menyimpan…" : "Simpan dan konfirmasi"}</Button></div>
    </DialogContent></Dialog>
  </OperationalReportDialog>
}
