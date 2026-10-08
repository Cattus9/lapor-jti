import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { OperationalSettings } from "@/features/operations/components/operational-settings"
import { requireRole } from "@/lib/auth/require-role"

export default async function OperationalSettingsPage() {
  const user = await requireRole("manajemen")
  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Pengaturan Operasional" description="Atur petugas, lokasi, fasilitas, dan layanan yang digunakan dalam pelaporan JTI." /><OperationalSettings /></ContentShell></DashboardLayout>
}
