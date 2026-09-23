"use client"

import { useMemo, useState, type ReactNode } from "react"
import Link from "next/link"
import { Armchair, ArrowRight, Building2, ChartNoAxesCombined, CircleCheckBig, ClipboardList, FileText, Gauge, Info, LampCeiling, ListChecks, MapPin, Monitor, PackageSearch, Snowflake, Table2, Tv, Wrench, type LucideIcon } from "lucide-react"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartLegend, ChartLegendContent, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { technicianRoomPriorities } from "@/features/facilities/mock/teknisi-dashboard"
import { isMonitoringReportInProgress, monitoringReports, type MonitoringReportCategory } from "@/features/management/mock/management-monitoring"
import { cn } from "cn"

const categoryOrder: MonitoringReportCategory[] = ["Kehilangan & Temuan", "Fasilitas", "Layanan", "Lainnya"]

const categoryPresentation = {
  "Kehilangan & Temuan": { icon: PackageSearch, description: "Barang hilang dan temuan" },
  Fasilitas: { icon: Wrench, description: "Kerusakan fasilitas JTI" },
  Layanan: { icon: FileText, description: "Layanan digital dan administrasi" },
  Lainnya: { icon: ClipboardList, description: "Usulan dan informasi umum" },
} satisfies Record<MonitoringReportCategory, { icon: LucideIcon; description: string }>

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
const completionRate = totalReports ? Math.round((completedReports / totalReports) * 100) : 0

const statusSummary = [
  {
    label: "Baru",
    value: newReports,
    description: "Belum memasuki penanganan",
    href: "/manajemen/monitoring?status=Baru",
    icon: ClipboardList,
    iconClassName: "text-muted-foreground",
  },
  {
    label: "Dalam penanganan",
    value: inProgressReports,
    description: "Sudah diverifikasi atau diproses",
    href: "/manajemen/monitoring?status=dalam-penanganan",
    icon: ListChecks,
    iconClassName: "text-primary",
  },
  {
    label: "Selesai",
    value: completedReports,
    description: "Penanganan telah ditutup",
    href: "/manajemen/monitoring?status=Selesai",
    icon: CircleCheckBig,
    iconClassName: "text-emerald-600 dark:text-emerald-400",
  },
] satisfies Array<{ label: string; value: number; description: string; href: string; icon: LucideIcon; iconClassName: string }>

const categorySummary = categoryOrder.map((category) => ({
  label: category,
  value: monitoringReports.filter((report) => report.category === category).length,
  href: `/manajemen/monitoring?category=${encodeURIComponent(category)}`,
  ...categoryPresentation[category],
}))

