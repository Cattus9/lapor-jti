import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementMonitoring } from "@/features/management/components/management-monitoring"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementMonitoringPage() {
  const user = await requireDummyRole("manajemen")

  return <DashboardLayout role="manajemen"><ContentShell><PageHeader title="Monitoring" description={`Awasi perkembangan laporan lintas kategori JTI, ${user.name}.`} /><ManagementMonitoring /></ContentShell></DashboardLayout>
}
