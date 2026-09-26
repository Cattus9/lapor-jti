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
  Info,
  LampCeiling,
  ListChecks,
  Monitor,
  PackageSearch,
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
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { technicianRoomPriorities } from "@/features/facilities/mock/teknisi-dashboard"
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

const totalReports = monitoringReports.length
const completedReports = monitoringReports.filter((report) => report.status === "Selesai").length
const newReports = monitoringReports.filter((report) => report.status === "Baru").length
const inProgressReports = monitoringReports.filter((report) => isMonitoringReportInProgress(report.status)).length
const activeReports = totalReports - completedReports
const completionRate = totalReports ? Math.round((completedReports / totalReports) * 100) : 0

const categorySummary = categoryOrder.map((category) => {
  const value = monitoringReports.filter((report) => report.category === category).length
  return {
    label: category,
    value,
    percentage: totalReports ? Math.round((value / totalReports) * 100) : 0,
    href: "/manajemen/monitoring?category=" + encodeURIComponent(category),
    ...categoryPresentation[category],
  }
})

const handlerOrder = ["Satpam", "Teknisi", "Manajemen Jurusan"] as const
const handlerSummary = handlerOrder.map((handler) => ({
  handler,
  active: monitoringReports.filter((report) => report.handler === handler && report.status !== "Selesai").length,
  total: monitoringReports.filter((report) => report.handler === handler).length,
}))
const highestHandlerCount = Math.max(1, ...handlerSummary.map((item) => item.active))

const reportDates = monitoringReports.map((report) => report.reportedOn).sort()
const firstReportDate = reportDates[0]
const lastReportDate = [...reportDates, ...monitoringReports.flatMap((report) => report.completedOn ? [report.completedOn] : [])].sort().at(-1)
const shortDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })
const periodDateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })
const periodLabel = firstReportDate && lastReportDate
  ? periodDateFormatter.format(new Date(firstReportDate + "T00:00:00Z")) + " - " + periodDateFormatter.format(new Date(lastReportDate + "T00:00:00Z"))
  : "Belum ada laporan"

const reportsByDate = new Map<string, typeof monitoringReports[number][]>()
monitoringReports.forEach((report) => {
  reportsByDate.set(report.reportedOn, [...(reportsByDate.get(report.reportedOn) ?? []), report])
})
const completedByDate = new Map<string, number>()
monitoringReports.forEach((report) => {
  if (report.status === "Selesai" && report.completedOn) {
    completedByDate.set(report.completedOn, (completedByDate.get(report.completedOn) ?? 0) + 1)
  }
})

const trend = firstReportDate && lastReportDate
  ? Array.from(
    { length: Math.round((Date.parse(lastReportDate + "T00:00:00Z") - Date.parse(firstReportDate + "T00:00:00Z")) / 86400000) + 1 },
    (_, index) => {
      const reportedOn = new Date(Date.parse(firstReportDate + "T00:00:00Z") + index * 86400000).toISOString().slice(0, 10)
      const reports = reportsByDate.get(reportedOn) ?? []

      return {
        reportedOn,
        label: shortDateFormatter.format(new Date(reportedOn + "T00:00:00Z")),
        incoming: reports.length,
        completed: completedByDate.get(reportedOn) ?? 0,
      }
    },
  )
  : []

const categoryChartConfig = {
  lostFound: { label: "Kehilangan & Temuan", color: "var(--chart-1)" },
  facilities: { label: "Fasilitas", color: "var(--chart-2)" },
  services: { label: "Layanan", color: "var(--chart-3)" },
  other: { label: "Lainnya", color: "var(--chart-4)" },
} satisfies ChartConfig

const outcomeChartConfig = {
  incoming: { label: "Laporan masuk", color: "var(--chart-1)" },
  completed: { label: "Laporan selesai", color: "var(--chart-2)" },
} satisfies ChartConfig

function AnalyticsCard({
  icon: Icon,
  title,
  description,
  children,
  contentClassName,
}: {
  icon: LucideIcon
  title: string
  description: string
  children: ReactNode
  contentClassName?: string
}) {
  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="h-full overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
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
        <CardContent className={contentClassName ?? "p-4 md:p-5"}>{children}</CardContent>
      </div>
    </Card>
  )
}

function TrendOverview() {
  return (
    <AnalyticsCard icon={ChartNoAxesCombined} title="Masuk dan selesai" description="Bandingkan laporan baru dengan laporan yang selesai setiap hari.">
      {trend.length ? (
        <ChartContainer config={outcomeChartConfig} className="h-[270px] w-full aspect-auto">
          <BarChart accessibilityLayer data={trend} margin={{ left: 0, right: 8, top: 8 }}>
            <CartesianGrid vertical={false} />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} minTickGap={20} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={36} />
            <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
            <ChartLegend content={<ChartLegendContent className="flex-wrap gap-x-3 gap-y-1" />} />
            <Bar dataKey="incoming" fill="var(--color-incoming)" radius={[3, 3, 0, 0]} maxBarSize={16} />
            <Bar dataKey="completed" fill="var(--color-completed)" radius={[3, 3, 0, 0]} maxBarSize={16} />
          </BarChart>
        </ChartContainer>
      ) : <p className="py-16 text-center text-sm text-muted-foreground">Belum ada laporan pada cakupan data ini.</p>}
      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Laporan selesai dihitung pada tanggal penyelesaian, bukan tanggal laporan dibuat.</p>
    </AnalyticsCard>
  )
}

