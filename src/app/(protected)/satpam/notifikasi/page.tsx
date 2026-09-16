import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { SatpamNotificationList } from "@/features/notifications/components/satpam-notification-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function SatpamNotificationsPage() {
  const user = await requireDummyRole("satpam")

  return <DashboardLayout role="satpam"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting untuk penanganan laporan, ${user.name}.`} /><SatpamNotificationList /></ContentShell></DashboardLayout>
}
