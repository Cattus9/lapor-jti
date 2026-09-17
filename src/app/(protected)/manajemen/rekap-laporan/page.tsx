import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementReportRecap } from "@/features/management/components/management-report-recap"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementReportRecapPage() {
  const user = await requireDummyRole("manajemen")

  return <DashboardLayout role="manajemen"><ContentShell><PageHeader title="Rekap Laporan" description={`Siapkan rekap operasional sesuai filter laporan, ${user.name}.`} /><ManagementReportRecap /></ContentShell></DashboardLayout>
}
