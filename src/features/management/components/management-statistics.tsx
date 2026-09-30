"use client"

import { useState, type ReactNode } from "react"
import Link from "next/link"
import {
  Armchair,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  ClipboardList,
  FileText,
  Gauge,
  LampCeiling,
  ListChecks,
  Monitor,
  PackageSearch,
  Search,
  Snowflake,
  Table2,
  Tv,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useStablePieTooltip, type ChartConfig } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { aggregateTechnicianRoomPriorities, technicianFacilityReports } from "@/features/facilities/mock/teknisi-dashboard"
import { isMonitoringReportInProgress, monitoringReports, type MonitoringReportCategory } from "@/features/management/mock/management-monitoring"
import { cn } from "cn"

const categoryOrder: MonitoringReportCategory[] = ["Kehilangan & Temuan", "Fasilitas", "Layanan", "Lainnya"]

const categoryPresentation = {
  "Kehilangan & Temuan": { key: "lostFound", icon: PackageSearch, color: "var(--chart-1)" },
  Fasilitas: { key: "facilities", icon: Wrench, color: "var(--chart-2)" },
  Layanan: { key: "services", icon: FileText, color: "var(--chart-3)" },
  Lainnya: { key: "other", icon: ClipboardList, color: "var(--chart-4)" },
} satisfies Record<MonitoringReportCategory, { key: string; icon: LucideIcon; color: string }>

const facilityIcons: Record<string, LucideIcon> = {
  AC: Snowflake,
  Komputer: Monitor,
  Kursi: Armchair,
  Lampu: LampCeiling,
  LCD: Monitor,
  Meja: Table2,
  TV: Tv,
}

const handlerOrder = ["Satpam", "Teknisi", "Manajemen Jurusan"] as const
const reportDates = monitoringReports.flatMap((report) => report.completedOn ? [report.reportedOn, report.completedOn] : [report.reportedOn]).sort()
const firstReportDate = reportDates[0]
const lastReportDate = reportDates.at(-1)
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
const periodDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
type PeriodPreset = "all" | "7-days" | "30-days" | "month" | "custom"
type PeriodSelection = { preset: PeriodPreset; from: string; to: string }

function formatDate(value: string) {
  return periodDateFormatter.format(new Date(value + "T00:00:00Z"))
}

function subtractDays(value: string, days: number) {
  return new Date(Date.parse(value + "T00:00:00Z") - days * 86400000).toISOString().slice(0, 10)
}

function resolvePreset(preset: Exclude<PeriodPreset, "custom">): PeriodSelection {
  const latest = lastReportDate ?? ""
  const earliest = firstReportDate ?? latest
  if (!latest) return { preset, from: "", to: "" }
  if (preset === "all") return { preset, from: earliest, to: latest }
  if (preset === "month") return { preset, from: latest.slice(0, 7) + "-01", to: latest }
  return { preset, from: subtractDays(latest, preset === "7-days" ? 6 : 29), to: latest }
}

function periodRangeLabel(period: PeriodSelection) {
  if (!period.from || !period.to) return "Belum ada laporan"
  if (period.from === period.to) return formatDate(period.from)
  return formatDate(period.from) + " – " + formatDate(period.to)
}

function buildTrend(reports: readonly (typeof monitoringReports)[number][], period: PeriodSelection) {
  if (!period.from || !period.to) return []
  const incomingByDate = new Map<string, number>()
  const completedByDate = new Map<string, number>()
  reports.forEach((report) => {
    incomingByDate.set(report.reportedOn, (incomingByDate.get(report.reportedOn) ?? 0) + 1)
    if (report.status === "Selesai" && report.completedOn) {
      completedByDate.set(report.completedOn, (completedByDate.get(report.completedOn) ?? 0) + 1)
    }
  })
  const days = Math.round((Date.parse(period.to + "T00:00:00Z") - Date.parse(period.from + "T00:00:00Z")) / 86400000) + 1
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(Date.parse(period.from + "T00:00:00Z") + index * 86400000).toISOString().slice(0, 10)
    return {
      label: shortDateFormatter.format(new Date(date + "T00:00:00Z")),
      incoming: incomingByDate.get(date) ?? 0,
      completed: completedByDate.get(date) ?? 0,
    }
  })
}

