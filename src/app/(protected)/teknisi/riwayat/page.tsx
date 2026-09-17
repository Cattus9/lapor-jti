import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { TeknisiRepairHistory } from "@/features/facilities/components/teknisi-repair-history"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function TeknisiRepairHistoryPage() {
  const user = await requireDummyRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Riwayat Perbaikan" description={`Arsip pekerjaan fasilitas yang sudah ditangani, ${user.name}.`} /><TeknisiRepairHistory /></ContentShell></DashboardLayout>
}
