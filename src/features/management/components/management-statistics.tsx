import Link from "next/link"
import { ArrowRight, ChartNoAxesCombined, CircleCheckBig, ClipboardList, FileText, Info, ListChecks, PackageSearch, Wrench, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { isMonitoringReportInProgress, monitoringReports, type MonitoringReportCategory } from "@/features/management/mock/management-monitoring"

const categoryOrder: MonitoringReportCategory[] = ["Kehilangan & Temuan", "Fasilitas", "Layanan", "Lainnya"]

const categoryPresentation = {
  "Kehilangan & Temuan": { icon: PackageSearch, description: "Laporan barang hilang atau temuan" },
  Fasilitas: { icon: Wrench, description: "Laporan kerusakan fasilitas" },
  Layanan: { icon: FileText, description: "Laporan layanan digital dan administrasi" },
  Lainnya: { icon: ClipboardList, description: "Usulan dan informasi umum" },
} satisfies Record<MonitoringReportCategory, { icon: LucideIcon; description: string }>

const trend = Object.entries(
  monitoringReports.reduce<Record<string, number>>((result, report) => {
    result[report.reportedOn] = (result[report.reportedOn] ?? 0) + 1
    return result
  }, {}),
)
  .sort(([firstDate], [secondDate]) => firstDate.localeCompare(secondDate))
  .map(([reportedOn, value]) => ({
    reportedOn,
    value,
    label: new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${reportedOn}T00:00:00Z`)),
  }))

const maxTrend = Math.max(...trend.map((item) => item.value), 1)

const statusSummary = [
  {
    label: "Baru",
    value: monitoringReports.filter((report) => report.status === "Baru").length,
    description: "Belum memasuki penanganan",
    href: "/manajemen/monitoring?status=Baru",
    icon: ClipboardList,
    iconClassName: "text-muted-foreground",
  },
  {
    label: "Dalam penanganan",
    value: monitoringReports.filter((report) => isMonitoringReportInProgress(report.status)).length,
    description: "Sudah diverifikasi atau diproses",
    href: "/manajemen/monitoring?status=dalam-penanganan",
    icon: ListChecks,
    iconClassName: "text-primary",
  },
  {
    label: "Selesai",
    value: monitoringReports.filter((report) => report.status === "Selesai").length,
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

function StatisticMetric({
  label,
  value,
  description,
  href,
  icon: Icon,
}: {
  label: string
  value: number
  description: string
  href: string
  icon: LucideIcon
}) {
  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <CardContent className="flex min-h-34 flex-col rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-2xs">
        <div className="flex items-start justify-between gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
            <Icon className="size-4" aria-hidden="true" />
          </span>
          <span className="text-2xl font-semibold tracking-tight text-foreground">{value}</span>
        </div>
        <div className="mt-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        <Button className="mt-auto -ml-2.5 pt-3" size="sm" variant="ghost" render={<Link href={href} />}>
          Lihat tiket <ArrowRight className="size-3.5" aria-hidden="true" />
        </Button>
      </CardContent>
    </Card>
  )
}

export function ManagementStatistics() {
  const totalReports = monitoringReports.length
  const peakTrend = trend.reduce((peak, item) => (item.value > peak.value ? item : peak), trend[0])

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan statistik laporan">
        <StatisticMetric label="Total tiket" value={totalReports} description="Seluruh laporan lintas pengelola" href="/manajemen/monitoring" icon={ClipboardList} />
        {statusSummary.map((item) => <StatisticMetric key={item.label} {...item} />)}
      </section>

      <section className="grid items-stretch gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.7fr)]">
        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <ChartNoAxesCombined className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle className="text-base">Tren tiket dibuat</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Jumlah tiket baru dari seluruh kategori pada tanggal pembuatan.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-5 md:p-6">
              <div className="flex h-52 items-end gap-3 border-b border-border/60 pb-8 sm:gap-6" aria-label="Grafik tren tiket dibuat">
                {trend.map((item) => (
                  <Tooltip key={item.reportedOn}>
                    <TooltipTrigger render={<button type="button" className="group relative flex h-full min-w-0 flex-1 flex-col justify-end gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring/50" aria-label={`${item.value} tiket dibuat pada ${item.label}`} />}>
                      <span className="text-sm font-semibold tabular-nums text-foreground">{item.value}</span>
                      <span className="mx-auto block w-full max-w-16 rounded-t-md bg-primary/85 transition-colors group-hover:bg-primary group-focus-visible:bg-primary" style={{ height: `${Math.max((item.value / maxTrend) * 100, 14)}%` }} aria-hidden="true" />
                      <span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">{item.label}</span>
                    </TooltipTrigger>
                    <TooltipContent>
                      <span className="font-medium">{item.label}</span>: {item.value} tiket dibuat
                    </TooltipContent>
                  </Tooltip>
                ))}
              </div>
              <div className="mt-5 flex items-start gap-2 rounded-xl border border-border/60 bg-muted/35 p-3 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <p>Arahkan pointer atau fokus ke batang grafik untuk membaca jumlah tiket pada setiap tanggal.</p>
              </div>
            </CardContent>
          </div>
        </Card>

        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="flex h-full flex-col rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <ListChecks className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle className="text-base">Status penanganan</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Posisi terakhir setiap tiket, bukan jumlah aktivitas yang terjadi.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col gap-3 p-5 md:p-6">
              {statusSummary.map((item) => {
                const Icon = item.icon

                return (
                  <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                    <span className={`flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card ${item.iconClassName}`}>
                      <Icon className="size-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">{item.label}</span>
                      <span className="mt-0.5 block text-xs text-muted-foreground">{item.description}</span>
                    </span>
                    <span className="flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground">
                      {item.value}<ArrowRight className="size-3.5 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                    </span>
                  </Link>
                )
              })}
              <div className="mt-auto rounded-xl border border-border/60 bg-muted/35 p-3.5">
                <p className="text-xs font-medium text-foreground">Cara membaca status</p>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Diverifikasi, Diproses, Barang teridentifikasi, Diserahkan, dan Sedang Diproses dihitung sebagai dalam penanganan.</p>
              </div>
            </CardContent>
          </div>
        </Card>
      </section>

      <section className="grid items-start gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <FileText className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle className="text-base">Distribusi kategori</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Komposisi tiket dalam cakupan Monitoring.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid gap-2 p-4 md:grid-cols-2 md:p-5">
              {categorySummary.map((item) => {
                const Icon = item.icon

                return (
                  <Link key={item.label} href={item.href} className="group flex items-center gap-3 rounded-xl border border-border/60 bg-background/40 p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50">
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Icon className="size-4" aria-hidden="true" /></span>
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium text-foreground">{item.label}</span><span className="mt-0.5 block truncate text-xs text-muted-foreground">{item.description}</span></span>
                    <span className="text-sm font-semibold tabular-nums text-foreground">{item.value}</span>
                  </Link>
                )
              })}
            </CardContent>
          </div>
        </Card>

        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
              <div className="flex items-start gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                  <Info className="size-5" aria-hidden="true" />
                </span>
                <div>
                  <CardTitle className="text-base">Metode perhitungan</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Definisi data agar ringkasan dapat dibaca secara konsisten.</p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-5 md:p-6">
              <dl className="grid gap-4 sm:grid-cols-3">
                <div><dt className="text-xs font-medium text-foreground">Cakupan</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Tiket Satpam, Teknisi, dan Manajemen Jurusan.</dd></div>
                <div><dt className="text-xs font-medium text-foreground">Tren</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Jumlah tiket berdasarkan tanggal laporan dibuat.</dd></div>
                <div><dt className="text-xs font-medium text-foreground">Status</dt><dd className="mt-1 text-xs leading-relaxed text-muted-foreground">Status terakhir pada saat data ditinjau.</dd></div>
              </dl>
              <div className="flex items-start gap-2 rounded-xl border border-border/60 bg-muted/35 p-3.5 text-xs leading-relaxed text-muted-foreground">
                <Info className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden="true" />
                <p>Metrik waktu respons dan SLA belum ditampilkan karena data waktu penugasan serta penyelesaian belum tersedia pada sumber data.</p>
              </div>
              {peakTrend ? <Button className="-ml-2.5" size="sm" variant="ghost" render={<Link href="/manajemen/monitoring" />}>Lihat seluruh tiket <ArrowRight className="size-3.5" aria-hidden="true" /></Button> : null}
            </CardContent>
          </div>
        </Card>
      </section>
    </div>
  )
}
