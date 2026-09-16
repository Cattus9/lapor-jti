import { SatpamHandoverHistory } from "@/features/lost-found/components/satpam-handover-history"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function SatpamHistoryPage() {
  const user = await requireDummyRole("satpam")

  return <SatpamHandoverHistory user={user} />
}
