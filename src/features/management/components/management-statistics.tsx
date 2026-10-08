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
  ShieldCheck,
  Snowflake,
  Table2,
  Tv,
  Wrench,
  type LucideIcon,
} from "lucide-react"
import { Bar, BarChart, CartesianGrid, Pie, PieChart, XAxis, YAxis } from "recharts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { RoomPriorityBadge } from "@/components/reports/room-priority-badge"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, useStablePieTooltip, type ChartConfig } from "@/components/ui/chart"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { useOperationalResource } from "@/components/reports/use-operational-data"
import { getTodayInWib } from "../../reports/domain/report-date"
import { categoryLabels, handlerLabels } from "../domain/management"
import { ManagementFeedback } from "./management-feedback"
import type { ManagementStatisticsData, MonitoringReportCategory } from "../types"
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

const firstReportDate = undefined
const lastReportDate = getTodayInWib()
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
  if (!latest) return { preset, from: "", to: "" }
  if (preset === "all") return { preset, from: "", to: "" }
  if (preset === "month") return { preset, from: latest.slice(0, 7) + "-01", to: latest }
  return { preset, from: subtractDays(latest, preset === "7-days" ? 6 : 29), to: latest }
}

function periodRangeLabel(period: PeriodSelection) {
  if (!period.from || !period.to) return "Semua waktu"
  if (period.from === period.to) return formatDate(period.from)
  return formatDate(period.from) + " - " + formatDate(period.to)
}

