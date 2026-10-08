import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ManagementNotificationList } from "@/features/notifications/components/manajemen-notification-list"
import { requireRole } from "@/lib/auth/require-role"
import { getManagementService } from "@/features/management/server"

export default async function ManagementNotificationsPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "manajemen" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("manajemen")
  const data = await getManagementService().notifications(user)

  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan yang perlu ditinjau untuk penanganan laporan, ${user.name}.`} /><ManagementNotificationList data={data} /></ContentShell></DashboardLayout>
}
