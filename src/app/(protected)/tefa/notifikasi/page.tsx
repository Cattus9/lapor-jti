import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import { getTefaService } from "@/features/tefa/server"
import { requireRole } from "@/lib/auth/require-role"
export default async function TefaNotificationsPage() {
  const user = await requireRole("tefa")
  const data = await getTefaService().notifications(user)
  return <DashboardLayout role="tefa" user={user}><ContentShell><PageHeader title="Notifikasi" description="Laporan masuk dan pembaruan layanan yang ditugaskan kepada TEFA." /><NotificationList initialItems={data.items} initialUnread={data.unread} initialNextCursor={data.nextCursor} persistRead apiEndpoint="/api/tefa/notifications" detailHref="/tefa/laporan" /></ContentShell></DashboardLayout>
}
