import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireDummyRole } from "@/lib/auth/require-role"

export default function SatpamDashboardPage() {
  const user = requireDummyRole("satpam")

  return (
    <RoleDashboardPage
      role="satpam"
      user={user}
      title="Dashboard Satpam"
      description="Kelola laporan kehilangan dan temuan."
    />
  )
}
