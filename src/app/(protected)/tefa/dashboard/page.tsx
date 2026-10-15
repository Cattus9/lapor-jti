import { TefaWorkspace } from "@/features/tefa/components/tefa-workspace"
import { requireRole } from "@/lib/auth/require-role"

export default async function TefaDashboardPage() {
  const user = await requireRole("tefa")
  return <TefaWorkspace user={user} view="dashboard" />
}
