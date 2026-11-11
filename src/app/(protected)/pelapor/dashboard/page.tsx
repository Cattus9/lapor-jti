import { PelaporDashboard } from "@/features/reports/components/pelapor-dashboard"
import { requireRole } from "@/lib/auth/require-role"
import { getReportService } from "@/features/reports/server"
import { getFoundNoticeService } from "@/features/found-notices/server"

export default async function PelaporDashboardPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")
  const [data, foundNotices] = await Promise.all([
    getReportService().dashboard(user),
    getFoundNoticeService().list(user, { activeOnly: true, limit: 3 }),
  ])
  return <PelaporDashboard user={user} data={data} foundNotices={foundNotices} />
}
