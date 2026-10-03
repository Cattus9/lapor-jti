import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementReportWorkspace } from "@/features/management/components/management-report-workspace"
import { requireRole } from "@/lib/auth/require-role"

type ManagementReportsPageProps = {
  searchParams: Promise<{ category?: string }>
}

export default async function ManagementReportsPage({ searchParams }: ManagementReportsPageProps) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "manajemen" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("manajemen")
  const { category } = await searchParams
  const initialCategory = category === "layanan" ? "Layanan" : category === "lainnya" ? "Lainnya" : "Semua"

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Kelola Laporan" description={`Tinjau dan tindak lanjuti seluruh laporan JTI, ${user.name}.`} /><ManagementReportWorkspace initialCategory={initialCategory} /></ContentShell></DashboardLayout>
}
