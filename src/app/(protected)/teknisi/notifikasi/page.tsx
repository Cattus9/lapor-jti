import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { TeknisiNotificationList } from "@/features/notifications/components/teknisi-notification-list"
import { requireRole } from "@/lib/auth/require-role"

export default async function TeknisiNotificationsPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "teknisi" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting untuk penanganan fasilitas, ${user.name}.`} /><TeknisiNotificationList /></ContentShell></DashboardLayout>
}