function CategoryComposition() {
  const chartData = categorySummary.map((item) => ({
    key: item.key,
    name: item.label,
    value: item.value,
    fill: item.color,
  }))

  return (
    <AnalyticsCard icon={ClipboardList} title="Komposisi laporan" description="Proporsi seluruh tiket menurut jenis laporan.">
      <div className="grid items-center gap-4 sm:grid-cols-[190px_minmax(0,1fr)] xl:grid-cols-1 2xl:grid-cols-[190px_minmax(0,1fr)]">
        <div className="relative mx-auto size-[190px]">
          {totalReports ? (
            <ChartContainer config={categoryChartConfig} className="size-[190px] aspect-auto" initialDimension={{ width: 190, height: 190 }}>
              <PieChart accessibilityLayer>
                <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={59} outerRadius={81} paddingAngle={2} strokeWidth={0} isAnimationActive={false} />
              </PieChart>
            </ChartContainer>
          ) : null}
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-semibold tabular-nums text-foreground">{totalReports}</span>
            <span className="text-xs text-muted-foreground">tiket</span>
          </div>
        </div>
        <div className="space-y-1">
          {categorySummary.map((item) => (
            <Link key={item.label} href={item.href} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-xs transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
              <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: item.color }} aria-hidden="true" />
              <span className="min-w-0 flex-1 text-foreground">{item.label}</span>
              <span className="shrink-0 font-semibold tabular-nums text-foreground">{item.value}</span>
              <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">{item.percentage}%</span>
            </Link>
          ))}
        </div>
      </div>
    </AnalyticsCard>
  )
}

function HandlerOverview() {
  return (
    <AnalyticsCard icon={ListChecks} title="Aktif per penanggung jawab" description="Tiket yang belum selesai menurut peran penanganan.">
      <div className="grid gap-4 md:grid-cols-3 md:gap-6">
        {handlerSummary.map((item) => (
          <div key={item.handler} className="min-w-0">
            <div className="flex items-end justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-foreground">{item.handler}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.total} tiket dalam cakupan</p>
              </div>
              <p className="shrink-0 text-sm font-semibold tabular-nums text-foreground">{item.active} aktif</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden="true">
              <div className="h-full rounded-full bg-primary/75" style={{ width: (item.active / highestHandlerCount) * 100 + "%" }} />
            </div>
          </div>
        ))}
      </div>
      <p className="mt-4 text-xs text-muted-foreground">{activeReports} dari {totalReports} tiket masih aktif di seluruh peran.</p>
    </AnalyticsCard>
  )
}

function FacilityOverview() {
  const [selectedRoomName, setSelectedRoomName] = useState(technicianRoomPriorities[0]?.room ?? "")
  const selectedRoom = technicianRoomPriorities.find((room) => room.room === selectedRoomName) ?? technicianRoomPriorities[0]
  const activeFacilityReports = technicianRoomPriorities.reduce((total, room) => total + room.activeReports, 0)
  const maximumRoomReports = Math.max(1, ...technicianRoomPriorities.map((room) => room.activeReports))
  const objectMentions = selectedRoom?.facilities.reduce((total, facility) => total + facility.activeReports, 0) ?? 0
  const objectChartData = selectedRoom?.facilities.map((facility, index) => ({
    key: `object-${index}`,
    name: facility.facility,
    value: facility.activeReports,
    fill: `var(--chart-${index % 5 + 1})`,
  })) ?? []
  const objectChartConfig: ChartConfig = Object.fromEntries(objectChartData.map((item) => [item.key, { label: item.name, color: item.fill }]))

  return (
    <AnalyticsCard
      icon={Building2}
      title="Lokasi dengan laporan fasilitas aktif"
      description={activeFacilityReports + " laporan belum selesai di " + technicianRoomPriorities.length + " lokasi. Pilih lokasi untuk melihat objeknya."}
      contentClassName="p-0"
    >
      {selectedRoom ? (
        <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
          <section className="border-b border-border/60 p-4 md:p-5 lg:border-r lg:border-b-0" aria-labelledby="facility-location-title">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 id="facility-location-title" className="text-sm font-semibold text-foreground">Lokasi</h3>
              <Badge variant="outline" tone="neutral">{technicianRoomPriorities.length} lokasi</Badge>
            </div>
            <div className="space-y-1">
              {technicianRoomPriorities.map((room, index) => {
                const selected = room.room === selectedRoom.room

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
                    onClick={() => setSelectedRoomName(room.room)}
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
              })}
            </div>
          </section>

          <section className="bg-muted/15 p-4 md:p-5" aria-labelledby="facility-object-title">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 id="facility-object-title" className="text-sm font-semibold text-foreground">Objek di {selectedRoom.room}</h3>
                <p className="mt-1 text-xs text-muted-foreground">Komposisi objek pada laporan aktif.</p>
              </div>
              <Badge variant="outline" tone="primary">{selectedRoom.activeReports} laporan</Badge>
            </div>
            <div className="mt-4 grid items-center gap-4 sm:grid-cols-[160px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[160px_minmax(0,1fr)]">
              <div className="relative mx-auto size-[160px]">
                <ChartContainer config={objectChartConfig} className="size-[160px] aspect-auto" initialDimension={{ width: 160, height: 160 }}>
                  <PieChart accessibilityLayer>
                    <ChartTooltip content={<ChartTooltipContent hideLabel nameKey="key" />} />
                    <Pie data={objectChartData} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} strokeWidth={0} isAnimationActive={false} />
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
            <p className="mt-4 text-xs text-muted-foreground">{selectedRoom.totalReports - selectedRoom.activeReports} dari {selectedRoom.totalReports} laporan di lokasi ini sudah selesai.</p>
          </section>
        </div>
      ) : <p className="p-5 text-sm text-muted-foreground">Belum ada laporan fasilitas aktif.</p>}
      <p className="border-t border-border/60 bg-muted/20 px-4 py-3 text-xs leading-relaxed text-muted-foreground md:px-5">
        Satu laporan bisa mencakup beberapa objek. Jumlah laporan aktif tidak menunjukkan tingkat risiko teknis.
      </p>
    </AnalyticsCard>
  )
}

