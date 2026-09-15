import { RoleDashboardPage } from "@/components/layout/role-dashboard-page"
import { requireDummyRole } from "@/lib/auth/require-role"

export default function PelaporPage() {
  const user = requireDummyRole("pelapor")

  return <RoleDashboardPage role="pelapor" user={user} title="Notifikasi" description="Pembaruan status untuk laporan Anda." />
}
