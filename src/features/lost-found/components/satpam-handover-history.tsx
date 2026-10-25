"use client"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.

import { useState } from "react"
import Image from "next/image"
import { Archive, ArrowRight, CalendarDays, ClipboardCheck, FileText, Handshake, ImageIcon, Images, MapPin, Package, PackageSearch, Search, SlidersHorizontal, UserRound } from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { SectionCard } from "@/components/ui/section-card"
import { Stepper } from "@/components/ui/stepper"
import { ReportDetailSection, ReportDetailTable } from "@/components/reports/report-detail-section"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { Badge } from "@/components/ui/badge"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldLabel } from "@/components/ui/field"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import type { SatpamHandoverHistoryItem, SecurityOfficer } from "../types"
import { useSatpamPage, useDebouncedSatpamQuery } from "./use-satpam-data"
import { SatpamPageFeedback } from "./satpam-page-feedback"
import { getTodayInWib } from "../../reports/domain/report-date"
import type { CurrentUser } from "@/lib/auth/current-user"

function HistoryDetailDialog({ item }: { item: SatpamHandoverHistoryItem }) {
  const sourceLabel = item.source === "inventaris" ? "Inventaris Pos Satpam" : "Pasangan laporan"
  return <Dialog><DialogTrigger render={<Button variant="ghost" className="group relative h-auto w-full flex-col items-stretch gap-3 overflow-hidden rounded-xl border border-border bg-report-surface p-4 text-left whitespace-normal shadow-none transition-colors hover:border-primary/40 hover:bg-report-surface focus-visible:ring-ring md:p-5" />}>
    <span className="flex items-start justify-between gap-3"><span className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary"><PackageSearch aria-hidden="true" /></span><span className="min-w-0"><span className="block text-sm font-semibold text-foreground">{item.title}</span><span className="mt-1 block text-xs font-normal text-muted-foreground">Penerima: {item.recipient}</span></span></span><StatusBadge status={item.status} /></span>
    <span className="line-clamp-2 text-sm font-normal text-muted-foreground">{item.itemDescription || "Tidak ada deskripsi tambahan."}</span>
    <span className="flex flex-wrap items-center justify-between gap-2 border-t border-border/60 pt-3 text-xs font-normal text-muted-foreground"><span>{sourceLabel} · Diserahkan {item.handedOverAt} WIB</span><span className="inline-flex items-center gap-1 text-primary-action">Lihat detail<ArrowRight className="size-3.5" aria-hidden="true" /></span></span>
  </DialogTrigger><DialogContent>
    <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Archive className="size-4" aria-hidden="true" /></span><span>{sourceLabel}</span><span>{item.handedOverAt} WIB</span><StatusBadge status={item.status} /></div><DialogTitle className="mt-4 text-xl">{item.title}</DialogTitle><DialogDescription className="mt-2">Catatan penyerahan barang dan petugas yang bertanggung jawab.</DialogDescription></div>
    <div className="space-y-6 p-5 md:p-6">
      <Stepper aria-label="Progres penyerahan" value={item.status === "Selesai" ? "selesai" : "diserahkan"} steps={[{ value: "diserahkan", label: "Diserahkan" }, { value: "selesai", label: "Selesai" }]} />
      <ReportDetailSection icon={Package} title="Detail barang" description="Informasi barang dan penyerahan yang tercatat."><ReportDetailTable rows={[
        { icon: Package, label: "Barang", value: item.itemCategory }, { icon: FileText, label: "Deskripsi", value: item.itemDescription },
        { icon: UserRound, label: "Penerima", value: item.recipient }, { icon: MapPin, label: "Lokasi penyerahan", value: item.location },
        { icon: UserRound, label: "Petugas penyerah", value: item.handler }, { icon: UserRound, label: "Dicatat melalui akun", value: item.actor },
        ...(item.ownershipEvidence ? [{ icon: ClipboardCheck, label: "Pemeriksaan kepemilikan", value: item.ownershipEvidence }] : []),
        { icon: FileText, label: "Catatan", value: item.handoverNote },
        ...(item.lostSubmittedAt ? [{ icon: CalendarDays, label: "Kehilangan dikirim", value: `${item.lostSubmittedAt} WIB` }] : []),
        ...(item.foundSubmittedAt ? [{ icon: CalendarDays, label: "Temuan dikirim", value: `${item.foundSubmittedAt} WIB` }] : []),
      ]} />{item.legacy ? <Badge variant="outline" tone="neutral">Data lama; petugas penyerah tidak tercatat</Badge> : null}</ReportDetailSection>
      <ReportDetailSection icon={Images} title="Foto barang" description="Lampiran privat dari inventaris atau laporan terkait."><div className="grid gap-3 sm:grid-cols-2">{item.lostTicket ? <EvidencePhoto label="Kehilangan" photoUrl={item.lostPhotoUrl} /> : null}<EvidencePhoto label={item.source === "inventaris" ? "Inventaris" : "Temuan"} photoUrl={item.foundPhotoUrl} /></div></ReportDetailSection>
      <ReportDetailSection icon={ClipboardCheck} title="Riwayat penanganan" description="Waktu penerimaan dan penyelesaian yang tercatat."><ReportDetailTable rows={[
        ...(item.receivedAt ? [{ icon: CalendarDays, label: "Diterima di pos", value: `${item.receivedAt} WIB` }] : []),
        ...(item.matchedAt ? [{ icon: CalendarDays, label: "Dicocokkan", value: `${item.matchedAt} WIB` }] : []),
        { icon: Handshake, label: "Diserahkan", value: `${item.handedOverAt} WIB` }, { icon: ClipboardCheck, label: "Penyelesaian", value: item.completedAt },
      ]} /></ReportDetailSection>
    </div>
  </DialogContent></Dialog>
}
function EvidencePhoto({ label, photoUrl }: { label: string; photoUrl?: string }) {
  const [failed, setFailed] = useState(false)
  return <Card className="gap-0 overflow-hidden rounded-xl border border-border bg-background py-0 shadow-none"><p className="px-3 py-2 text-sm font-medium">{label}</p><div className="relative flex h-44 items-center justify-center border-t border-border bg-muted/30">{photoUrl && !failed ? <Image src={photoUrl} alt={`Foto ${label}`} fill sizes="(min-width: 640px) 300px, 100vw" className="object-contain" unoptimized onError={() => setFailed(true)} /> : <span className="flex items-center gap-2 text-xs text-muted-foreground"><ImageIcon className="size-5" aria-hidden="true" />Foto belum tersedia</span>}</div></Card>
}
function HistoryRow({ item }: { item: SatpamHandoverHistoryItem }) { return <HistoryDetailDialog item={item} /> }

