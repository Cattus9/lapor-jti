import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementReportRecap } from "@/features/management/components/management-report-recap"
import { requireRole } from "@/lib/auth/require-role"

export default async function ManagementReportRecapPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "manajemen" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("manajemen")

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Rekap Laporan" description="Ringkasan laporan yang selesai ditangani lintas pengelola dan ekspor berdasarkan tanggal selesai." /><ManagementReportRecap /></ContentShell></DashboardLayout>
}
