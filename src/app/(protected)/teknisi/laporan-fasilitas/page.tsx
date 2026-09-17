import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { TeknisiFacilityReportList } from "@/features/facilities/components/teknisi-facility-report-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function TeknisiFacilityReportsPage() {
  const user = await requireDummyRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Laporan Fasilitas" description={`Kelola antrean kerusakan fasilitas JTI, ${user.name}.`} /><TeknisiFacilityReportList /></ContentShell></DashboardLayout>
}
