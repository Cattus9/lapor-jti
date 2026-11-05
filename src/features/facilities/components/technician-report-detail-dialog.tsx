"use client"

import { useId, useState, type ComponentProps } from "react"
import Image from "next/image"
import { CalendarDays, MapPin, Paperclip, ScrollText, UserRound, Wrench } from "lucide-react"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportAttachmentsEmptyState } from "@/components/reports/report-attachments-empty-state"
import { ReportOpeningTracker } from "@/components/reports/report-opening"
import { useOperationalResource } from "@/components/reports/use-operational-data"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { Stepper } from "@/components/ui/stepper"
import { Textarea } from "@/components/ui/textarea"
import type { TechnicianCommand } from "../domain/technician"
import type { TechnicianDetail, TechnicianFacilityReport } from "../types"
import { TechnicianReportTimingCells } from "./technician-report-timing-cells"
import { cn } from "cn"

function ReportStepper({ status }: { status: TechnicianFacilityReport["status"] }) {
  if (status === "Ditolak") return <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Laporan ditolak. Alasan tersimpan pada riwayat.</p>
  const first = status === "Diverifikasi" || status === "Diproses" ? status : "Baru"
  return <section aria-label="Progres penanganan"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Progres penanganan</p><span className="text-xs text-muted-foreground">Tahap {status === "Selesai" ? 2 : 1} dari 2</span></div><Stepper className="mt-5" variant="circles" steps={[{ value: first, label: first }, { value: "Selesai", label: "Selesai" }]} value={status} aria-label="Progres penanganan" /></section>
}

