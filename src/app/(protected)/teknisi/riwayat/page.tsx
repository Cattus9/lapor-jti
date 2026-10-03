import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { TeknisiRepairHistory } from "@/features/facilities/components/teknisi-repair-history"
import { requireRole } from "@/lib/auth/require-role"

export default async function TeknisiRepairHistoryPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "teknisi" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Riwayat Perbaikan" description={`Arsip pekerjaan fasilitas yang sudah ditangani, ${user.name}.`} /><TeknisiRepairHistory /></ContentShell></DashboardLayout>
}
