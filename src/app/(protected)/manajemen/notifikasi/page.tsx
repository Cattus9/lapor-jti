import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementNotificationList } from "@/features/notifications/components/manajemen-notification-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementNotificationsPage() {
  const user = await requireDummyRole("manajemen")

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan yang perlu ditinjau untuk penanganan laporan, ${user.name}.`} /><ManagementNotificationList /></ContentShell></DashboardLayout>
}
