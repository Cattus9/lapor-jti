"use client"

import Link from "next/link"
import Image from "next/image"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Image as ImageIcon, List, MapPin, PackageCheck, PackageSearch, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { ReportDetailTable } from "@/components/reports/report-detail-section"
import { cn } from "cn"
import { foundNoticeStates, parseFoundNoticeRef, type FoundNotice, type FoundNoticeDetail, type FoundNoticePage, type FoundNoticeRef } from "../domain/found-notice"

const time = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
const key = (notice: FoundNoticeRef) => `${notice.source}:${notice.id}`

function FoundPhoto({ notice, large = false, detail = false }: { notice: FoundNotice; large?: boolean; detail?: boolean }) {
  const [failed, setFailed] = useState(false)
  return <span className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/40 text-muted-foreground ${detail ? "aspect-video max-h-80 w-full" : large ? "aspect-video max-h-40 w-full" : "size-12"}`}>
    {notice.hasPhoto && !failed ? <Image src={`/api/pelapor/found-notices/${encodeURIComponent(notice.id)}/photo?source=${notice.source}`} alt={detail ? `Foto barang ${notice.itemName}` : ""} fill sizes={detail ? "(min-width: 640px) 576px, 90vw" : large ? "(min-width: 1280px) 32vw, 100vw" : "48px"} className={large || detail ? "object-contain" : "object-cover"} unoptimized onError={() => setFailed(true)} /> : <span className="flex flex-col items-center gap-2"><PackageSearch className={large || detail ? "size-10" : "size-5"} aria-hidden="true" />{detail ? <span className="text-xs">Foto belum tersedia</span> : null}</span>}
  </span>
}

export function FoundNoticeList({ initialPage, preview = false }: { initialPage: FoundNoticePage; preview?: boolean }) {
  const [page, setPage] = useState(initialPage)
  const [selected, setSelected] = useState<FoundNoticeRef | null>(null)
  const [detail, setDetail] = useState<FoundNoticeDetail | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
  const [view, setView] = useState<"list" | "photo">("list")
  const [photoIndex, setPhotoIndex] = useState(0)
  const requestVersion = useRef(0)
  useEffect(() => () => { requestVersion.current++ }, [])

  async function open(notice: FoundNoticeRef) {
    const version = ++requestVersion.current
    setSelected(notice); setDetail(null); setError(""); setLoadingDetail(true)
    try {
      const response = await fetch(`/api/pelapor/found-notices/${encodeURIComponent(notice.id)}?source=${notice.source}`, { cache: "no-store" })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Informasi temuan belum berhasil dimuat.")
      if (version !== requestVersion.current) return
      setDetail(data as FoundNoticeDetail)
      const read = await fetch("/api/pelapor/found-notices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(parseFoundNoticeRef(notice)) })
      if (!read.ok) {
        const result = await read.json().catch(() => null)
        const reason = typeof result?.error === "string" ? ` ${result.error}` : " Coba buka kembali."
        throw new Error(`Informasi terbuka, tetapi tanda sudah dibaca belum tersimpan.${reason}`)
      }
      if (version !== requestVersion.current) return
      setPage(current => {
        const wasUnread = current.items.some(item => key(item) === key(notice) && !item.read)
        return { ...current, unread: Math.max(0, current.unread - Number(wasUnread)), items: current.items.map(item => key(item) === key(notice) ? { ...item, read: true } : item) }
      })
    } catch (cause) { if (version === requestVersion.current) setError(cause instanceof Error ? cause.message : "Koneksi bermasalah.") }
    finally { if (version === requestVersion.current) setLoadingDetail(false) }
  }

  async function loadMore() {
    if (!page.nextCursor || loadingMore) return
    setLoadingMore(true); setError("")
    try {
      const response = await fetch(`/api/pelapor/found-notices?cursor=${encodeURIComponent(page.nextCursor)}`, { cache: "no-store" })
      const data = await response.json() as FoundNoticePage & { error?: string }
      if (!response.ok) throw new Error(data.error || "Informasi temuan belum berhasil dimuat.")
      setPage(current => ({ ...data, items: [...new Map([...current.items, ...data.items].map(item => [key(item), item])).values()] }))
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koneksi bermasalah.") }
    finally { setLoadingMore(false) }
  }

  return <>
    <SectionCard title="Informasi barang temuan" icon={PackageSearch} className={preview ? "xl:h-full" : undefined} contentClassName={preview ? "xl:flex xl:flex-1 xl:flex-col" : undefined} meta={preview
      ? <Button variant="ghost" size="xs" className="-my-1.5" nativeButton={false} render={<Link href="/pelapor/notifikasi?tab=temuan" />}>Lihat semua<ArrowRight className="size-3.5" /></Button>
      : `${page.unread} belum dibaca`}>
      {preview ? page.items.length ? <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium text-muted-foreground">Temuan terbaru</p>
        <div className="flex gap-1 rounded-lg border border-border bg-muted/50 p-1" role="group" aria-label="Tampilan barang temuan">
          <Button type="button" size="sm" variant={view === "list" ? "secondary" : "ghost"} className="h-7 px-2" aria-pressed={view === "list"} onClick={() => setView("list")}><List />Daftar</Button>
          <Button type="button" size="sm" variant={view === "photo" ? "secondary" : "ghost"} className="h-7 px-2" aria-pressed={view === "photo"} onClick={() => setView("photo")}><ImageIcon />Foto</Button>
        </div>
      </div> : null : <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Barang yang dilaporkan ditemukan di lingkungan JTI.</p>}
      {error && !selected ? <FieldError className="mb-3">{error}</FieldError> : null}
      {preview && view === "photo" && page.items.length ? <div className="flex flex-1 flex-col gap-3">
        {(() => { const notice = page.items[Math.min(photoIndex, page.items.length - 1)]; return <Button key={key(notice)} type="button" variant="outline" onClick={() => void open(notice)} className="h-auto w-full flex-col items-stretch gap-3 whitespace-normal bg-report-surface p-3 text-left shadow-none">
          <FoundPhoto key={key(notice)} notice={notice} large />
          <span className="flex flex-wrap items-center gap-2"><span className="font-semibold text-foreground">{notice.itemName}</span><Badge variant="outline" tone={foundNoticeStates[notice.state].tone}>{foundNoticeStates[notice.state].label}</Badge>{!notice.read ? <span className="size-2 rounded-full bg-primary" aria-label="Belum dibaca" /> : null}</span>
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs font-normal text-muted-foreground"><span className="flex items-center gap-1.5"><MapPin className="size-3.5" aria-hidden="true" />{notice.foundLocation}</span><span>{time.format(new Date(notice.publishedAt))} WIB</span></span>
          <span className="flex items-center gap-1 text-xs text-primary">Lihat detail <ArrowRight className="size-3.5" /></span>
        </Button> })()}
        <div className="mt-auto flex items-center justify-center gap-3" aria-label="Navigasi foto temuan">
          <Button type="button" variant="outline" size="icon-sm" aria-label="Barang sebelumnya" disabled={photoIndex === 0} onClick={() => setPhotoIndex(index => Math.max(0, index - 1))}><ChevronLeft /></Button>
          <span className="text-xs text-muted-foreground" aria-live="polite">{Math.min(photoIndex + 1, page.items.length)} / {page.items.length}</span>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Barang berikutnya" disabled={photoIndex >= page.items.length - 1} onClick={() => setPhotoIndex(index => Math.min(page.items.length - 1, index + 1))}><ChevronRight /></Button>
        </div>
      </div> : <div className="space-y-2">
        {page.items.map(notice => <Button key={key(notice)} type="button" variant="outline" disabled={loadingMore} onClick={() => void open(notice)} className={cn("h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-xl p-4 text-left shadow-none transition-colors hover:border-primary/40", !preview && !notice.read ? "border-primary/20 bg-primary/5" : "bg-report-surface")}>
          <FoundPhoto key={key(notice)} notice={notice} />
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="flex flex-wrap items-center gap-2"><span className="min-w-0 break-words font-semibold text-foreground">{notice.itemName}</span><Badge variant="outline" tone={foundNoticeStates[notice.state].tone}>{foundNoticeStates[notice.state].label}</Badge>{!notice.read ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" /> : null}</span>
            <span className="flex items-start gap-1.5 text-xs font-normal text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{notice.foundLocation}</span>
            <span className="block text-xs font-normal text-muted-foreground">{time.format(new Date(notice.publishedAt))} WIB</span>
          </span>
          <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>)}
        {!page.items.length ? <CollectionEmptyState icon={PackageSearch} title={preview ? "Belum ada informasi temuan aktif" : "Belum ada informasi temuan"} description="Informasi muncul ketika mahasiswa melaporkan temuan atau Satpam menerima barang di pos." size="compact" /> : null}
      </div>}
      {!preview && page.nextCursor ? <Button type="button" variant="outline" className="mt-4 w-full" disabled={loadingMore} onClick={() => void loadMore()}>{loadingMore ? "Memuat…" : "Muat temuan berikutnya"}</Button> : null}
    </SectionCard>
    <Dialog open={Boolean(selected)} onOpenChange={value => { if (!value) { requestVersion.current++; setSelected(null); setError("") } }}>
      <DialogContent className="gap-5 p-5 sm:max-w-xl sm:p-6">
        <DialogHeader>
          <DialogTitle>{detail?.itemName ?? "Informasi barang temuan"}</DialogTitle>
          <DialogDescription>{detail?.state === "reported" ? "Temuan ini dilaporkan mahasiswa. Keberadaan barang di pos belum dikonfirmasi." : "Periksa lokasi dan keberadaan barang sebelum menghubungi Pos Satpam."}</DialogDescription>
        </DialogHeader>
        {loadingDetail ? <p role="status" className="text-sm text-muted-foreground">Memuat informasi temuan…</p> : null}
        {error ? <div className="space-y-2"><FieldError>{error}</FieldError><Button type="button" variant="outline" size="sm" onClick={() => selected && void open(selected)}>Coba lagi</Button></div> : null}
        {detail ? <div className="space-y-4">
          <Badge variant="outline" tone={foundNoticeStates[detail.state].tone}>{foundNoticeStates[detail.state].label}</Badge>
          <section className="space-y-2" aria-label="Foto barang"><h3 className="text-sm font-semibold">Foto barang</h3>{detail.hasPhoto ? <FoundPhoto key={key(detail)} notice={detail} detail /> : <p className="text-xs text-muted-foreground">Belum ada foto barang.</p>}</section>
          <ReportDetailTable rows={[
            { icon: MapPin, label: "Lokasi ditemukan", value: detail.foundLocation },
            { icon: CalendarDays, label: "Informasi diterbitkan", value: `${time.format(new Date(detail.publishedAt))} WIB` },
            ...(detail.storageLocation && detail.state === "stored" ? [{ icon: PackageCheck, label: "Disimpan di", value: detail.storageLocation }] : []),
          ]} />
          <section className="space-y-2"><h3 className="text-sm font-semibold">Deskripsi barang</h3><div className="whitespace-pre-wrap break-words rounded-xl border border-border bg-report-surface p-4 text-sm leading-relaxed text-foreground">{detail.description.trim() || "Tidak ada deskripsi."}</div></section>
          <div className="flex items-start gap-2 rounded-lg border border-border bg-field-surface p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{detail.state === "reported" || detail.state === "stored" ? "Merasa barang ini milik Anda? Hubungi Pos Satpam dan jelaskan ciri khususnya untuk pemeriksaan kepemilikan." : "Informasi ini sudah ditutup. Hubungi Pos Satpam jika memerlukan penjelasan."}</p></div>
        </div> : null}
        <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => { requestVersion.current++; setSelected(null); setError("") }}>Tutup</Button></div>
      </DialogContent>
    </Dialog>
  </>
}
