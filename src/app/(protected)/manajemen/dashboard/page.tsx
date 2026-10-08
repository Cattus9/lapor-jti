import { ManajemenDashboard } from "@/features/management/components/manajemen-dashboard"
import { requireRole } from "@/lib/auth/require-role"
import { getManagementService } from "@/features/management/server"

export default async function ManajemenDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "manajemen" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("manajemen")
  const data = await getManagementService().dashboard(user)
  return <ManajemenDashboard user={user} data={data} />
}