const trend = Object.entries(
  monitoringReports.reduce<Record<string, typeof monitoringReports[number][]>>((result, report) => {
    result[report.reportedOn] = [...(result[report.reportedOn] ?? []), report]
    return result
  }, {}),
)
  .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
  .map(([reportedOn, reports]) => ({
    reportedOn,
    label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${reportedOn}T00:00:00Z`)),
    total: reports.length,
    lostFound: reports.filter((report) => report.category === "Kehilangan & Temuan").length,
    facilities: reports.filter((report) => report.category === "Fasilitas").length,
    services: reports.filter((report) => report.category === "Layanan").length,
    other: reports.filter((report) => report.category === "Lainnya").length,
  }))

const trendChartConfig = {
  lostFound: { label: "Kehilangan & Temuan", color: "var(--chart-1)" },
  facilities: { label: "Fasilitas", color: "var(--chart-2)" },
  services: { label: "Layanan", color: "var(--chart-3)" },
  other: { label: "Lainnya", color: "var(--chart-4)" },
} satisfies ChartConfig

function AnalyticsCard({ icon: Icon, title, description, children, contentClassName }: { icon: LucideIcon; title: string; description: string; children: ReactNode; contentClassName?: string }) {
  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="h-full overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
          <div className="flex items-start gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
              <Icon className="size-5" aria-hidden="true" />
            </span>
            <div>
              <CardTitle className="text-base">{title}</CardTitle>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            </div>
          </div>
        </CardHeader>
        <CardContent className={contentClassName ?? "p-5 md:p-6"}>{children}</CardContent>
      </div>
    </Card>
  )
}

function FacilityPriorityOverview() {
  const [selectedRoomName, setSelectedRoomName] = useState(technicianRoomPriorities[0]?.room ?? "")
  const selectedRoom = technicianRoomPriorities.find((room) => room.room === selectedRoomName) ?? technicianRoomPriorities[0]
  const maximumRoomReports = technicianRoomPriorities[0]?.activeReports ?? 1
  const maximumFacilityReports = selectedRoom?.facilities[0]?.activeReports ?? 1
  const leadingFacilityCount = selectedRoom?.facilities.filter((facility) => facility.activeReports === maximumFacilityReports).length ?? 0

  if (!selectedRoom) return null

  return (
    <AnalyticsCard icon={Building2} title="Peta prioritas fasilitas" description="Ruang diurutkan berdasarkan konsentrasi laporan aktif, kemudian dipecah menjadi objek fasilitas yang paling sering dikeluhkan." contentClassName="p-0 md:p-0">
      <div className="grid xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.82fr)]">
        <section className="border-b border-border/60 p-4 md:p-5 xl:border-r xl:border-b-0" aria-labelledby="room-ranking-title">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><h3 id="room-ranking-title" className="text-sm font-semibold text-foreground">Ranking ruang</h3><p className="mt-1 text-xs text-muted-foreground">Pilih ruang untuk melihat objek dominan.</p></div>
            <Badge variant="outline" tone="primary">{technicianRoomPriorities.reduce((total, room) => total + room.activeReports, 0)} aktif</Badge>
          </div>
          <div className="space-y-2">
            {technicianRoomPriorities.map((room, index) => {
              const selected = room.room === selectedRoom.room

              return <Button key={room.room} type="button" variant={selected ? "secondary" : "ghost"} aria-pressed={selected} className={cn("h-auto w-full justify-start gap-3 rounded-xl px-3 py-3 text-left", selected && "ring-1 ring-primary/20")} onClick={() => setSelectedRoomName(room.room)}>
                <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border text-xs font-semibold", index === 0 ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-border bg-card text-muted-foreground")}>{index + 1}</span>
                <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-foreground">{room.room}</span><span className="text-xs font-semibold tabular-nums text-foreground">{room.activeReports}</span></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", index === 0 ? "bg-amber-500/80" : "bg-primary/70")} style={{ width: `${(room.activeReports / maximumRoomReports) * 100}%` }} /></span></span>
              </Button>
            })}
          </div>
        </section>

        <section className="bg-muted/20 p-4 md:p-5" aria-labelledby="facility-breakdown-title">
          <div className="flex items-start justify-between gap-3">
            <div><h3 id="facility-breakdown-title" className="text-sm font-semibold text-foreground">Objek di {selectedRoom.room}</h3><p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{selectedRoom.location}</p></div>
            <Badge variant="outline" tone="neutral">{selectedRoom.activeReports} laporan</Badge>
          </div>
          <div className="mt-4 space-y-2">
            {selectedRoom.facilities.map((facility) => {
              const Icon = facilityIcons[facility.facility] ?? Wrench
              const isLeading = facility.activeReports === maximumFacilityReports

              return <div key={facility.facility} className={cn("rounded-xl border p-3", isLeading ? "border-primary/25 bg-primary/5" : "border-border/60 bg-card")}>
                <div className="flex items-center gap-3">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border bg-background", isLeading ? "border-primary/20 text-primary" : "border-border text-muted-foreground")}><Icon className="size-4" aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-3"><span className="truncate text-sm font-medium text-foreground">{facility.facility}</span><span className="text-sm font-semibold tabular-nums text-foreground">{facility.activeReports}</span></span><span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-muted"><span className={cn("block h-full rounded-full", isLeading ? "bg-primary" : "bg-primary/45")} style={{ width: `${(facility.activeReports / maximumFacilityReports) * 100}%` }} /></span></span>
                </div>
                {isLeading ? <p className="mt-2 text-[11px] font-medium text-primary">{leadingFacilityCount > 1 ? "Prioritas setara" : "Fokus objek utama"}</p> : null}
              </div>
            })}
          </div>
        </section>
      </div>
      <div className="flex items-start gap-2 border-t border-border/60 bg-muted/30 px-4 py-3 text-xs leading-relaxed text-muted-foreground md:px-5">
        <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
        <p>Prioritas menunjukkan konsentrasi laporan aktif, bukan tingkat bahaya teknis. Penilaian risiko tetap dilakukan oleh Teknisi.</p>
      </div>
    </AnalyticsCard>
  )
}

function StatusOverview() {
  return (
    <AnalyticsCard icon={ListChecks} title="Status penanganan" description="Posisi terakhir tiket pada periode data saat ini.">
      <div className="space-y-3">
        {statusSummary.map((item) => {
          const Icon = item.icon
          const percentage = totalReports ? Math.round((item.value / totalReports) * 100) : 0

          return <Link key={item.label} href={item.href} className="group block rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
            <span className="flex items-center gap-3"><span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card", item.iconClassName)}><Icon className="size-4" aria-hidden="true" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-medium text-foreground">{item.label}</span><span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span></span><span className="text-right"><span className="block text-sm font-semibold tabular-nums text-foreground">{item.value}</span><span className="text-[11px] text-muted-foreground">{percentage}%</span></span></span>
            <span className="mt-3 block h-1.5 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary/70" style={{ width: `${percentage}%` }} /></span>
          </Link>
        })}
      </div>
      <div className="mt-4 rounded-xl border border-border/60 bg-muted/35 p-3.5">
        <p className="text-xs font-medium text-foreground">Tingkat penyelesaian {completionRate}%</p>
        <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{completedReports} dari {totalReports} tiket telah ditutup. Nilai ini tidak mengukur mutu hasil atau kepatuhan SLA.</p>
      </div>
    </AnalyticsCard>
  )
}

export function ManagementStatistics() {
  const peakTrend = useMemo(() => trend.reduce((peak, item) => item.total > peak.total ? item : peak, trend[0]), [])
  const priorityRoom = technicianRoomPriorities[0]

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan statistik laporan">
        <KpiCard label="Total tiket" value={totalReports} icon={ClipboardList} detail="Cakupan kategori" detailValue={`${categoryOrder.length} kategori`} href="/manajemen/monitoring" />
        <KpiCard label="Tingkat penyelesaian" value={`${completionRate}%`} icon={Gauge} detail="Tiket selesai" detailValue={`${completedReports} dari ${totalReports}`} detailTone="green" href="/manajemen/monitoring?status=Selesai" />
        <KpiCard label="Dalam penanganan" value={inProgressReports} icon={ListChecks} detail="Tiket baru" detailValue={newReports} detailTone="amber" href="/manajemen/monitoring?status=dalam-penanganan" />
        <KpiCard label="Ruang prioritas" value={priorityRoom?.room ?? "Belum ada"} icon={Building2} detail="Laporan fasilitas aktif" detailValue={priorityRoom?.activeReports ?? 0} detailTone="amber" href="/manajemen/monitoring?category=Fasilitas" />
      </section>

      <FacilityPriorityOverview />

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(340px,0.65fr)]">
        <AnalyticsCard icon={ChartNoAxesCombined} title="Tren laporan masuk" description="Jumlah tiket berdasarkan tanggal dibuat dan komposisi kategorinya.">
          <ChartContainer config={trendChartConfig} className="h-[280px] w-full aspect-auto">
            <BarChart accessibilityLayer data={trend} margin={{ left: -12, right: 8, top: 8 }}>
              <CartesianGrid vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={28} />
              <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
              <ChartLegend content={<ChartLegendContent className="flex-wrap" />} />
              <Bar dataKey="lostFound" stackId="reports" fill="var(--color-lostFound)" />
              <Bar dataKey="facilities" stackId="reports" fill="var(--color-facilities)" />
              <Bar dataKey="services" stackId="reports" fill="var(--color-services)" />
              <Bar dataKey="other" stackId="reports" fill="var(--color-other)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ChartContainer>
          {peakTrend ? <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /><p>Puncak laporan tercatat pada {peakTrend.label} dengan {peakTrend.total} tiket. Arahkan pointer atau fokus ke grafik untuk melihat rincian kategorinya.</p></div> : null}
        </AnalyticsCard>

        <StatusOverview />
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <AnalyticsCard icon={FileText} title="Distribusi kategori" description="Proporsi seluruh tiket dalam cakupan Monitoring.">
          <div className="grid gap-2 sm:grid-cols-2">
            {categorySummary.map((item) => {
              const Icon = item.icon
              const percentage = totalReports ? Math.round((item.value / totalReports) * 100) : 0

              return <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Icon className="size-4" aria-hidden="true" /></span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{item.label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span></span>
                <span className="text-right"><span className="block text-sm font-semibold tabular-nums text-foreground">{item.value}</span><span className="text-[11px] text-muted-foreground">{percentage}%</span></span>
              </Link>
            })}
          </div>
        </AnalyticsCard>

        <AnalyticsCard icon={Info} title="Metode perhitungan" description="Definisi metrik agar statistik dibaca secara konsisten.">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border/60 bg-background/40 p-3"><dt className="text-xs font-medium text-foreground">Tingkat penyelesaian</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Tiket berstatus Selesai dibagi seluruh tiket pada cakupan data.</dd></div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3"><dt className="text-xs font-medium text-foreground">Prioritas ruang</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Jumlah laporan fasilitas aktif yang dikelompokkan berdasarkan ruangan.</dd></div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3"><dt className="text-xs font-medium text-foreground">Tren laporan</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Jumlah tiket menurut tanggal laporan dibuat, bukan tanggal diperbarui.</dd></div>
            <div className="rounded-xl border border-border/60 bg-background/40 p-3"><dt className="text-xs font-medium text-foreground">Status penanganan</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Snapshot status terakhir, bukan jumlah aktivitas pada tiket.</dd></div>
          </dl>
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/35 p-3.5 text-xs leading-relaxed text-muted-foreground"><Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" /><p>SLA, waktu respons, dan durasi penyelesaian belum dihitung karena timestamp penugasan belum tersedia pada sumber data.</p></div>
          <Link href="/manajemen/monitoring" className="group mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary outline-none hover:underline focus-visible:ring-2 focus-visible:ring-ring/50">Buka data Monitoring<ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden="true" /></Link>
        </AnalyticsCard>
      </section>
    </div>
  )
}