export function TechnicianReportDetailDialog({ report: initialReport, open, onOpenChange, finalFocus, onCommand, pending, error, onRetry }: {
  report: TechnicianFacilityReport; open: boolean; onOpenChange: (open: boolean) => void
  finalFocus: ComponentProps<typeof OperationalReportDialog>["finalFocus"]
  onCommand: (command: TechnicianCommand) => Promise<boolean>; pending: boolean; error: string; onRetry: () => void
}) {
  const detail = useOperationalResource<TechnicianDetail>(open ? `/api/teknisi/reports/${encodeURIComponent(initialReport.ticket)}` : undefined, { keepPreviousData: true })
  const report = detail.data?.report ?? initialReport
  const [decision, setDecision] = useState<"selesai" | "ditolak" | null>(null)
  const [note, setNote] = useState("")
  const noteId = useId()
  const canComplete = ["Baru", "Diverifikasi", "Diproses"].includes(report.status)
  const ready = Boolean(detail.data) && !detail.loading && !detail.error && !pending
  const validDecision = canComplete

  async function confirm() {
    if (!decision || !ready || !validDecision || !note.trim()) return
    if (await onCommand({ ticket: report.ticket, status: decision, note: note.trim() })) { setDecision(null); setNote("") }
  }
  function choose(value: "selesai" | "ditolak") { setNote(""); setDecision(value) }

  const actionPanel = <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{canComplete ? "Tindak lanjut" : report.status === "Selesai" ? "Laporan selesai" : "Laporan ditolak"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{canComplete ? "Setelah fasilitas diperbaiki, catat pekerjaan dan kondisi akhirnya." : report.status === "Selesai" ? "Catatan pekerjaan tersimpan pada riwayat." : "Alasan penolakan tersimpan pada riwayat."}</p></div>
      {canComplete ? <div className="flex flex-wrap gap-2"><Button type="button" disabled={!ready} onClick={() => choose("selesai")}>Selesaikan perbaikan</Button><Button type="button" variant="outline" disabled={!ready} onClick={() => choose("ditolak")}>Tolak laporan</Button></div> : null}</div>
    {detail.loading ? <p role="status" className="mt-3 text-xs text-muted-foreground">Memuat status terbaru…</p> : null}
    {detail.error ? <div className="mt-3 space-y-2"><FieldError>{detail.error}</FieldError><Button type="button" variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button></div> : null}
    {error ? <FieldError className="mt-3">{error}</FieldError> : null}
  </div>
  return <OperationalReportDialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value) }} finalFocus={finalFocus} icon={Wrench} category="Laporan fasilitas" submittedAt={report.submittedAt} status={report.status} title={report.title} updatedAt={report.updatedAt} action={actionPanel}>
    <ReportOpeningTracker reportId={open && detail.data && !detail.data.report.firstOpenedAt ? detail.data.report.id : undefined} onMarked={onRetry} />
    <ReportStepper status={report.status} />
    {!detail.data ? <div className="space-y-3" aria-label="Memuat detail"><Skeleton className="h-32 w-full" /><Skeleton className="h-24 w-full" /></div> : <>
      <section className="border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><ScrollText className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold">Detail laporan</h3><p className="mt-0.5 text-xs text-muted-foreground">Informasi yang dikirimkan oleh pelapor.</p></div></div>
        <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">{[
          { icon: UserRound, label: "Pelapor", value: report.reporter }, { icon: Wrench, label: "Fasilitas", value: report.facility },
          { icon: MapPin, label: "Lokasi", value: report.location }, { icon: CalendarDays, label: "Waktu kejadian", value: `${report.eventDate}, ${report.eventTime} WIB` },
        ].map(({ icon: Icon, label, value }, index) => <div key={label} className={cn("border-b border-border/60 p-4", index % 2 === 0 && "sm:border-r")}><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Icon className="size-3.5" aria-hidden="true" />{label}</dt><dd className="mt-1.5 break-words text-sm font-medium">{value}</dd></div>)}<TechnicianReportTimingCells report={report} timing={detail.data.timing} /><div className="border-t border-border/60 p-4 sm:col-span-2"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><ScrollText className="size-3.5" aria-hidden="true" />Deskripsi kerusakan</dt><dd className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed">{report.description}</dd></div></dl>
      </section>
      <section className="border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Paperclip className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung.</p></div></div><div className="mt-4 space-y-2">{detail.data.files.length ? detail.data.files.map((file) => <div key={file.id} className="rounded-xl border border-border/60 p-3">{file.previewUrl ? /* Private authenticated previews cannot pass through the public Next image optimizer. */ <Image unoptimized width={800} height={600} src={file.previewUrl} alt={file.name} className="mb-3 h-auto max-h-64 w-full rounded-lg object-contain" loading="lazy" /> : null}<Button nativeButton={false} render={<a href={file.url} target="_blank" rel="noopener noreferrer" />} variant="outline" size="sm" className="max-w-full"><Paperclip /><span className="truncate">{file.name}</span></Button></div>) : <ReportAttachmentsEmptyState />}</div></section>
      <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold">Riwayat status</h3><div className="mt-3 space-y-2">{[...detail.data.history].reverse().map((entry, index) => <div key={`${entry.status}-${entry.timestamp}-${index}`} className="rounded-xl border border-border/60 bg-background/60 p-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={entry.status} /><span className="text-xs text-muted-foreground">{entry.timestamp}</span></div><p className="mt-1 text-xs text-muted-foreground">Oleh {entry.actor}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.note}</p></div>)}</div></section>
    </>}
    <Dialog open={Boolean(decision)} onOpenChange={(value) => { if (!value && !pending) setDecision(null) }}>
      {/* Match Satpam's nested layers: blur the report below, never the confirmation form. */}
      <DialogContent className="z-[80] max-w-lg p-5 md:p-6" overlayClassName="z-[70] bg-foreground/30 backdrop-blur-sm dark:bg-background/65 [@media(prefers-reduced-transparency:reduce)]:backdrop-blur-none" showNestedBackdrop>
        <DialogTitle>{decision === "selesai" ? "Selesaikan perbaikan" : "Tolak laporan"}</DialogTitle>
        <DialogDescription className="mt-1.5">Catatan ini disimpan pada riwayat dan dapat dilihat oleh pelapor.</DialogDescription>
        <Field className="mt-4">
          <FieldLabel htmlFor={noteId}>{decision === "selesai" ? "Catatan pekerjaan" : "Alasan penolakan"}</FieldLabel>
          <Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} disabled={pending} />
          <FieldDescription>{decision === "selesai" ? "Jelaskan tindakan yang dilakukan dan kondisi akhir fasilitas." : "Jelaskan mengapa laporan tidak dapat ditindaklanjuti, misalnya duplikat atau di luar cakupan."} Maksimal 2.000 karakter.</FieldDescription>
          {!validDecision ? <FieldError>Status telah berubah. Tutup konfirmasi untuk melihat status terbaru.</FieldError> : error ? <FieldError>{error}</FieldError> : null}
        </Field>
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={() => setDecision(null)}>Batal</Button>
          <Button type="button" disabled={!ready || !validDecision || !note.trim()} onClick={() => void confirm()}>{pending ? "Menyimpan…" : "Simpan dan konfirmasi"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  </OperationalReportDialog>
}
