import { PelaporDashboard } from "@/features/reports/components/pelapor-dashboard"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function PelaporDashboardPage() {
  const user = await requireDummyRole("pelapor")
  return <PelaporDashboard user={user} />
}
