import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { SatpamNotificationList } from "@/features/notifications/components/satpam-notification-list"
import { requireRole } from "@/lib/auth/require-role"

export default async function SatpamNotificationsPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("satpam")

  return <DashboardLayout role="satpam"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting untuk penanganan laporan, ${user.name}.`} /><SatpamNotificationList /></ContentShell></DashboardLayout>
}
