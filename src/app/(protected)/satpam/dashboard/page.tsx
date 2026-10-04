import { SatpamDashboard } from "@/features/lost-found/components/satpam-dashboard"
import { requireRole } from "@/lib/auth/require-role"
import { getSatpamService } from "@/features/lost-found/server"

export default async function SatpamDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("satpam")

  return <SatpamDashboard user={user} data={await getSatpamService().dashboard(user)} />
}
