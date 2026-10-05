"use client"

import { useId, useRef, useState } from "react"
import Image from "next/image"
import { AlignLeft, CalendarDays, ClipboardCheck, Clock3, Eye, FileText, GraduationCap, Headphones, MapPin, PackageSearch, Paperclip, Send, Tags, Wrench, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import type { PublicAttachment } from "../application/ports"
import { ReportCategoryBadge } from "./report-category-badge"
import { reportSubmissionRows, type ReportSubmissionSnapshot } from "./report-submission-state"

const rowIcons: Record<string, LucideIcon> = {
  "Judul laporan": FileText, "Tanggal kejadian": CalendarDays, "Waktu kejadian": Clock3,
  "Lokasi kejadian": MapPin, "Jenis laporan": PackageSearch, "Nama barang": PackageSearch,
  "Ciri-ciri barang": AlignLeft, "Objek fasilitas": Wrench, "Jenis layanan": Headphones,
  "Unit / program studi": GraduationCap, "Kategori umum": Tags, "Deskripsi laporan": AlignLeft,
}

function PreviewAttachment({ file, upload, url }: { file: Pick<PublicAttachment, "name" | "mimeType" | "size"> & { id?: string }; upload?: File; url?: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  const isImage = file.mimeType.startsWith("image/")
  const href = upload ? url : `/api/pelapor/attachments/${file.id}${isImage ? "?preview=1" : ""}`
  const size = file.size < 1024 * 1024 ? `${Math.max(1, Math.round(file.size / 1024))} KB` : `${(file.size / 1024 / 1024).toFixed(1)} MB`
  return <div className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
    <span className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-background text-muted-foreground">
      {isImage && href && !imageFailed ? <Image src={href} alt={`Pratinjau ${file.name}`} fill sizes="56px" className="object-cover" unoptimized onError={() => setImageFailed(true)} /> : <FileText className="size-5" aria-hidden="true" />}
    </span>
    <div className="min-w-0 flex-1"><p className="break-all text-sm font-medium">{file.name}</p><p className="mt-1 text-xs text-muted-foreground">{size} · {upload ? "File baru" : "Dari draft"}</p></div>
    {href ? <Button nativeButton={false} render={<a href={href} target="_blank" rel="noopener noreferrer" />} variant="ghost" size="icon-sm" aria-label={`Buka lampiran ${file.name}`}><Eye aria-hidden="true" /></Button> : null}
  </div>
}

export function ReportSubmissionPreview({ snapshot, uploadUrls, pending, error, onClose, onConfirm, finalFocus }: {
  snapshot: ReportSubmissionSnapshot
  uploadUrls: string[]
  pending: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
  finalFocus: () => HTMLElement | null
}) {
  const id = useId()
  const backButton = useRef<HTMLButtonElement>(null)
  const count = snapshot.retained.length + snapshot.files.length
  return <Dialog open onOpenChange={(open, details) => { if (pending) { details.cancel(); return }; if (!open) onClose() }} disablePointerDismissal={pending}>
    <DialogContent className="flex max-w-3xl flex-col overflow-hidden p-0" showCloseButton={!pending} initialFocus={backButton} finalFocus={finalFocus}>
      <div className="shrink-0 border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
        <div className="flex flex-wrap items-center gap-2"><ReportCategoryBadge category={snapshot.payload.category} /><Badge variant="outline">Belum dikirim</Badge></div>
        <DialogTitle className="mt-3 flex items-center gap-2 text-xl"><ClipboardCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />Periksa laporan Anda</DialogTitle>
        <DialogDescription className="mt-2">Pastikan informasi dan lampiran sudah sesuai. Laporan baru dikirim setelah Anda menekan Konfirmasi kirim.</DialogDescription>
      </div>
      <div className="min-h-0 space-y-5 overflow-y-auto overscroll-contain p-5 md:p-6">
        <dl className="overflow-hidden rounded-xl border border-border/60">
          {reportSubmissionRows(snapshot.payload).map(({ label, value }) => {
            const Icon = rowIcons[label] ?? FileText
            return <div key={label} className="grid border-b border-border/60 last:border-b-0 sm:grid-cols-[11rem_minmax(0,1fr)]">
              <dt className="flex items-center gap-2 border-b border-border/60 bg-background px-4 py-3 text-xs text-muted-foreground sm:border-r sm:border-b-0"><Icon className="size-3.5 shrink-0" aria-hidden="true" />{label}</dt>
              <dd className="min-w-0 px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap wrap-anywhere">{value}</dd>
            </div>
          })}
        </dl>
        <section aria-labelledby={`${id}-attachments`}>
          <h3 id={`${id}-attachments`} className="mb-3 flex items-center gap-2 text-sm font-semibold"><Paperclip className="size-4 text-primary" aria-hidden="true" />Lampiran ({count})</h3>
          {count ? <div className="space-y-2">{snapshot.retained.map((file) => <PreviewAttachment key={file.id} file={file} />)}{snapshot.files.map((file, index) => <PreviewAttachment key={`${index}-${file.name}`} file={{ name: file.name, size: file.size, mimeType: file.type }} upload={file} url={uploadUrls[index]} />)}</div> : <div className="rounded-xl border border-dashed border-border bg-muted/30 p-4 text-sm text-muted-foreground">Tidak ada lampiran pendukung.</div>}
        </section>
      </div>
      <div className="shrink-0 space-y-3 border-t border-border/60 bg-background/60 p-5 md:px-6" aria-busy={pending}>
        {error ? <FieldError>{error} Isian dan lampiran tetap tersedia; Anda dapat mencoba lagi atau kembali mengedit.</FieldError> : null}
        <p className="text-xs leading-relaxed text-muted-foreground">Setelah dikirim, laporan masuk antrean pengelola dan tidak dapat diedit melalui formulir ini.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <DialogClose render={<Button ref={backButton} type="button" variant="outline" disabled={pending} />}>Kembali edit</DialogClose>
          <Button type="button" className="!h-9" disabled={pending} onClick={onConfirm}><Send aria-hidden="true" />{pending ? "Mengirim..." : "Konfirmasi kirim"}</Button>
        </div>
        {pending ? <p role="status" className="text-xs text-muted-foreground">Laporan sedang dikirim. Mohon tunggu.</p> : null}
      </div>
    </DialogContent>
  </Dialog>
}
