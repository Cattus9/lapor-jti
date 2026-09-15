import Link from "next/link"
import { ClipboardCheck, Clock3, FileCheck2, FilePlus2 } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ReportActivityPanel } from "@/features/reports/components/report-activity-panel"
import type { CurrentUser } from "@/lib/auth/dummy-session"
import { pelaporReports } from "@/features/reports/mock/pelapor-reports"



export function PelaporDashboard({ user }: { user: CurrentUser }) {
  const activeReports = pelaporReports.filter((report) => report.status !== "selesai").length
  const completedReports = pelaporReports.filter((report) => report.status === "selesai").length
  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Dashboard Pelapor" description={`Selamat datang kembali, ${user.name}. Pantau laporan Anda di sini.`} action={<Button nativeButton={false} render={<Link href="/pelapor/buat-laporan" />}><FilePlus2 />Buat Laporan</Button>} />
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Laporan aktif" value={activeReports} icon={Clock3} detail="Sedang ditangani" detailValue={`${activeReports} tiket`} detailTone="amber" href="/pelapor/laporan-saya" />
          <KpiCard label="Total laporan" value={pelaporReports.length} icon={ClipboardCheck} detail="Semua kategori" detailValue="Riwayat" href="/pelapor/laporan-saya" />
          <KpiCard label="Laporan selesai" value={completedReports} icon={FileCheck2} detail="Terselesaikan" detailValue={`${completedReports} tiket`} detailTone="green" href="/pelapor/laporan-saya" />
        </div>
        <ReportActivityPanel reports={pelaporReports} />
      </ContentShell>
    </DashboardLayout>
  )
}