type TrendData = Array<{ label: string; incoming: number; completed: number }>
function buildCategorySummary(categories: ManagementStatisticsData["categories"], total: number, period: PeriodSelection) {
  return categoryOrder.map((category) => {
    const key = (Object.keys(categoryLabels) as Array<keyof typeof categoryLabels>).find((key) => categoryLabels[key] === category)!
    const value = categories.find((row) => row.category === key)?.total ?? 0
    return { label: category, value, percentage: total ? Math.round(value / total * 100) : 0,
      href: "/manajemen/monitoring?" + new URLSearchParams({ ...(period.from && period.to ? { from: period.from, to: period.to } : { period: "semua" }), category: key }).toString(),
      ...categoryPresentation[category] }
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
  { value: "month", label: "Bulan ini" },
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
      {lastReportDate ? <p className="text-xs leading-relaxed text-muted-foreground">Periode mengikuti kalender WIB. Hari ini: {formatDate(lastReportDate)}.</p> : null}
    </div>
  )
}

function PeriodPicker({ period, onChange }: { period: PeriodSelection; onChange: (period: PeriodSelection) => void }) {
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(period.from)
  const [draftTo, setDraftTo] = useState(period.to)
  const buttonLabel = period.preset === "custom" ? "Rentang tanggal" : periodPresets.find((preset) => preset.value === period.preset)?.label ?? "Semua data"
  const pickerLabel = "Pilih periode statistik: " + buttonLabel + " (" + periodRangeLabel(period) + ")"

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
          <PopoverTrigger render={<Button type="button" variant="default" aria-label={pickerLabel} className="min-w-36 justify-between gap-2 aria-expanded:bg-primary-action-hover" />}>
            <span>{buttonLabel}</span><ChevronDown className="size-4" aria-hidden="true" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 max-w-[calc(100vw-2rem)] p-4">{options("period-desktop")}</PopoverContent>
        </Popover>
      </div>
      <div className="sm:hidden">
        <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
          <DialogTrigger render={<Button type="button" variant="default" aria-label={pickerLabel} className="w-full justify-between gap-2 aria-expanded:bg-primary-action-hover" />}>
            <span className="flex-1 text-left">{buttonLabel}</span><ChevronDown className="size-4" aria-hidden="true" />
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

export function ManagementStatisticsScope({ period, onChange }: { period: PeriodSelection; onChange: (period: PeriodSelection) => void }) {
  return (
    <Card aria-labelledby="statistics-scope-title" className="gap-0 rounded-xl border-0 bg-accent/60 p-0 shadow-none ring-0">
      <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-primary/20 bg-card text-primary">
            <CalendarDays className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 id="statistics-scope-title" className="text-sm font-semibold text-foreground">Cakupan statistik</h2>
            <p className="mt-0.5 text-base font-semibold text-accent-foreground">{periodRangeLabel(period)}</p>
            <p className="mt-1 text-xs text-muted-foreground">Seluruh KPI dan grafik · WIB</p>
          </div>
        </div>
        <PeriodPicker period={period} onChange={onChange} />
      </CardContent>
    </Card>
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

function TrendOverview({ trend, periodLabel, granularity }: { trend: TrendData; periodLabel: string; granularity: ManagementStatisticsData["granularity"] }) {
  const hasEvents = trend.some((day) => day.incoming > 0 || day.completed > 0)
  return (
    <AnalyticsCard icon={ChartNoAxesCombined} title="Laporan masuk dan selesai" description={"Jumlah laporan masuk dan selesai per " + (granularity === "day" ? "hari" : granularity === "month" ? "bulan" : "tahun") + " pada " + periodLabel + "."} stretch>
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

const handlerIcons = { satpam: ShieldCheck, teknisi: Wrench, manajemen: Building2 }

export function ManagementHandlerOverview({ handlers, total }: { handlers: ManagementStatisticsData["handlers"]; total: number }) {
  const handlerSummary = (["satpam", "teknisi", "manajemen"] as const).map((role) => ({ role, handler: handlerLabels[role], active: handlers.find((r) => r.handler === role)?.active ?? 0, total: handlers.find((r) => r.handler === role)?.total ?? 0 })).sort((a, b) => b.active - a.active)
  const highestHandlerCount = Math.max(1, ...handlerSummary.map((item) => item.active))
  const activeReports = handlerSummary.reduce((sum, item) => sum + item.active, 0)

  return (
    <AnalyticsCard icon={ListChecks} title="Aktif per penanggung jawab" description="Bandingkan jumlah tiket yang belum selesai di tiap peran.">
      {total ? <>
      <dl className="grid gap-6 md:grid-cols-3">
        {handlerSummary.map((item) => {
          const Icon = handlerIcons[item.role]
          return (
            <div key={item.role} className="min-w-0">
              <dt className="flex items-center gap-2 text-sm font-medium text-foreground"><Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />{item.handler}</dt>
              <dd className="mt-2 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                <span className={cn("text-3xl font-semibold tracking-tight tabular-nums", item.active ? "text-foreground" : "text-muted-foreground")}>{item.active}</span>
                <span className="text-sm text-muted-foreground">aktif <span className="text-xs tabular-nums">dari {item.total} tiket</span></span>
              </dd>
              {/* All three bars share the same ticket scale, not an individual completion percentage. */}
              <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                <div className="h-full rounded-full bg-primary/80" style={{ width: (item.active / highestHandlerCount) * 100 + "%" }} />
              </div>
            </div>
          )
        })}
      </dl>
      <p className="mt-5 text-xs text-muted-foreground">{activeReports} dari {total} tiket masih aktif di seluruh peran.</p>
      </> : <p className="py-8 text-center text-sm text-muted-foreground">Tidak ada laporan pada periode ini.</p>}
    </AnalyticsCard>
  )
}

export function ManagementFacilityOverview({ rooms }: { rooms: ManagementStatisticsData["rooms"] }) {
  const pieTooltip = useStablePieTooltip()
  const [selectedRoomId, setSelectedRoomId] = useState("")
  const [locationSearch, setLocationSearch] = useState("")
  const [showAllObjects, setShowAllObjects] = useState(false)
  const rankedRooms = [...rooms].filter((room) => room.totalReports > 0).sort((left, right) => right.totalReports - left.totalReports || left.room.localeCompare(right.room, "id") || left.id.localeCompare(right.id))
  const matchingRooms = rankedRooms.filter((room) => `${room.room} ${room.location}`.toLocaleLowerCase("id-ID").includes(locationSearch.trim().toLocaleLowerCase("id-ID")))
  const selectedRoom = matchingRooms.find((room) => room.id === selectedRoomId) ?? matchingRooms[0]
  const historicalFacilityReports = rankedRooms.reduce((total, room) => total + room.totalReports, 0)
  const maximumRoomReports = Math.max(1, ...rankedRooms.map((room) => room.totalReports))
  const objectMentions = selectedRoom?.facilities.reduce((total, facility) => total + facility.totalReports, 0) ?? 0
  const objectChartData = selectedRoom?.facilities.map((facility, index) => ({
    key: `object-${index}`,
    name: facility.facility,
    value: facility.totalReports,
    fill: `var(--chart-${index % 5 + 1})`,
  })) ?? []
  const objectChartConfig: ChartConfig = Object.fromEntries(objectChartData.map((item) => [item.key, { label: item.name, color: item.fill }]))
  const manyObjects = (selectedRoom?.facilities.length ?? 0) > 5
  const displayedObjects = selectedRoom ? (showAllObjects ? selectedRoom.facilities : selectedRoom.facilities.slice(0, 5)) : []

  function selectRoom(roomId: string) {
    setSelectedRoomId(roomId)
    setShowAllObjects(false)
  }

  return (
    <AnalyticsCard
      icon={Building2}
      title="Prioritas historikal fasilitas"
      description={historicalFacilityReports + " laporan di " + rankedRooms.length + " lokasi pada periode terpilih. Termasuk laporan selesai dan ditolak."}
      contentClassName="p-0"
    >
      {rankedRooms.length ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="border-b border-border/60 p-4 md:p-5 lg:border-r lg:border-b-0" aria-labelledby="facility-location-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="facility-location-title" className="text-sm font-semibold text-foreground">Prioritas historikal ruang</h3>
              <Badge variant="outline" tone="neutral">{locationSearch ? `${matchingRooms.length} dari ${rankedRooms.length}` : `${rankedRooms.length} lokasi`}</Badge>
            </div>
            <p className="mb-3 text-xs leading-relaxed text-muted-foreground">Urutan berdasarkan total laporan seluruh status, bukan antrean aktif.</p>
            {rankedRooms.length > 5 ? <div className="relative mb-3">
              <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input type="search" value={locationSearch} onChange={(event) => setLocationSearch(event.target.value)} placeholder="Cari lokasi" aria-label="Cari lokasi fasilitas" className="h-9 pl-9" />
            </div> : null}
            <div className={cn("space-y-1", rankedRooms.length > 5 && "max-h-80 overflow-y-auto pr-1")}>
              {matchingRooms.length ? matchingRooms.map((room) => {
                const index = rankedRooms.findIndex((item) => item.id === room.id)
                const selected = room.id === selectedRoom?.id

                return (
                  <Button
                    key={room.id}
                    type="button"
                    variant="ghost"
                    aria-pressed={selected}
                    aria-label={`${room.totalReports === maximumRoomReports ? "Prioritas utama" : "Prioritas berikutnya"} historikal: ${room.room}, ${room.totalReports} laporan pada periode terpilih. Tinjau objek fasilitas.`}
                    className={cn(
                      "h-auto w-full justify-start gap-3 rounded-lg border px-3 py-2.5 text-left whitespace-normal",
                      selected ? "border-primary/30 bg-primary/5 hover:bg-primary/10" : "border-transparent hover:border-border hover:bg-muted/50",
                    )}
                    onClick={() => selectRoom(room.id)}
                  >
                    <span className="w-4 shrink-0 text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                        <span className="min-w-0 break-words text-sm font-medium text-foreground">{room.room}</span>
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{room.totalReports} laporan</span>
                        <RoomPriorityBadge count={room.totalReports} highest={maximumRoomReports} historical />
                      </span>
                      <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                        <span className="block h-full rounded-full bg-primary/75" style={{ width: (room.totalReports / maximumRoomReports) * 100 + "%" }} />
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
                <p className="mt-1 text-xs text-muted-foreground">Komposisi objek pada seluruh laporan periode terpilih.</p>
              </div>
              <Badge variant="outline" tone="primary">{selectedRoom.totalReports} laporan</Badge>
            </div>
            {manyObjects ? (
              <div className="mt-4 space-y-3">
                <p className="text-xs text-muted-foreground">Objek diurutkan dari yang paling sering dilaporkan.</p>
                <div className={cn("space-y-2", showAllObjects && "max-h-80 overflow-y-auto pr-1")}>
                  {displayedObjects.map((facility) => {
                    const Icon = facilityIcons[facility.facility] ?? Wrench
                    return (
                      <div key={facility.facility} className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
                        <div className="flex items-center gap-2.5 text-sm"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="min-w-0 flex-1 font-medium text-foreground">{facility.facility}</span><span className="shrink-0 text-xs tabular-nums text-muted-foreground">{facility.totalReports} laporan · {objectMentions ? Math.round((facility.totalReports / objectMentions) * 100) : 0}%</span></div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true"><div className="h-full rounded-full bg-primary/75" style={{ width: `${(facility.totalReports / Math.max(1, selectedRoom.facilities[0]?.totalReports ?? 1)) * 100}%` }} /></div>
                      </div>
                    )
                  })}
                </div>
                <Button type="button" variant="ghost" size="sm" className="px-0 text-primary" onClick={() => setShowAllObjects((current) => !current)}>{showAllObjects ? "Tampilkan 5 teratas" : `Lihat semua ${selectedRoom.facilities.length} objek`}</Button>
              </div>
            ) : selectedRoom.facilities.length ? (
              <div className="mt-4 grid items-center gap-4 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[160px_minmax(0,1fr)]">
                <div className="relative mx-auto size-[160px]">
                  <ChartContainer aria-label={`Komposisi historikal objek di ${selectedRoom.room}, ${objectMentions} objek dilaporkan`} config={objectChartConfig} className="size-[160px] aspect-auto" initialDimension={{ width: 160, height: 160 }} {...pieTooltip.containerProps}>
                    <PieChart accessibilityLayer>
                      <ChartTooltip
                        active={pieTooltip.tooltipActive}
                        defaultIndex={pieTooltip.tooltipActive ? 0 : undefined}
                        wrapperStyle={{ zIndex: 10 }}
                        content={<ChartTooltipContent hideLabel nameKey="key" />}
                      />
                      <Pie key={selectedRoom.id} data={objectChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} strokeWidth={0} isAnimationActive="auto" animationBegin={0} animationDuration={500} animationEasing="ease-out" />
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
                        <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{facility.totalReports}</span>
                        <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{objectMentions ? Math.round((facility.totalReports / objectMentions) * 100) : 0}%</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : <Card className="mt-4 rounded-xl border-dashed border-border bg-empty-surface shadow-none"><CardContent className="py-8 text-center"><p className="text-sm font-medium">Belum ada rincian objek fasilitas</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Laporan di lokasi ini tidak memuat objek fasilitas terdaftar.</p></CardContent></Card>}
            <p className="mt-4 text-xs text-muted-foreground">{selectedRoom.activeReports} aktif · {selectedRoom.completedReports} dari {selectedRoom.totalReports} laporan sudah selesai.</p>
            </> : <div className="py-8 text-center"><h3 id="facility-object-title" className="text-sm font-semibold text-foreground">Objek lokasi</h3><p className="mt-1 text-sm text-muted-foreground">Tidak ada lokasi yang sesuai dengan pencarian.</p></div>}
          </section>
        </div>
      ) : <p className="p-5 text-sm text-muted-foreground">Belum ada laporan fasilitas pada periode ini.</p>}
      <p className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground md:px-5">
        Prioritas historikal berdasarkan jumlah laporan, bukan risiko atau antrean kerja saat ini. Satu tiket dapat mencakup beberapa objek.
      </p>
    </AnalyticsCard>
  )
}

export function ManagementStatistics() {
  const [period, setPeriod] = useState<PeriodSelection>(() => resolvePreset("all"))
  const [revision, setRevision] = useState(0)
  const search = new URLSearchParams({ period: period.preset === "all" ? "semua" : "rentang", retry: String(revision) })
  if (period.from && period.to) { search.set("from", period.from); search.set("to", period.to) }
  const resource = useOperationalResource<ManagementStatisticsData>("/api/manajemen/statistics?" + search)
  const data = resource.data
  const categorySummary = buildCategorySummary(data?.categories ?? [], data?.total ?? 0, period)
  const completionRate = data?.total ? Math.round(data.completed / data.total * 100) : 0
  const periodLabel = periodRangeLabel(period)
  const trend: TrendData = data?.trend.map((point) => ({ ...point, label: data.granularity === "day" ? shortDateFormatter.format(new Date(point.date + "T00:00:00Z")) : data.granularity === "month" ? new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(point.date + "T00:00:00Z")) : point.date.slice(0, 4) })) ?? []
  const monitoringHref = (filter: Record<string, string> = {}) => "/manajemen/monitoring?" + new URLSearchParams({ ...(period.from && period.to ? { from: period.from, to: period.to } : { period: "semua" }), ...filter }).toString()

  return (
    <div className="space-y-5">
      <ManagementStatisticsScope period={period} onChange={setPeriod} />
      <ManagementFeedback loading={resource.loading} error={resource.error} onRetry={() => setRevision((v) => v + 1)} />
      {data ? <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan seluruh laporan">
        <KpiCard label="Total laporan" value={data.total} icon={ClipboardList} detail="Kategori tercatat" detailValue={categorySummary.filter((item) => item.value > 0).length + " kategori"} href={monitoringHref()} />
        <KpiCard label="Baru" value={data.newReports} icon={FileText} detail="Porsi seluruh tiket" detailValue={data.total ? Math.round(data.newReports / data.total * 100) + "%" : "0%"} href={monitoringHref({ status: "baru" })} />
        <KpiCard label="Dalam penanganan" value={data.inProgress} icon={ListChecks} iconTone="amber" detail="Porsi seluruh tiket" detailValue={data.total ? Math.round(data.inProgress / data.total * 100) + "%" : "0%"} href={monitoringHref({ status: "dalam-penanganan" })} />
        <KpiCard label="Tingkat selesai" value={completionRate + "%"} icon={Gauge} iconTone="green" detail="Tiket selesai" detailValue={data.completed + " dari " + data.total} detailTone="green" href={monitoringHref({ status: "selesai" })} />
      </section>
      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]" aria-label="Tren dan komposisi laporan">
        <TrendOverview trend={trend} periodLabel={periodLabel} granularity={data.granularity} />
        <CategoryComposition summary={categorySummary} totalReports={data.total} periodLabel={periodLabel} />
      </section>
      <ManagementHandlerOverview handlers={data.handlers} total={data.total} />
      <ManagementFacilityOverview key={period.from + ":" + period.to} rooms={data.rooms} />
      </> : null}
    </div>
  )
}
