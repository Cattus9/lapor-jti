import { PelaporDashboard } from "@/features/reports/components/pelapor-dashboard"
import { requireDummyRole } from "@/lib/auth/require-role"

export default function PelaporDashboardPage() {
  const user = requireDummyRole("pelapor")
  return <PelaporDashboard user={user} />
}
