"use client"

import { useId, useState, type ComponentProps } from "react"
import Image from "next/image"
import { CalendarDays, Check, MapPin, Paperclip, ScrollText, UserRound, Wrench } from "lucide-react"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportAttachmentsEmptyState } from "@/components/reports/report-attachments-empty-state"
import { useOperationalResource } from "@/components/reports/use-operational-data"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import type { TechnicianCommand } from "../domain/technician"
import type { TechnicianDetail, TechnicianFacilityReport } from "../types"
import { TechnicianReportTimingCells } from "./technician-report-timing-cells"
import { cn } from "cn"

const lifecycle = ["Baru", "Diverifikasi", "Diproses", "Selesai"] as const
const actions = {
  Baru: { label: "Verifikasi laporan", status: "diverifikasi", copy: "Pastikan detail kerusakan dan lokasi dapat ditindaklanjuti." },
  Diverifikasi: { label: "Mulai penanganan", status: "diproses", copy: "Tandai laporan setelah pekerjaan perbaikan mulai dilakukan." },
  Diproses: { label: "Selesaikan perbaikan", status: "selesai", copy: "Catat tindakan yang sudah dilakukan dan kondisi akhir fasilitas." },
} as const

function ReportStepper({ status }: { status: TechnicianFacilityReport["status"] }) {
  if (status === "Ditolak") return <p className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">Laporan ditolak. Alasan penolakan tersimpan pada riwayat status.</p>
  const current = lifecycle.indexOf(status)
  return <section aria-label="Progres penanganan"><div className="flex items-center justify-between"><p className="text-sm font-semibold">Progres penanganan</p><span className="text-xs text-muted-foreground">Tahap {current + 1} dari 4</span></div><ol className="mt-5 flex items-start">{lifecycle.map((step, index) => <li key={step} className="flex min-w-0 flex-1 items-start" aria-current={index === current ? "step" : undefined}><div className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={cn("flex size-7 items-center justify-center rounded-full border text-xs", index <= current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground", index === current && "ring-3 ring-primary/15")}>{index < current ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}</span><span className="text-center text-xs text-muted-foreground">{step}</span></div>{index < 3 ? <span className={cn("mt-3.5 h-px flex-1", index < current ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}</li>)}</ol></section>
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
  const action = report.status in actions ? actions[report.status as keyof typeof actions] : undefined
  const ready = Boolean(detail.data) && !detail.loading && !detail.error && !pending
  const validDecision = decision === "selesai" ? report.status === "Diproses" : report.status === "Baru"

  async function confirm() {
    if (!decision || !ready || !validDecision || !note.trim()) return
    if (await onCommand({ ticket: report.ticket, status: decision, note: note.trim() })) { setDecision(null); setNote("") }
  }
  function choose(value: "selesai" | "ditolak") { setNote(""); setDecision(value) }

  return <OperationalReportDialog open={open} onOpenChange={(value) => { if (!pending) onOpenChange(value) }} finalFocus={finalFocus} icon={Wrench} category="Laporan fasilitas" ticket={report.ticket} status={report.status} title={report.title} updatedAt={report.updatedAt}>
    <ReportStepper status={report.status} />
    <section className="rounded-xl border border-border/60 bg-muted/50 p-4" aria-label="Aksi penanganan">
      <p className="text-sm font-medium">{action ? "Aksi penanganan" : report.status === "Selesai" ? "Laporan selesai" : "Laporan ditolak"}</p>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action?.copy ?? (report.status === "Selesai" ? "Tiket telah ditutup. Catatan pekerjaan dan riwayat tetap dapat dilihat kembali." : "Tidak ada tindakan lanjutan pada tiket ini.")}</p>
      {action ? <div className="mt-4 flex flex-wrap gap-2"><Button type="button" disabled={!ready} onClick={() => action.status === "selesai" ? choose("selesai") : void onCommand({ ticket: report.ticket, status: action.status, note: "" })}>{pending ? "Menyimpan…" : action.label}</Button>{report.status === "Baru" ? <Button type="button" variant="outline" disabled={!ready} onClick={() => choose("ditolak")}>Tolak laporan</Button> : null}</div> : null}
      {detail.loading ? <p role="status" className="mt-3 text-xs text-muted-foreground">Memuat status terbaru…</p> : null}
      {detail.error ? <div className="mt-3 space-y-2"><FieldError>{detail.error}</FieldError><Button type="button" variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button></div> : null}
      {error ? <FieldError className="mt-3">{error}</FieldError> : null}
    </section>
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
          <FieldDescription>{decision === "selesai" ? "Jelaskan tindakan yang dilakukan dan kondisi akhir fasilitas." : "Jelaskan mengapa laporan tidak dapat diverifikasi."} Maksimal 2.000 karakter.</FieldDescription>
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
