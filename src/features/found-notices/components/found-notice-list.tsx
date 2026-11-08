"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ArrowRight, CalendarDays, MapPin, PackageCheck, PackageSearch, ShieldCheck } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { ReportDetailTable } from "@/components/reports/report-detail-section"
import { foundNoticeStates, type FoundNotice, type FoundNoticePage, type FoundNoticeRef } from "../domain/found-notice"

const time = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
const key = (notice: FoundNoticeRef) => `${notice.source}:${notice.id}`

export function FoundNoticeList({ initialPage, preview = false }: { initialPage: FoundNoticePage; preview?: boolean }) {
  const [page, setPage] = useState(initialPage)
  const [selected, setSelected] = useState<FoundNoticeRef | null>(null)
  const [detail, setDetail] = useState<FoundNotice | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState("")
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
      setDetail(data as FoundNotice)
      const read = await fetch("/api/pelapor/found-notices", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notice) })
      if (!read.ok) throw new Error("Informasi terbuka, tetapi tanda sudah dibaca belum tersimpan. Coba buka kembali.")
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
    <SectionCard title="Informasi barang temuan" icon={PackageSearch} meta={preview
      ? <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/pelapor/notifikasi?tab=temuan" />}>Lihat semua<ArrowRight /></Button>
      : `${page.unread} belum dibaca`}>
      <p className="mb-4 text-xs leading-relaxed text-muted-foreground">Barang yang dilaporkan ditemukan di lingkungan JTI.</p>
      {error && !selected ? <FieldError className="mb-3">{error}</FieldError> : null}
      <div className="space-y-2">
        {page.items.map(notice => <Button key={key(notice)} type="button" variant="outline" disabled={loadingMore} onClick={() => void open(notice)} className="h-auto w-full items-start justify-start gap-3 whitespace-normal rounded-xl bg-report-surface p-4 text-left shadow-none transition-colors hover:border-primary/40">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary"><PackageSearch className="size-5" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 space-y-1.5">
            <span className="flex flex-wrap items-center gap-2"><span className="min-w-0 break-words font-semibold text-foreground">{notice.itemName}</span><Badge variant="outline" tone={foundNoticeStates[notice.state].tone}>{foundNoticeStates[notice.state].label}</Badge>{!notice.read ? <span className="size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" /> : null}</span>
            <span className="flex items-start gap-1.5 text-xs font-normal text-muted-foreground"><MapPin className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />{notice.foundLocation}</span>
            <span className="block text-xs font-normal text-muted-foreground">{time.format(new Date(notice.publishedAt))} WIB</span>
          </span>
          <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
        </Button>)}
        {!page.items.length ? <CollectionEmptyState icon={PackageSearch} title={preview ? "Belum ada informasi temuan aktif" : "Belum ada informasi temuan"} description="Informasi muncul ketika mahasiswa melaporkan temuan atau Satpam menerima barang di pos." size="compact" /> : null}
      </div>
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
          <ReportDetailTable rows={[
            { icon: MapPin, label: "Lokasi ditemukan", value: detail.foundLocation },
            { icon: CalendarDays, label: "Informasi diterbitkan", value: `${time.format(new Date(detail.publishedAt))} WIB` },
            ...(detail.storageLocation && detail.state === "stored" ? [{ icon: PackageCheck, label: "Disimpan di", value: detail.storageLocation }] : []),
          ]} />
          <div className="flex items-start gap-2 rounded-lg border border-border bg-field-surface p-3 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><p>{detail.state === "reported" || detail.state === "stored" ? "Merasa barang ini milik Anda? Hubungi Pos Satpam dan jelaskan ciri khususnya untuk pemeriksaan kepemilikan." : "Informasi ini sudah ditutup. Hubungi Pos Satpam jika memerlukan penjelasan."}</p></div>
        </div> : null}
        <div className="flex justify-end"><Button type="button" variant="outline" onClick={() => { requestVersion.current++; setSelected(null); setError("") }}>Tutup</Button></div>
      </DialogContent>
    </Dialog>
  </>
}
