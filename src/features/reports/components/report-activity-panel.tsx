import Link from "next/link"
import { ArrowRight, CheckCircle2, CircleDotDashed, Clock3, FileSearch, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import type { ReportSummary } from "@/features/reports/types"

const categoryIcon = {
  "kehilangan-temuan": FileSearch,
  fasilitas: Wrench,
  layanan: CircleDotDashed,
  lainnya: Clock3,
}

const categoryLabel = {
  "kehilangan-temuan": "Kehilangan & Temuan",
  fasilitas: "Fasilitas",
  layanan: "Layanan",
  lainnya: "Lainnya",
}

const statusLabel = { baru: "Baru", diverifikasi: "Diverifikasi", diproses: "Diproses", selesai: "Selesai" }
const statusVariant = { baru: "outline", diverifikasi: "secondary", diproses: "default", selesai: "secondary" } as const

export function ReportActivityPanel({ reports }: { reports: ReportSummary[] }) {
  return (
    <Card className="gap-0 rounded-2xl bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-foreground">Aktivitas laporan</p>
            <p className="mt-1 text-xs text-muted-foreground">Perkembangan terbaru dari tiket yang Anda kirim.</p>
          </div>
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow-2xs">
            <CheckCircle2 className="size-4 text-primary" strokeWidth={1.75} />
          </div>
        </div>
        <div className="space-y-2">
          {reports.map((report) => {
            const Icon = categoryIcon[report.category]
            return (
              <Link key={report.ticketNumber} href="/pelapor/laporan-saya" className="group flex items-center gap-3 rounded-lg border border-border/60 p-3 transition-colors hover:bg-muted/50">
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-muted-foreground">
                  <Icon className="size-4" strokeWidth={1.75} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{report.ticketNumber} · {categoryLabel[report.category]} · {report.updatedAt}</p>
                </div>
                <Badge variant={statusVariant[report.status]}>{statusLabel[report.status]}</Badge>
              </Link>
            )
          })}
        </div>
      </div>
      <Link href="/pelapor/laporan-saya" className="group flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <span>Lihat semua laporan</span>
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
      </Link>
    </Card>
  )
}