function buildCategorySummary(reports: readonly (typeof monitoringReports)[number][], period: PeriodSelection) {
  return categoryOrder.map((category) => {
    const value = reports.filter((report) => report.category === category).length
    return {
      label: category,
      value,
      percentage: reports.length ? Math.round((value / reports.length) * 100) : 0,
      href: "/manajemen/monitoring?" + new URLSearchParams({ from: period.from, to: period.to, category }).toString(),
      ...categoryPresentation[category],
    }
  })
}

const categoryChartConfig = {
  lostFound: { label: "Kehilangan & Temuan", color: "var(--chart-1)" },
  facilities: { label: "Fasilitas", color: "var(--chart-2)" },
  services: { label: "Layanan", color: "var(--chart-3)" },
  other: { label: "Lainnya", color: "var(--chart-4)" },
} satisfies ChartConfig

const trendChartConfig = {
  incoming: { label: "Laporan masuk", color: "var(--chart-1)" },
  completed: { label: "Laporan selesai", color: "var(--chart-2)" },
} satisfies ChartConfig

const periodPresets: readonly { value: Exclude<PeriodPreset, "custom">; label: string }[] = [
  { value: "all", label: "Semua data" },
  { value: "7-days", label: "7 hari" },
  { value: "30-days", label: "30 hari" },
  { value: "month", label: "Bulan data terbaru" },
]

function PeriodOptions({
  period,
  draftFrom,
  draftTo,
  setDraftFrom,
  setDraftTo,
  selectPreset,
  applyCustom,
  idPrefix,
}: {
  period: PeriodSelection
  draftFrom: string
  draftTo: string
  setDraftFrom: (value: string) => void
  setDraftTo: (value: string) => void
  selectPreset: (preset: Exclude<PeriodPreset, "custom">) => void
  applyCustom: () => void
  idPrefix: string
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {periodPresets.map((preset) => (
          <Button key={preset.value} type="button" size="sm" variant={period.preset === preset.value ? "secondary" : "outline"} aria-pressed={period.preset === preset.value} className="justify-start" onClick={() => selectPreset(preset.value)}>{preset.label}</Button>
        ))}
      </div>
      <div className="border-t border-border/60 pt-4">
        <p className="mb-3 text-sm font-medium text-foreground">Rentang tanggal</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1.5"><Label htmlFor={idPrefix + "-from"}>Dari</Label><Input id={idPrefix + "-from"} type="date" value={draftFrom} min={firstReportDate} max={draftTo || lastReportDate} onChange={(event) => setDraftFrom(event.target.value)} className="h-9" /></div>
          <div className="space-y-1.5"><Label htmlFor={idPrefix + "-to"}>Sampai</Label><Input id={idPrefix + "-to"} type="date" value={draftTo} min={draftFrom || firstReportDate} max={lastReportDate} onChange={(event) => setDraftTo(event.target.value)} className="h-9" /></div>
        </div>
        <Button type="button" size="sm" className="mt-3 w-full" disabled={!draftFrom || !draftTo || draftFrom > draftTo} onClick={applyCustom}>Terapkan rentang</Button>
      </div>
      {lastReportDate ? <p className="text-xs leading-relaxed text-muted-foreground">Pilihan hari dan bulan dihitung dari data terbaru: {formatDate(lastReportDate)}.</p> : null}
    </div>
  )
}

function PeriodPicker({ period, onChange }: { period: PeriodSelection; onChange: (period: PeriodSelection) => void }) {
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(period.from)
  const [draftTo, setDraftTo] = useState(period.to)
  const buttonLabel = period.preset === "all" ? "Semua data" : periodRangeLabel(period)

  function closePicker() {
    setDesktopOpen(false)
    setMobileOpen(false)
  }

  function selectPreset(preset: Exclude<PeriodPreset, "custom">) {
    const nextPeriod = resolvePreset(preset)
    setDraftFrom(nextPeriod.from)
    setDraftTo(nextPeriod.to)
    onChange(nextPeriod)
    closePicker()
  }

  function applyCustom() {
    if (!draftFrom || !draftTo || draftFrom > draftTo) return
    onChange({ preset: "custom", from: draftFrom, to: draftTo })
    closePicker()
  }

  const options = (idPrefix: string) => (
    <PeriodOptions period={period} draftFrom={draftFrom} draftTo={draftTo} setDraftFrom={setDraftFrom} setDraftTo={setDraftTo} selectPreset={selectPreset} applyCustom={applyCustom} idPrefix={idPrefix} />
  )

  return (
    <>
      <div className="hidden sm:block">
        <Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
          <PopoverTrigger render={<Button type="button" variant="outline" aria-label={"Pilih periode statistik: " + buttonLabel} className="max-w-72 justify-between gap-2 bg-card" />}>
            <CalendarDays className="size-4 text-primary" aria-hidden="true" /><span className="min-w-0 truncate">{buttonLabel}</span><ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-4">{options("period-desktop")}</PopoverContent>
        </Popover>
      </div>
      <div className="sm:hidden">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger render={<Button type="button" variant="outline" aria-label={"Pilih periode statistik: " + buttonLabel} className="w-full justify-between gap-2 bg-card" />}>
            <CalendarDays className="size-4 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1 truncate text-left">{buttonLabel}</span><ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="max-w-md p-0">
            <DialogHeader className="border-b border-border/60 p-5 pr-14"><DialogTitle>Pilih periode statistik</DialogTitle><DialogDescription>Semua ringkasan di halaman ini mengikuti periode yang dipilih.</DialogDescription></DialogHeader>
            <div className="p-5">{options("period-mobile")}</div>
          </DialogContent>
        </Dialog>
      </div>
    </>
  )
}

