"use client"

import { useId, useState } from "react"
import Image from "next/image"
import { AlignLeft, ArrowLeft, CalendarDays, ClipboardCheck, Clock3, Eye, FileText, GraduationCap, Headphones, MapPin, PackageSearch, Paperclip, Send, Tags, Wrench, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FieldError } from "@/components/ui/field"
import type { PublicAttachment } from "../application/ports"
import { ReportCategoryBadge } from "./report-category-badge"
import { reportSubmissionRows, type ReportSubmissionSnapshot } from "./report-submission-state"

const rowIcons: Record<string, LucideIcon> = {
  "Judul laporan": FileText, "Tanggal kejadian": CalendarDays, "Waktu kejadian": Clock3,
  "Lokasi kejadian": MapPin, "Jenis laporan": PackageSearch, "Nama barang": PackageSearch,
  "Objek fasilitas": Wrench, "Jenis layanan": Headphones,
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

export function ReportSubmissionPreview({ snapshot, uploadUrls, pending, error, onClose, onConfirm }: {
  snapshot: ReportSubmissionSnapshot
  uploadUrls: string[]
  pending: boolean
  error: string
  onClose: () => void
  onConfirm: () => void
}) {
  const id = useId()
  const count = snapshot.retained.length + snapshot.files.length
  return <div className="space-y-5">
      <div>
        <div className="flex flex-wrap items-center gap-2"><ReportCategoryBadge category={snapshot.payload.category} /><Badge variant="outline">Belum dikirim</Badge></div>
        <h2 className="mt-3 flex items-center gap-2 text-xl font-semibold"><ClipboardCheck className="size-5 shrink-0 text-primary" aria-hidden="true" />Periksa laporan Anda</h2>
        <p className="mt-2 text-sm text-muted-foreground">Pastikan informasi dan lampiran sudah sesuai. Laporan baru dikirim setelah Anda menekan Konfirmasi kirim.</p>
      </div>
      <div className="space-y-5 border-t border-border/60 pt-5">
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
      <div className="space-y-3 border-t border-border/60 pt-5" aria-busy={pending}>
        {error ? <FieldError>{error} Isian dan lampiran tetap tersedia; Anda dapat mencoba lagi atau kembali mengedit.</FieldError> : null}
        <p className="text-xs leading-relaxed text-muted-foreground">Setelah dikirim, pantau laporan melalui Laporan Saya. Formulir akan dikosongkan untuk laporan baru; laporan yang sudah terkirim tidak diubah.</p>
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}><ArrowLeft aria-hidden="true" />Kembali edit</Button>
          <Button type="button" disabled={pending} onClick={onConfirm}><Send aria-hidden="true" />{pending ? "Mengirim..." : "Konfirmasi kirim"}</Button>
        </div>
        {pending ? <p role="status" className="text-xs text-muted-foreground">Laporan sedang dikirim. Mohon tunggu.</p> : null}
      </div>
  </div>
}
