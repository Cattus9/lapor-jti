import { ManajemenDashboard } from "@/features/management/components/manajemen-dashboard"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManajemenDashboardPage() {
  const user = await requireDummyRole("manajemen")
  return <ManajemenDashboard user={user} />
}
