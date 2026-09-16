import { SatpamLostFoundWorkspace } from "@/features/lost-found/components/satpam-lost-found-workspace"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function SatpamLostFoundPage() {
  const user = await requireDummyRole("satpam")

  return <SatpamLostFoundWorkspace user={user} />
}
