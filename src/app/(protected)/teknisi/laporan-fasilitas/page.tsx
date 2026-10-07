import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { TeknisiFacilityReportList } from "@/features/facilities/components/teknisi-facility-report-list"
import { requireRole } from "@/lib/auth/require-role"

export default async function TeknisiFacilityReportsPage({ searchParams }: { searchParams: Promise<{ view?: string; ticket?: string }> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "teknisi" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("teknisi")
  const { view, ticket } = await searchParams
  // Preserve existing links while naming the active-ticket view explicitly.
  const initialView = view === "queue" || view === "all" ? "queue" : "priority"

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Laporan Fasilitas" description={`Kelola antrean kerusakan fasilitas JTI, ${user.name}.`} /><TeknisiFacilityReportList initialView={initialView} ticket={typeof ticket === "string" ? ticket : undefined} /></ContentShell></DashboardLayout>
}
