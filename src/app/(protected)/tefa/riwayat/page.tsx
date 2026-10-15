import { TefaWorkspace } from "@/features/tefa/components/tefa-workspace"
import { requireRole } from "@/lib/auth/require-role"

export default async function TefaHistoryPage() {
  const user = await requireRole("tefa")
  return <TefaWorkspace user={user} view="history" />
}