function AnalyticsCard({
  icon: Icon,
  title,
  description,
  children,
  contentClassName,
  stretch = false,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
  contentClassName?: string
  stretch?: boolean
}) {
  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className={cn("overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs", stretch && "flex flex-1 flex-col")}>
        <CardHeader className="gap-3 border-b border-border/60 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <Icon className="size-4.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className={cn(contentClassName ?? "p-4 md:p-5", stretch && "flex-1")}>{children}</CardContent>
      </div>
    </Card>
  )
}

function TrendOverview({ trend, periodLabel, missingCompletionDates }: { trend: ReturnType<typeof buildTrend>; periodLabel: string; missingCompletionDates: number }) {
  const hasEvents = trend.some((day) => day.incoming > 0 || day.completed > 0)
  return (
    <AnalyticsCard icon={ChartNoAxesCombined} title="Laporan masuk dan selesai" description={"Jumlah laporan masuk dan laporan selesai per hari pada " + periodLabel + "."} stretch>
      {hasEvents ? (
        // The sidebar width animates for 200ms; update the plot once after it settles.
        <ChartContainer config={trendChartConfig} className="h-[270px] w-full aspect-auto" resizeDebounce={240}>
          <BarChart accessibilityLayer data={trend} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={16} interval="equidistantPreserveStart" />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent formatter={(value, _name, item) => (
              <div className="flex flex-1 items-center justify-between gap-4"><span className="text-muted-foreground">{item.dataKey === "completed" ? "Laporan selesai" : "Laporan masuk"}</span><span className="font-medium tabular-nums text-foreground">{value} laporan</span></div>
            )} />} />
            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-3 gap-y-1" />} />
            <Bar dataKey="incoming" fill="var(--color-incoming)" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive="auto" animationDuration={180} animationEasing="ease-out" />
            <Bar dataKey="completed" fill="var(--color-completed)" radius={[3, 3, 0, 0]} maxBarSize={24} isAnimationActive="auto" animationDuration={180} animationEasing="ease-out" />
          </BarChart>
        </ChartContainer>
      ) : <div className="flex min-h-[270px] items-center justify-center text-center text-sm text-muted-foreground">Tidak ada laporan pada periode ini.</div>}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Masuk dihitung pada tanggal laporan dibuat. Selesai dihitung pada tanggal penanganan berakhir, termasuk untuk laporan yang masuk sebelumnya.</p>
      {missingCompletionDates ? <p className="mt-1 text-xs text-muted-foreground">{missingCompletionDates} laporan selesai belum memiliki tanggal penyelesaian dan tidak ditampilkan pada batang selesai.</p> : null}
    </AnalyticsCard>
  )
}

