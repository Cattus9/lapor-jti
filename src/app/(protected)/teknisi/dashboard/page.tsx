import { TeknisiDashboard } from "@/features/facilities/components/teknisi-dashboard"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function TeknisiDashboardPage() {
  const user = await requireDummyRole("teknisi")

  return <TeknisiDashboard user={user} />
}
