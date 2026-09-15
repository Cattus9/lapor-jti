import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { CurrentUser } from "@/lib/auth/dummy-session"
import { pelaporReports } from "@/features/reports/mock/pelapor-reports"

const statusLabel = { baru: "Baru", diverifikasi: "Diverifikasi", diproses: "Diproses", selesai: "Selesai" }
const categoryLabel = { "kehilangan-temuan": "Kehilangan & Temuan", fasilitas: "Fasilitas", layanan: "Layanan", lainnya: "Lainnya" }

export function PelaporReportList({ user }: { user: CurrentUser }) {
  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Laporan Saya" description={`Seluruh riwayat laporan milik ${user.name}.`} />
        <Card><CardHeader><CardTitle>Riwayat tiket</CardTitle><CardDescription>Gunakan nomor tiket untuk memantau progres laporan.</CardDescription></CardHeader><CardContent className="space-y-3">{pelaporReports.map((report) => <div key={report.ticketNumber} className="flex flex-col gap-2 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{report.title}</p><p className="mt-1 text-xs text-muted-foreground">{report.ticketNumber} · {categoryLabel[report.category]} · Diperbarui {report.updatedAt}</p></div><Badge variant={report.status === "selesai" ? "secondary" : "outline"}>{statusLabel[report.status]}</Badge></div>)}</CardContent></Card>
      </ContentShell>
    </DashboardLayout>
  )
}