function CategoryComposition({ summary, totalReports, periodLabel }: { summary: ReturnType<typeof buildCategorySummary>; totalReports: number; periodLabel: string }) {
  const pieTooltip = useStablePieTooltip()
  const chartData = summary.map((item) => ({
    key: item.key,
    name: item.label,
    value: item.value,
    fill: item.color,
  }))

  return (
    <AnalyticsCard icon={ClipboardList} title="Komposisi jenis laporan" description={"Proporsi laporan pada periode " + periodLabel + "."} contentClassName="flex items-center p-4 md:p-5" stretch>
      {totalReports ? <div className="grid w-full items-center gap-4 sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[190px_minmax(0,1fr)]">
        <div className="relative mx-auto size-[190px]">
          <ChartContainer config={categoryChartConfig} className="size-[190px] aspect-auto" initialDimension={{ width: 190, height: 190 }} {...pieTooltip.containerProps}>
            <PieChart accessibilityLayer>
              <ChartTooltip
                active={pieTooltip.tooltipActive}
                defaultIndex={pieTooltip.tooltipActive ? chartData.findIndex((item) => item.value > 0) : undefined}
                wrapperStyle={{ zIndex: 10 }}
                content={<ChartTooltipContent hideLabel nameKey="key" />}
              />
              <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={59} outerRadius={81} paddingAngle={2} strokeWidth={0} isAnimationActive={false} />
            </PieChart>
          </ChartContainer>
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{totalReports}</span>
            <span className="text-xs text-muted-foreground">tiket</span>
          </div>
        </div>
        <div className="space-y-1">
          {summary.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-foreground">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{item.value}</span>
              <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">{item.percentage}%</span>
            </Link>
          ))}
        </div>
      </div> : <div className="flex min-h-[270px] w-full items-center justify-center text-center text-sm text-muted-foreground">Tidak ada laporan pada periode ini.</div>}
    </AnalyticsCard>
  )
}

