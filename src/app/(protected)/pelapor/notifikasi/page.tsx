import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { PelaporNotificationList } from "@/features/notifications/components/pelapor-notification-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function PelaporPage() {
  const user = await requireDummyRole("pelapor")

  return <DashboardLayout role="pelapor"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting tentang perkembangan laporan ${user.name}.`} /><PelaporNotificationList /></ContentShell></DashboardLayout>
}
