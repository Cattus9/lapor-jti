"use client"

import { useMemo, useState } from "react"
import Image from "next/image"
import { Archive, CalendarDays, Handshake, ImageIcon, Images, MapPin, Package, PackageSearch, Search, SlidersHorizontal, UserRound } from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { satpamHandoverHistory, type SatpamHandoverHistoryItem } from "@/features/lost-found/mock/satpam-history"
import type { CurrentUser } from "@/lib/auth/dummy-session"

function HistoryDetailDialog({ item }: { item: SatpamHandoverHistoryItem }) {
  return (
    <Dialog>
      <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="shrink-0 bg-card hover:bg-muted" />}>
        Lihat detail
      </DialogTrigger>
      <DialogContent>
        <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <Archive className="size-4" aria-hidden="true" />
            </span>
            <span>Riwayat penyerahan</span>
            <span aria-hidden="true">·</span>
            <span>{item.completedAt}</span>
            <StatusBadge className="ml-auto" status="Selesai" />
          </div>
          <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{item.title}</DialogTitle>
          <DialogDescription className="mt-2">Laporan kehilangan dan temuan telah ditangani satpam, lalu barang diserahkan.</DialogDescription>
        </div>
        <div className="space-y-6 p-5 md:p-6">
          <section>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <PackageSearch className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Pasangan laporan</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Kode LJ adalah nomor tiket untuk setiap laporan.</p>
              </div>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-[minmax(0,1fr)_2rem_minmax(0,1fr)]">
              <TicketSummary label="Kehilangan" ticket={item.lostTicket} />
              <div className="hidden items-center justify-center sm:flex">
                <span className="text-xs text-muted-foreground">dan</span>
              </div>
              <TicketSummary label="Temuan" ticket={item.foundTicket} />
            </div>
          </section>
          <EvidenceSection item={item} />
          <ItemSummary item={item} />
          <section className="border-t border-border/60 pt-6">
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <Handshake className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 className="text-sm font-semibold text-foreground">Penyerahan barang</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Penerima dan satpam yang bertanggung jawab saat penyerahan.</p>
              </div>
            </div>
            <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
              <div className="border-b border-border/60 p-4 sm:border-b-0 sm:border-r">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="size-3.5" aria-hidden="true" />Penerima</dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">{item.recipient}</dd>
              </div>
              <div className="p-4 sm:border-b sm:border-border/60">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />Lokasi</dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">{item.location}</dd>
              </div>
              <div className="border-t border-border/60 p-4 sm:col-span-2 sm:border-t-0">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><UserRound className="size-3.5" aria-hidden="true" />Penanggung jawab</dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">{item.handler}</dd>
              </div>
            </dl>
            <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Catatan penyerahan</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{item.handoverNote}</p>
            </div>
          </section>
          <section className="border-t border-border/60 pt-6">
            <h3 className="text-sm font-semibold text-foreground">Waktu penanganan</h3>
            <div className="mt-3 space-y-2">
              <TimelineItem label="Dicocokkan satpam" value={item.matchedAt} />
              <TimelineItem label="Barang diserahkan" value={item.handedOverAt} />
              <TimelineItem label="Tiket diselesaikan" value={item.completedAt} />
            </div>
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ItemSummary({ item }: { item: SatpamHandoverHistoryItem }) {
  return (
    <section className="border-t border-border/60 pt-6">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <Package className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Informasi barang</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Ringkasan barang dari laporan.</p>
        </div>
      </div>
      <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 bg-background/60 sm:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
        <div className="border-b border-border/60 p-4 sm:border-b-0 sm:border-r">
          <dt className="text-xs text-muted-foreground">Jenis barang</dt>
          <dd className="mt-1.5 text-sm font-medium text-foreground">{item.itemCategory}</dd>
        </div>
        <div className="p-4">
          <dt className="text-xs text-muted-foreground">Ciri barang</dt>
          <dd className="mt-1.5 text-sm leading-relaxed text-foreground">{item.itemDescription}</dd>
        </div>
      </dl>
    </section>
  )
}

function EvidenceSection({ item }: { item: SatpamHandoverHistoryItem }) {
  return (
    <section className="border-t border-border/60 pt-6">
      <div className="flex items-center gap-2">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
          <Images className="size-4" aria-hidden="true" />
        </span>
        <div>
          <h3 className="text-sm font-semibold text-foreground">Bukti</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Foto dari masing-masing laporan.</p>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <EvidencePhoto label="Kehilangan" ticket={item.lostTicket} photoUrl={item.lostPhotoUrl} />
        <EvidencePhoto label="Temuan" ticket={item.foundTicket} photoUrl={item.foundPhotoUrl} />
      </div>
    </section>
  )
}

function EvidencePhoto({ label, ticket, photoUrl }: { label: string; ticket: string; photoUrl?: string }) {
  const [imageFailed, setImageFailed] = useState(false)
  const hasPhoto = Boolean(photoUrl) && !imageFailed

  return (
    <Card className="gap-0 overflow-hidden rounded-xl border-border/60 bg-background/60 py-0 shadow-none">
      <div className="flex items-center justify-between gap-2 px-3 py-2.5">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="truncate text-xs text-muted-foreground">{ticket}</p>
      </div>
      <div className="relative flex h-36 items-center justify-center border-t border-border/60 bg-muted/30 sm:h-44">
        {hasPhoto ? (
          <Image
            src={photoUrl!}
            alt={`Foto bukti ${label.toLowerCase()} untuk tiket ${ticket}`}
            fill
            sizes="(min-width: 640px) 300px, 100vw"
            className="object-contain"
            unoptimized
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-center text-muted-foreground">
            <ImageIcon className="size-5" aria-hidden="true" />
            <p className="text-xs">Foto belum tersedia</p>
          </div>
        )}
      </div>
    </Card>
  )
}

function TicketSummary({ label, ticket }: { label: string; ticket: string }) {
  return (
    <div className="rounded-xl border border-border/60 bg-background/60 p-3.5">
      <Badge variant="outline" tone="neutral" className="h-6 rounded-md px-2 text-[11px]">
        Laporan {label.toLocaleLowerCase()}
      </Badge>
      <p className="mt-2.5 text-xs text-muted-foreground">Nomor tiket</p>
      <p className="mt-1 font-mono text-sm font-semibold tracking-tight text-foreground">{ticket}</p>
    </div>
  )
}

function TimelineItem({ label, value }: { label: string; value: string }) {
  return <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><div><p className="text-sm font-medium text-foreground">{label}</p><p className="mt-1 text-xs text-muted-foreground">{value}</p></div></div>
}

function HistoryRow({ item }: { item: SatpamHandoverHistoryItem }) {
  return (
    <article className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-2xs">
            <PackageSearch className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground md:text-base">{item.title}</h2>
            <p className="mt-1 text-xs text-muted-foreground">Penerima: {item.recipient}</p>
          </div>
        </div>
        <StatusBadge className="shrink-0" status="Selesai" />
      </div>
      <div className="mt-4 border-t border-border/60 pt-4">
        <p className="text-xs font-medium text-muted-foreground">Ciri barang</p>
        <p className="mt-1 text-sm leading-relaxed text-foreground">{item.itemDescription}</p>
      </div>
      <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Badge variant="outline" tone="primary" className="h-auto min-h-7 gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-normal whitespace-normal">
            <Handshake className="size-3.5" aria-hidden="true" />
            <span className="font-medium">Diserahkan</span>
            <span aria-hidden="true">·</span>
            <span>{item.handedOverAt}</span>
          </Badge>
          <Badge variant="outline" tone="neutral" className="h-auto min-h-7 gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-normal whitespace-normal">
            <UserRound className="size-3.5" aria-hidden="true" />
            <span className="font-medium">Satpam penanggung jawab</span>
            <span aria-hidden="true">·</span>
            <span>{item.handler}</span>
          </Badge>
        </div>
        <HistoryDetailDialog item={item} />
      </div>
    </article>
  )
}

type DatePreset = "all" | "7d" | "30d" | "custom"

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "custom", label: "Atur tanggal" },
]