function HandlerOverview({ reports }: { reports: readonly (typeof monitoringReports)[number][] }) {
  const handlerSummary = handlerOrder.map((handler) => ({
    handler,
    active: reports.filter((report) => report.handler === handler && report.status !== "Selesai").length,
    total: reports.filter((report) => report.handler === handler).length,
  })).sort((first, second) => second.active - first.active)
  const highestHandlerCount = Math.max(1, ...handlerSummary.map((item) => item.active))
  const activeReports = reports.filter((report) => report.status !== "Selesai").length

  return (
    <AnalyticsCard icon={ListChecks} title="Aktif per penanggung jawab" description="Bandingkan jumlah tiket yang belum selesai di tiap peran.">
      {reports.length ? <>
      <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground">
        <span>Diurutkan dari yang terbanyak</span>
        <span className="tabular-nums">Skala batang: 0–{highestHandlerCount} tiket</span>
      </div>
      <div className="space-y-4">
        {handlerSummary.map((item) => (
          <div key={item.handler} className="min-w-0">
            <div className="flex items-center justify-between gap-3">
              <p className="min-w-0 text-sm font-medium text-foreground">{item.handler}</p>
              <p className="shrink-0 text-xs tabular-nums text-muted-foreground"><span className="text-sm font-semibold text-foreground">{item.active} aktif</span> dari {item.total} tiket</p>
            </div>
            <div className="mt-2 h-2 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary/80" style={{ width: (item.active / highestHandlerCount) * 100 + "%" }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{activeReports} dari {reports.length} tiket masih aktif di seluruh peran.</p>
      </> : <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada laporan pada periode ini.</p>}
    </AnalyticsCard>
  )
}

function FacilityOverview({ reports }: { reports: readonly (typeof monitoringReports)[number][] }) {
  const pieTooltip = useStablePieTooltip()
  const [selectedRoomName, setSelectedRoomName] = useState("")
  const [locationSearch, setLocationSearch] = useState("")
  const [showAllObjects, setShowAllObjects] = useState(false)
  const facilityTickets = new Set(reports.filter((report) => report.category === "Fasilitas").map((report) => report.ticket))
  const scopedFacilityReports = technicianFacilityReports.filter((report) => facilityTickets.has(report.ticket))
  const rooms = aggregateTechnicianRoomPriorities(scopedFacilityReports)
  const matchingRooms = rooms.filter((room) => `${room.room} ${room.location}`.toLocaleLowerCase("id-ID").includes(locationSearch.trim().toLocaleLowerCase("id-ID")))
  const selectedRoom = matchingRooms.find((room) => room.room === selectedRoomName) ?? matchingRooms[0]
  const activeFacilityReports = rooms.reduce((total, room) => total + room.activeReports, 0)
  const maximumRoomReports = Math.max(1, ...rooms.map((room) => room.activeReports))
  const objectMentions = selectedRoom?.facilities.reduce((total, facility) => total + facility.activeReports, 0) ?? 0
  const objectChartData = selectedRoom?.facilities.map((facility, index) => ({
    key: `object-${index}`,
    name: facility.facility,
    value: facility.activeReports,
    fill: `var(--chart-${index % 5 + 1})`,
  })) ?? []
  const objectChartConfig: ChartConfig = Object.fromEntries(objectChartData.map((item) => [item.key, { label: item.name, color: item.fill }]))
  const manyObjects = (selectedRoom?.facilities.length ?? 0) > 5
  const displayedObjects = selectedRoom ? (showAllObjects ? selectedRoom.facilities : selectedRoom.facilities.slice(0, 5)) : []

  function selectRoom(roomName: string) {
    setSelectedRoomName(roomName)
    setShowAllObjects(false)
  }

  return (
    <AnalyticsCard
      icon={Building2}
      title="Lokasi dengan laporan fasilitas aktif"
      description={activeFacilityReports + " laporan belum selesai di " + rooms.length + " lokasi. Pilih lokasi untuk melihat objeknya."}
      contentClassName="p-0"
    >
      {rooms.length ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="border-b border-border/60 p-4 md:p-5 lg:border-r lg:border-b-0" aria-labelledby="facility-location-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="facility-location-title" className="text-sm font-semibold text-foreground">Daftar lokasi</h3>
              <Badge variant="outline" tone="neutral">{locationSearch ? `${matchingRooms.length} dari ${rooms.length}` : `${rooms.length} lokasi`}</Badge>
            </div>
            {rooms.length > 5 ? <div className="relative mb-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Cari lokasi" aria-label="Cari lokasi fasilitas" className="h-9 pl-9" />
            </div> : null}
            <div className={cn("space-y-1", rooms.length > 5 && "max-h-80 overflow-y-auto pr-1")}>
              {matchingRooms.length ? matchingRooms.map((room) => {
                const index = rooms.findIndex((item) => item.room === room.room)
                const selected = room.room === selectedRoom?.room

                return (
                  <Button
                    key={room.room}
                    type="button"
                    variant="ghost"
                    aria-pressed={selected}
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-lg border px-3 py-2.5 text-left whitespace-normal",
                      selected ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/50",
                    )}
                    onClick={() => selectRoom(room.room)}
                  >
                    <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-sm font-medium text-foreground">{room.room}</span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{room.activeReports} laporan</span>
                      </span>
                      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-primary/75" style={{ width: (room.activeReports / maximumRoomReports) * 100 + "%" }} />
                      </span>
                    </span>
                  </Button>
                )
              }) : <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">Tidak ada lokasi yang sesuai.</p>}
            </div>
          </section>

          <section className="bg-muted/15 p-4 md:p-5" aria-labelledby="facility-object-title">
            {selectedRoom ? <>
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 id="facility-object-title" className="text-sm font-semibold text-foreground">Objek di {selectedRoom.room}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Komposisi objek pada laporan aktif.</p>
              </div>
              <Badge variant="outline" tone="primary">{selectedRoom.activeReports} laporan</Badge>
            </div>
            {manyObjects ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">Objek diurutkan dari yang paling sering dilaporkan.</p>
                <div className={cn("space-y-2", showAllObjects && "max-h-80 overflow-y-auto pr-1")}>
                  {displayedObjects.map((facility) => {
                    const Icon = facilityIcons[facility.facility] ?? Wrench
                    return (
                      <div key={facility.facility} className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1 font-medium text-foreground">{facility.facility}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{facility.activeReports} laporan · {objectMentions ? Math.round((facility.activeReports / objectMentions) * 100) : 0}%</span></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary/75" style={{ width: `${(facility.activeReports / Math.max(1, selectedRoom.facilities[0]?.activeReports ?? 1)) * 100}%` }} /></div>
                      </div>
                    )
                  })}
                </div>
                <Button type="button" variant="ghost" size="sm" className="px-0 text-primary" onClick={() => setShowAllObjects((current) => !current)}>{showAllObjects ? "Tampilkan 5 teratas" : `Lihat semua ${selectedRoom.facilities.length} objek`}</Button>
              </div>
            ) : (
              <div className="mt-4 grid items-center gap-4 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[160px_minmax(0,1fr)]">
                <div className="relative mx-auto size-[160px]">
                  <ChartContainer config={objectChartConfig} className="size-[160px] aspect-auto" initialDimension={{ width: 160, height: 160 }} {...pieTooltip.containerProps}>
                    <PieChart accessibilityLayer>
                      <ChartTooltip
                        active={pieTooltip.tooltipActive}
                        defaultIndex={pieTooltip.tooltipActive ? 0 : undefined}
                        wrapperStyle={{ zIndex: 10 }}
                        content={<ChartTooltipContent hideLabel nameKey="key" />}
                      />
                      <Pie key={selectedRoom.room} data={objectChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} strokeWidth={0} isAnimationActive="auto" animationBegin={0} animationDuration={500} animationEasing="ease-out" />
                    </PieChart>
                  </ChartContainer>
                  <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-semibold tabular-nums text-foreground">{objectMentions}</span>
                    <span className="text-[11px] text-muted-foreground">objek dilaporkan</span>
                  </div>
                </div>
                <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card">
                  {selectedRoom.facilities.map((facility, index) => {
                    const Icon = facilityIcons[facility.facility] ?? Wrench
                    return (
                      <div key={facility.facility} className="flex items-center gap-2.5 px-3 py-2.5">
                        <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: objectChartData[index].fill }} aria-hidden="true" />
                        <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">{facility.facility}</span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{facility.activeReports}</span>
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{objectMentions ? Math.round((facility.activeReports / objectMentions) * 100) : 0}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            <p className="mt-4 text-xs text-muted-foreground">{selectedRoom.totalReports - selectedRoom.activeReports} dari {selectedRoom.totalReports} laporan di lokasi ini sudah selesai.</p>
            </> : <div className="py-8 text-center"><h3 id="facility-object-title" className="text-sm font-semibold text-foreground">Objek lokasi</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada lokasi yang sesuai dengan pencarian.</p></div>}
          </section>
        </div>
      ) : <p className="p-5 text-sm text-muted-foreground">Belum ada laporan fasilitas aktif.</p>}
      <p className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground md:px-5">
        Satu laporan bisa mencakup beberapa objek. Jumlah laporan aktif tidak menunjukkan tingkat risiko teknis.
      </p>
    </AnalyticsCard>
  )
}

export function ManagementStatistics() {
  const [period, setPeriod] = useState<PeriodSelection>(() => resolvePreset("all"))
  const reports = monitoringReports.filter((report) => (!period.from || report.reportedOn >= period.from) && (!period.to || report.reportedOn <= period.to))
  const totalReports = reports.length
  const completedReports = reports.filter((report) => report.status === "Selesai").length
  const newReports = reports.filter((report) => report.status === "Baru").length
  const inProgressReports = reports.filter((report) => isMonitoringReportInProgress(report.status)).length
  const completionRate = totalReports ? Math.round((completedReports / totalReports) * 100) : 0
  const periodLabel = periodRangeLabel(period)
  const categorySummary = buildCategorySummary(reports, period)
  const trend = buildTrend(monitoringReports, period)
  const missingCompletionDates = monitoringReports.filter((report) => report.status === "Selesai" && !report.completedOn).length
  const monitoringHref = (filter: Record<string, string> = {}) => {
    const params = new URLSearchParams({ from: period.from, to: period.to, ...filter })
    return "/manajemen/monitoring?" + params.toString()
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="text-xs text-muted-foreground">Cakupan statistik</p><p className="mt-0.5 text-sm font-medium text-foreground">{periodLabel}</p></div>
        <PeriodPicker period={period} onChange={setPeriod} />
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan seluruh laporan">
        <KpiCard label="Total laporan" value={totalReports} icon={ClipboardList} detail="Kategori tercatat" detailValue={categorySummary.filter((item) => item.value > 0).length + " kategori"} href={monitoringHref()} />
        <KpiCard label="Baru" value={newReports} icon={FileText} detail="Porsi seluruh tiket" detailValue={totalReports ? Math.round((newReports / totalReports) * 100) + "%" : "0%"} href={monitoringHref({ status: "Baru" })} />
        <KpiCard label="Dalam penanganan" value={inProgressReports} icon={ListChecks} iconTone="amber" detail="Porsi seluruh tiket" detailValue={totalReports ? Math.round((inProgressReports / totalReports) * 100) + "%" : "0%"} href={monitoringHref({ status: "dalam-penanganan" })} />
        <KpiCard label="Tingkat selesai" value={completionRate + "%"} icon={Gauge} iconTone="green" detail="Tiket selesai" detailValue={completedReports + " dari " + totalReports} detailTone="green" href={monitoringHref({ status: "Selesai" })} />
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]" aria-label="Tren dan komposisi laporan">
        <TrendOverview trend={trend} periodLabel={periodLabel} missingCompletionDates={missingCompletionDates} />
        <CategoryComposition summary={categorySummary} totalReports={totalReports} periodLabel={periodLabel} />
      </section>

      <HandlerOverview reports={reports} />
      <FacilityOverview key={period.from + ":" + period.to} reports={reports} />
    </div>
  )
}
