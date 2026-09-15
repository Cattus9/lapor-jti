import { SatpamDashboard } from "@/features/lost-found/components/satpam-dashboard"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function SatpamDashboardPage() {
  const user = await requireDummyRole("satpam")

  return <SatpamDashboard user={user} />
}
