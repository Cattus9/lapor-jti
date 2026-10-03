import { TeknisiDashboard } from "@/features/facilities/components/teknisi-dashboard"
import { requireRole } from "@/lib/auth/require-role"

export default async function TeknisiDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "teknisi" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("teknisi")

  return <TeknisiDashboard user={user} />
}
