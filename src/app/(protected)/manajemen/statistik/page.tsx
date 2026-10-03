import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementStatistics } from "@/features/management/components/management-statistics"
import { requireRole } from "@/lib/auth/require-role"

export default async function ManagementStatisticsPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "manajemen" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("manajemen")

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Statistik" description={`Pantau laporan lintas peran dan kondisi penanganannya, ${user.name}.`} /><ManagementStatistics /></ContentShell></DashboardLayout>
}
