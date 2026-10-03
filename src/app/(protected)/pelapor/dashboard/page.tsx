import { PelaporDashboard } from "@/features/reports/components/pelapor-dashboard"
import { requireRole } from "@/lib/auth/require-role"
import { getReportService } from "@/features/reports/server"

export default async function PelaporDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")
  const data = await getReportService().dashboard(user)
  return <PelaporDashboard user={user} data={data} />
}
