import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementReportWorkspace } from "@/features/management/components/management-report-workspace"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementOtherReportsPage() {
  const user = await requireDummyRole("manajemen")

  return <DashboardLayout role="manajemen"><ContentShell><PageHeader title="Laporan Lainnya" description={`Tindak lanjuti laporan umum yang membutuhkan koordinasi jurusan, ${user.name}.`} /><ManagementReportWorkspace category="Lainnya" /></ContentShell></DashboardLayout>
}
