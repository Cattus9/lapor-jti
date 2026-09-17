import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementReportWorkspace } from "@/features/management/components/management-report-workspace"
import { requireDummyRole } from "@/lib/auth/require-role"

type ManagementReportsPageProps = {
  searchParams: Promise<{ category?: string }>
}

export default async function ManagementReportsPage({ searchParams }: ManagementReportsPageProps) {
  const user = await requireDummyRole("manajemen")
  const { category } = await searchParams
  const initialCategory = category === "layanan" ? "Layanan" : category === "lainnya" ? "Lainnya" : "Semua"

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Kelola Laporan" description={`Tinjau dan tindak lanjuti seluruh laporan JTI, ${user.name}.`} /><ManagementReportWorkspace initialCategory={initialCategory} /></ContentShell></DashboardLayout>
}