type DatePreset = "all" | "7d" | "30d" | "custom"

const datePresets: { value: DatePreset; label: string }[] = [
  { value: "all", label: "Semua" },
  { value: "7d", label: "7 hari" },
  { value: "30d", label: "30 hari" },
  { value: "custom", label: "Atur tanggal" },
]



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

export function SatpamHandoverHistory({ user, officers }: { user: CurrentUser; officers: SecurityOfficer[] }) {
  const handlers = officers.map((officer) => officer.id)
  const officerName = (id: string) => officers.find((officer) => officer.id === id)?.name ?? id
  const [query, setQuery] = useState("")
  const [datePreset, setDatePreset] = useState<DatePreset>("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [handlerFilter, setHandlerFilter] = useState("all")
  const hasDateFilter = datePreset === "7d" || datePreset === "30d" || (datePreset === "custom" && Boolean(dateFrom || dateTo))
  const activeFilterCount = Number(hasDateFilter) + Number(handlerFilter !== "all")
  const activeDateLabel = dateFilterLabel(datePreset, dateFrom, dateTo)
  const search = useDebouncedSatpamQuery(query)
  const from = datePreset === "7d" ? getTodayInWib(new Date(new Date().getTime() - 6 * 86400000)) : datePreset === "30d" ? getTodayInWib(new Date(new Date().getTime() - 29 * 86400000)) : datePreset === "custom" ? dateFrom : ""
  const to = datePreset === "7d" || datePreset === "30d" ? getTodayInWib() : datePreset === "custom" ? dateTo : ""
  const params = new URLSearchParams({ q: search })
  if (from) params.set("from", from)
  if (to) params.set("to", to)
  if (handlerFilter !== "all") params.set("officerId", handlerFilter)
  const page = useSatpamPage<SatpamHandoverHistoryItem>(`/api/satpam/history?${params}`)
  const items = page.items

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
        <PageHeader title="Riwayat" description={`Arsip penyerahan barang yang telah dicatat, ${user.name}.`} />
        <SectionCard title="Riwayat penyerahan" icon={Archive} meta={<Badge variant="secondary">{page.total} penyerahan</Badge>} contentClassName="space-y-4">
              <div className="border-b border-border/60 pb-4">
                <div className="flex items-end gap-2">
                  <div className="grid min-w-0 flex-1 gap-1 lg:max-w-sm">
                    <Label htmlFor="history-search" className="text-xs font-medium text-muted-foreground">Cari riwayat</Label>
                    <div className="relative">
                      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                      <Input id="history-search" value={query} onChange={(event) => setQuery(event.target.value)} className="h-9 bg-background pl-9" placeholder="Barang, penerima, atau petugas" />
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
                        <PopoverContent align="end" className="w-80 max-w-full p-4">
                          <DateFilterControls preset={datePreset} from={dateFrom} to={dateTo} onPresetChange={setDatePreset} onFromChange={updateDateFrom} onToChange={setDateTo} idPrefix="desktop-history-date" />
                        </PopoverContent>
                      </Popover>
                    </div>
                    <div className="grid gap-1">
                      <span className="text-xs font-medium text-muted-foreground">Penanggung jawab</span>
                      <Select items={[{ value: "all", label: "Semua satpam" }, ...officers.map((o) => ({ value: o.id, label: o.name }))]} value={handlerFilter} onValueChange={(value) => setHandlerFilter(value ?? "all")}>
                        <SelectTrigger className="h-9 w-48 bg-background" aria-label="Filter Satpam penanggung jawab">
                          <UserRound className="size-4" aria-hidden="true" />
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">Semua satpam</SelectItem>
                          {handlers.map((handler) => <SelectItem key={handler} value={handler}>{officerName(handler)}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <Sheet>
                    <SheetTrigger render={<Button type="button" variant="outline" className="h-9 gap-1.5 bg-background lg:hidden" />}>
                      <SlidersHorizontal className="size-4" aria-hidden="true" />
                      Filter
                      {activeFilterCount > 0 && <Badge variant="outline" tone="primary" className="ml-1 size-5 justify-center rounded-full px-0 text-xs">{activeFilterCount}</Badge>}
                    </SheetTrigger>
                    <SheetContent side="bottom" className="max-h-dvh gap-0 overflow-hidden rounded-t-2xl p-0 lg:hidden">
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
                                {handler === "all" ? "Semua satpam" : officerName(handler)}
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
                  <p className="text-xs text-muted-foreground">{page.total} arsip ditemukan</p>
                  {hasDateFilter && <Badge variant="outline" tone="neutral">{activeDateLabel}</Badge>}
                  {handlerFilter !== "all" && <Badge variant="outline" tone="neutral">Satpam: {officerName(handlerFilter)}</Badge>}
                </div>
              </div>
              <SatpamPageFeedback loading={page.loading} error={page.error} nextCursor={page.nextCursor} loadMore={page.loadMore} />
              {items.length ? (
                <div className="space-y-3">{items.map((item) => <HistoryRow key={item.id} item={item} />)}</div>
              ) : !page.loading && !page.error ? (
                <CollectionEmptyState icon={Archive} title={query || activeFilterCount ? "Tidak ada riwayat yang sesuai" : "Belum ada penyerahan barang"} description={query || activeFilterCount ? "Ubah kata kunci atau filter untuk menemukan arsip lain." : "Penyerahan Inventaris maupun pasangan laporan akan tercatat di sini."} action={query || activeFilterCount ? <Button variant="outline" size="sm" onClick={() => { setQuery(""); resetFilters() }}>Reset filter</Button> : undefined} />
              ) : null}
        </SectionCard>
      </ContentShell>
    </DashboardLayout>
  )
}
