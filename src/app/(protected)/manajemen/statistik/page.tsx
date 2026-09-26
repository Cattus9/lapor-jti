import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementStatistics } from "@/features/management/components/management-statistics"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementStatisticsPage() {
  const user = await requireDummyRole("manajemen")

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Statistik" description={`Pantau laporan lintas peran dan kondisi penanganannya, ${user.name}.`} /><ManagementStatistics /></ContentShell></DashboardLayout>
}
