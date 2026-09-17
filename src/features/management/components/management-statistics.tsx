import { ChartNoAxesCombined, CircleCheckBig, ClipboardList, MessageSquareText } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { managementReports } from "@/features/management/mock/manajemen-dashboard"

const trend = [
  { label: "6 Sep", value: 1 },
  { label: "15 Sep", value: 1 },
  { label: "16 Sep", value: 2 },
  { label: "17 Sep", value: 3 },
]

const maxTrend = Math.max(...trend.map((item) => item.value))
const categorySummary = [
  { label: "Layanan", value: managementReports.filter((report) => report.category === "Layanan").length, className: "bg-primary" },
  { label: "Lainnya", value: managementReports.filter((report) => report.category === "Lainnya").length, className: "bg-amber-500" },
]
const statusSummary = [
  { label: "Baru", value: managementReports.filter((report) => report.status === "Baru").length, className: "bg-slate-500" },
  { label: "Sedang Diproses", value: managementReports.filter((report) => report.status === "Sedang Diproses").length, className: "bg-primary" },
  { label: "Selesai", value: managementReports.filter((report) => report.status === "Selesai").length, className: "bg-emerald-500" },
]

export function ManagementStatistics() {
  const totalReports = managementReports.length
  const completedReports = statusSummary.find((item) => item.label === "Selesai")?.value ?? 0

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
        <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
          <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
            <div className="flex items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"><ChartNoAxesCombined className="size-5" aria-hidden="true" /></span><div><CardTitle className="text-base">Tren laporan masuk</CardTitle><p className="mt-1 text-sm text-muted-foreground">Jumlah laporan Layanan dan Lainnya yang tercatat pada periode data saat ini.</p></div></div>
          </CardHeader>
          <CardContent className="p-5 md:p-6">
            <div className="flex h-56 items-end gap-4 border-b border-border/60 pb-8 sm:gap-7" aria-label="Grafik tren laporan masuk">
              {trend.map((item) => <div key={item.label} className="relative flex h-full flex-1 flex-col justify-end gap-2 text-center"><span className="text-sm font-semibold text-foreground">{item.value}</span><div className="mx-auto w-full max-w-14 rounded-t-md bg-primary/85 transition-opacity hover:bg-primary" style={{ height: `${(item.value / maxTrend) * 100}%` }} /><span className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap text-xs text-muted-foreground">{item.label}</span></div>)}
            </div>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Data akan mengikuti filter periode dan sumber laporan setelah integrasi backend diaktifkan.</p>
          </CardContent>
        </div>
      </Card>

      <div className="space-y-6">
        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4 md:p-6 md:pb-5"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary"><MessageSquareText className="size-5" aria-hidden="true" /></div><div><CardTitle className="text-base">Distribusi kategori</CardTitle><p className="mt-1 text-sm text-muted-foreground">Komposisi laporan yang ditangani Manajemen Jurusan.</p></div></CardHeader><CardContent className="space-y-3 p-5 pt-0 md:p-6 md:pt-0">{categorySummary.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"><span className="flex items-center gap-2 text-sm text-foreground"><span className={`size-2 rounded-full ${item.className}`} aria-hidden="true" />{item.label}</span><span className="text-sm font-semibold text-foreground">{item.value}</span></div>)}</CardContent></div></Card>
        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4 md:p-6 md:pb-5"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background text-primary"><CircleCheckBig className="size-5" aria-hidden="true" /></div><div><CardTitle className="text-base">Status penanganan</CardTitle><p className="mt-1 text-sm text-muted-foreground">Ringkasan posisi seluruh laporan pada periode ini.</p></div></CardHeader><CardContent className="space-y-3 p-5 pt-0 md:p-6 md:pt-0">{statusSummary.map((item) => <div key={item.label} className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-background/40 px-3 py-2.5"><span className="flex items-center gap-2 text-sm text-foreground"><span className={`size-2 rounded-full ${item.className}`} aria-hidden="true" />{item.label}</span><span className="text-sm font-semibold text-foreground">{item.value}</span></div>)}</CardContent></div></Card>
      </div>

      <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs xl:col-span-2"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="grid gap-4 p-5 md:grid-cols-3 md:p-6"><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary"><ClipboardList className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">{totalReports} laporan tercatat</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Layanan dan Lainnya merupakan cakupan operasional Manajemen.</p></div></div><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary"><CircleCheckBig className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">{completedReports} laporan selesai</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tanggapan akhir telah dicatat pada tiket yang ditutup.</p></div></div><div className="flex items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary"><ChartNoAxesCombined className="size-4" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">Puncak laporan pada 17 Sep</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Tiga laporan masuk tercatat pada hari tersebut.</p></div></div></CardContent></div></Card>
    </div>
  )
}
