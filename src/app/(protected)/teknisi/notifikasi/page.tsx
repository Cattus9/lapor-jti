import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { TeknisiNotificationList } from "@/features/notifications/components/teknisi-notification-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function TeknisiNotificationsPage() {
  const user = await requireDummyRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting untuk penanganan fasilitas, ${user.name}.`} /><TeknisiNotificationList /></ContentShell></DashboardLayout>
}
