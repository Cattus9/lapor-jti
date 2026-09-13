import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireDummyRole } from "@/lib/auth/require-role"

export default function ManajemenDashboardPage() {
  const user = requireDummyRole("manajemen")

  return (
    <RoleDashboardPage
      role="manajemen"
      user={user}
      title="Dashboard Manajemen"
      description="Pantau layanan dan laporan operasional JTI."
    />
  )
}
