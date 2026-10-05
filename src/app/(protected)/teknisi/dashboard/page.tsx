import { TeknisiDashboard } from "@/features/facilities/components/teknisi-dashboard"
import { requireRole } from "@/lib/auth/require-role"
import { getTechnicianService } from "@/features/facilities/server"

export default async function TeknisiDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "teknisi" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("teknisi")

  const data = await getTechnicianService().dashboard(user)
  return <TeknisiDashboard user={user} data={data} />
}