const handlers = [...new Set(satpamHandoverHistory.map((item) => item.handler))].sort((a, b) => a.localeCompare(b, "id"))

function localIsoDate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function recentStartDate(days: number) {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - days + 1)
  return localIsoDate(date)
}

function shortDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(`${value}T12:00:00`))
}

function dateFilterLabel(preset: DatePreset, from: string, to: string) {
  if (preset === "7d") return "7 hari terakhir"
  if (preset === "30d") return "30 hari terakhir"
  if (preset === "custom") {
    if (from && to) return `${shortDate(from)} - ${shortDate(to)}`
    if (from) return `Sejak ${shortDate(from)}`
    if (to) return `Sampai ${shortDate(to)}`
    return "Pilih tanggal"
  }
  return "Semua tanggal"
}

function DateFilterControls({ preset, from, to, onPresetChange, onFromChange, onToChange, idPrefix }: {
  preset: DatePreset
  from: string
  to: string
  onPresetChange: (value: DatePreset) => void
  onFromChange: (value: string) => void
  onToChange: (value: string) => void
  idPrefix: string
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-foreground">Tanggal penyerahan</p>
      <div className="flex flex-wrap gap-2" role="group" aria-label="Rentang tanggal penyerahan">
        {datePresets.map((option) => (
          <Button key={option.value} type="button" size="sm" variant={preset === option.value ? "secondary" : "outline"} aria-pressed={preset === option.value} onClick={() => onPresetChange(option.value)}>
            {option.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="grid grid-cols-2 gap-3">
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-from`} className="text-xs">Dari</FieldLabel>
            <Input id={`${idPrefix}-from`} type="date" value={from} max={to || undefined} onChange={(event) => onFromChange(event.target.value)} className="h-9 min-w-0 bg-background text-xs" />
          </Field>
          <Field>
            <FieldLabel htmlFor={`${idPrefix}-to`} className="text-xs">Sampai</FieldLabel>
            <Input id={`${idPrefix}-to`} type="date" value={to} min={from || undefined} onChange={(event) => onToChange(event.target.value)} className="h-9 min-w-0 bg-background text-xs" />
          </Field>
        </div>
      )}
    </div>
  )
}

export function SatpamHandoverHistory({ user }: { user: CurrentUser }) {
  const [query, setQuery] = useState("")
  const [datePreset, setDatePreset] = useState<DatePreset>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [handlerFilter, setHandlerFilter] = useState("all")
  const hasDateFilter = datePreset === "7d" || datePreset === "30d" || (datePreset === "custom" && Boolean(dateFrom || dateTo))
  const activeFilterCount = Number(hasDateFilter) + Number(handlerFilter !== "all")
  const activeDateLabel = dateFilterLabel(datePreset, dateFrom, dateTo)
  const items = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase("id-ID")
    const recentFrom = datePreset === "7d" ? recentStartDate(7) : datePreset === "30d" ? recentStartDate(30) : ""
    const today = localIsoDate(new Date())

    return satpamHandoverHistory.filter((item) => {
      const searchText = `${item.title} ${item.itemCategory} ${item.itemDescription} ${item.lostTicket} ${item.foundTicket} ${item.recipient} ${item.handler}`.toLocaleLowerCase("id-ID")
      const handoverDate = item.handedOverAtIso.slice(0, 10)
      if (normalizedQuery && !searchText.includes(normalizedQuery)) return false
      if (handlerFilter !== "all" && item.handler !== handlerFilter) return false
      if (recentFrom && (handoverDate < recentFrom || handoverDate > today)) return false
      if (datePreset === "custom" && ((dateFrom && handoverDate < dateFrom) || (dateTo && handoverDate > dateTo))) return false
      return true
    }).sort((a, b) => b.handedOverAtIso.localeCompare(a.handedOverAtIso))
  }, [query, datePreset, dateFrom, dateTo, handlerFilter])

  const resetFilters = () => {
    setDatePreset("all")
    setDateFrom("")
    setDateTo("")
    setHandlerFilter("all")
  }

  const updateDateFrom = (value: string) => {
    setDateFrom(value)
    if (dateTo && value && value > dateTo) setDateTo("")
  }

  return (
    <DashboardLayout role="satpam">
      <ContentShell>
        <PageHeader title="Riwayat" description={`Arsip penyerahan barang yang telah selesai, ${user.name}.`} />
        <Card className="shrink-0 gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
            <Archive className="size-4 text-primary" aria-hidden="true" />
            Riwayat penyerahan
            <span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{satpamHandoverHistory.length} selesai</span>
          </div>
          <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardContent className="space-y-4 p-4 md:p-5">
              <div className="border-b border-border/60 pb-4">
                <h2 className="text-base font-semibold text-foreground">Penyerahan selesai</h2>
                <p className="mt-1 text-sm text-muted-foreground">Pasangan laporan kehilangan dan temuan yang telah ditutup.</p>
                <div className="mt-4 flex items-end gap-2">
                  <div className="grid min-w-0 flex-1 gap-1 lg:max-w-sm">
                    <label htmlFor="history-search" className="text-xs font-medium text-muted-foreground">Cari riwayat</label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="history-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Barang, penerima, atau nomor tiket" />
                    </div>
                  </div>
                  <div className="hidden items-end gap-2 lg:flex">
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Tanggal penyerahan</span>
                      <Popover>
                        <PopoverTrigger render={<Button type="button" variant="outline" className="h-9 w-48 justify-start bg-background" aria-label={`Filter tanggal penyerahan: ${activeDateLabel}`} />}>
                          <CalendarDays className="size-4" aria-hidden="true" />
                          <span className="min-w-0 truncate">{activeDateLabel}</span>
                        </PopoverTrigger>
                        <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-4">
                          <DateFilterControls preset={datePreset} from={dateFrom} to={dateTo} onPresetChange={setDatePreset} onFromChange={updateDateFrom} onToChange={setDateTo} idPrefix="desktop-history-date" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Penanggung jawab</span>
                      <Select value={handlerFilter} onValueChange={(value) => setHandlerFilter(value ?? "all")}>
                        <SelectTrigger className="h-9 w-48 bg-background" aria-label="Filter Satpam penanggung jawab">
                          <UserRound className="size-4" aria-hidden="true" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua satpam</SelectItem>
                          {handlers.map((handler) => <SelectItem key={handler} value={handler}>{handler}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Sheet>
                    <SheetTrigger render={<Button type="button" variant="outline" className="h-9 gap-1.5 bg-background lg:hidden" />}>
                      <SlidersHorizontal className="size-4" aria-hidden="true" />
                      Filter
                      {activeFilterCount > 0 && <Badge variant="outline" tone="primary" className="ml-1 size-5 justify-center rounded-full px-0 text-[11px]">{activeFilterCount}</Badge>}
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-[85dvh] gap-0 overflow-hidden rounded-t-2xl p-0 lg:hidden">
                      <SheetHeader className="border-b border-border/60 px-5 py-4 pr-12">
                        <SheetTitle>Filter riwayat</SheetTitle>
                        <SheetDescription>Temukan arsip berdasarkan tanggal penyerahan dan Satpam penanggung jawab.</SheetDescription>
                      </SheetHeader>
                      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
                        <DateFilterControls preset={datePreset} from={dateFrom} to={dateTo} onPresetChange={setDatePreset} onFromChange={updateDateFrom} onToChange={setDateTo} idPrefix="mobile-history-date" />
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-foreground">Satpam penanggung jawab</p>
                          <div className="flex flex-wrap gap-2" role="group" aria-label="Filter Satpam penanggung jawab">
                            {["all", ...handlers].map((handler) => (
                              <Button key={handler} type="button" size="sm" variant={handlerFilter === handler ? "secondary" : "outline"} aria-pressed={handlerFilter === handler} onClick={() => setHandlerFilter(handler)}>
                                {handler === "all" ? "Semua satpam" : handler}
                              </Button>
                            ))}
                          </div>
                        </div>
                      </div>
                      <SheetFooter className="flex-row border-t border-border/60 px-5 py-4">
                        <Button type="button" variant="outline" className="flex-1" onClick={resetFilters} disabled={activeFilterCount === 0}>Reset</Button>
                        <SheetClose render={<Button type="button" className="flex-1" />}>Selesai</SheetClose>
                      </SheetFooter>
                    </SheetContent>
                  </Sheet>
                </div>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2" aria-live="polite">
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs text-muted-foreground">{items.length} arsip ditemukan</p>
                  {hasDateFilter && <Badge variant="outline" tone="neutral">{activeDateLabel}</Badge>}
                  {handlerFilter !== "all" && <Badge variant="outline" tone="neutral">Satpam: {handlerFilter}</Badge>}
                </div>
                {activeFilterCount > 0 && <Button type="button" variant="ghost" size="xs" className="text-muted-foreground" onClick={resetFilters}>Reset filter</Button>}
              </div>
              {items.length ? (
                <div className="space-y-3">{items.map((item) => <HistoryRow key={item.id} item={item} />)}</div>
              ) : (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center">
                  <Search className="size-6 text-muted-foreground" aria-hidden="true" />
                  <p className="mt-3 text-sm font-medium text-foreground">Tidak ada riwayat yang sesuai</p>
                  <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Ubah kata kunci atau filter untuk menemukan arsip lain.</p>
                  {(query || activeFilterCount > 0) && <Button type="button" variant="outline" size="sm" className="mt-4" onClick={() => { setQuery(""); resetFilters() }}>Hapus pencarian dan filter</Button>}
                </div>
              )}
            </CardContent>
          </div>
        </Card>
      </ContentShell>
    </DashboardLayout>
  )
}
