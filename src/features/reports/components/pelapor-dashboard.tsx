import Link from "next/link"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.
import { ClipboardCheck, Clock3, FileCheck2, FilePlus2 } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { ReportActivityPanel } from "@/features/reports/components/report-activity-panel"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { DashboardData } from "../application/ports"



export function PelaporDashboard({ user, data }: { user: CurrentUser; data: DashboardData }) {
  const activeReports = data.active
  const completedReports = data.completed
  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Dashboard Pelapor" description={`Selamat datang kembali, ${user.name}. Pantau laporan Anda di sini.`} action={<Button nativeButton={false} render={<Link href="/pelapor/buat-laporan" />}><FilePlus2 />Buat Laporan</Button>} />
        <div className="grid gap-4 sm:grid-cols-3">
          <KpiCard label="Laporan aktif" value={activeReports} icon={Clock3} iconTone="amber" detail="Sedang ditangani" detailValue={`${activeReports} tiket`} detailTone="amber" href="/pelapor/laporan-saya" />
          <KpiCard label="Total laporan" value={data.total} icon={ClipboardCheck} detail="Semua kategori" detailValue="Riwayat" href="/pelapor/laporan-saya" />
          <KpiCard label="Laporan selesai" value={completedReports} icon={FileCheck2} iconTone="green" detail="Terselesaikan" detailValue={`${completedReports} tiket`} detailTone="green" href="/pelapor/laporan-saya" />
        </div>
        <ReportActivityPanel reports={data.recent} />
      </ContentShell>
    </DashboardLayout>
  )
}
