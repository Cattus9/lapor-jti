import { SatpamPelaporanWorkspace } from "@/features/lost-found/components/satpam-pelaporan-workspace"
import { requireRole } from "@/lib/auth/require-role"

export default async function SatpamPelaporanPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  const user = await requireRole("satpam")

  return <SatpamPelaporanWorkspace user={user} />
}
