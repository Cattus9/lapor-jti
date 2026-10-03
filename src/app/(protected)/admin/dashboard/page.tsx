import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireRole } from "@/lib/auth/require-role"

export default async function AdminDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "admin" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("admin")

  return (
    <RoleDashboardPage
      role="admin"
      user={user}
      title="Dashboard Admin Sistem"
      description="Kelola konfigurasi dan operasional aplikasi."
    />
  )
}
