import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function AdminDashboardPage() {
  const user = await requireDummyRole("admin")

  return (
    <RoleDashboardPage
      role="admin"
      user={user}
      title="Dashboard Admin Sistem"
      description="Kelola konfigurasi dan operasional aplikasi."
    />
  )
}
