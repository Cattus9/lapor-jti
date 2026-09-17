import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementReportWorkspace } from "@/features/management/components/management-report-workspace"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementServiceReportsPage() {
  const user = await requireDummyRole("manajemen")

  return <DashboardLayout role="manajemen"><ContentShell><PageHeader title="Laporan Layanan" description={`Kelola permintaan layanan internal JTI, ${user.name}.`} /><ManagementReportWorkspace category="Layanan" /></ContentShell></DashboardLayout>
}
