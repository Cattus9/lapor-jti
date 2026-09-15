import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function TeknisiDashboardPage() {
  const user = await requireDummyRole("teknisi")

  return (
    <RoleDashboardPage
      role="teknisi"
      user={user}
      title="Dashboard Teknisi"
      description="Kelola antrean laporan fasilitas."
    />
  )
}
