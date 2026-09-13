import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireDummyRole } from "@/lib/auth/require-role"

export default function PelaporDashboardPage() {
  const user = requireDummyRole("pelapor")

  return (
    <RoleDashboardPage
      role="pelapor"
      user={user}
      title="Dashboard Pelapor"
      description="Pantau laporan dan buat laporan baru."
    />
  )
}