function CalculationNotes() {
  const [open, setOpen] = useState(false)

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <CollapsibleTrigger render={<Button type="button" variant="ghost" className="h-auto w-full justify-start gap-3 rounded-none px-4 py-3 text-left hover:bg-muted/40" />}>
        <Info className="size-4 shrink-0 text-primary" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-sm font-medium text-foreground">Cara membaca statistik</span>
        <ChevronDown className={cn("size-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} aria-hidden="true" />
      </CollapsibleTrigger>
      <CollapsibleContent className="border-t border-border/60 px-4 py-4">
        <dl className="grid gap-4 text-xs sm:grid-cols-2">
          <div><dt className="font-medium text-foreground">Tingkat selesai</dt><dd className="mt-1 leading-relaxed text-muted-foreground">Tiket berstatus Selesai dibagi seluruh tiket. Ini belum menjadi success rate final karena hasil penutupan selain Selesai belum dicatat.</dd></div>
          <div><dt className="font-medium text-foreground">Laporan aktif</dt><dd className="mt-1 leading-relaxed text-muted-foreground">Semua tiket yang belum berstatus Selesai, termasuk tiket baru.</dd></div>
          <div><dt className="font-medium text-foreground">Tren harian</dt><dd className="mt-1 leading-relaxed text-muted-foreground">Laporan masuk menurut tanggal dibuat; laporan selesai menurut tanggal penyelesaian.</dd></div>
          <div><dt className="font-medium text-foreground">Objek fasilitas</dt><dd className="mt-1 leading-relaxed text-muted-foreground">Proporsi dihitung dari jumlah penyebutan objek pada laporan aktif di lokasi terpilih.</dd></div>
        </dl>
      </CollapsibleContent>
    </Collapsible>
  )
}

export function ManagementStatistics() {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border/60 pb-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-2"><CalendarDays className="size-4 text-primary" aria-hidden="true" />Data {periodLabel}</span>
        <span>Seluruh kategori dan penanggung jawab</span>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan seluruh laporan">
        <KpiCard label="Total laporan" value={totalReports} icon={ClipboardList} detail="Cakupan" detailValue={categoryOrder.length + " kategori"} href="/manajemen/monitoring" />
        <KpiCard label="Baru" value={newReports} icon={FileText} detail="Porsi seluruh tiket" detailValue={totalReports ? Math.round((newReports / totalReports) * 100) + "%" : "0%"} href="/manajemen/monitoring?status=Baru" />
        <KpiCard label="Dalam penanganan" value={inProgressReports} icon={ListChecks} detail="Porsi seluruh tiket" detailValue={totalReports ? Math.round((inProgressReports / totalReports) * 100) + "%" : "0%"} href="/manajemen/monitoring?status=dalam-penanganan" />
        <KpiCard label="Tingkat selesai" value={completionRate + "%"} icon={Gauge} detail="Tiket selesai" detailValue={completedReports + " dari " + totalReports} detailTone="green" href="/manajemen/monitoring?status=Selesai" />
      </section>

      <section className="grid items-stretch gap-5 xl:grid-cols-[minmax(0,1.45fr)_minmax(360px,0.75fr)]" aria-label="Tren dan komposisi laporan">
        <TrendOverview />
        <CategoryComposition />
      </section>

      <HandlerOverview />
      <FacilityOverview />
      <CalculationNotes />
    </div>
  )
}
