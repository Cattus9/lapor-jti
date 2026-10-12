import { SatpamInventoryWorkspace } from "@/features/lost-found/components/satpam-inventory-workspace"
import { requireRole } from "@/lib/auth/require-role"

export default async function SatpamInventarisPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  const user = await requireRole("satpam")

  return <SatpamInventoryWorkspace user={user} />
}
