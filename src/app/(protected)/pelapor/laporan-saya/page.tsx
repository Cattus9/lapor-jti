import { PelaporReportList } from "@/features/reports/components/pelapor-report-list"
import { requireRole } from "@/lib/auth/require-role"
import { getReportService } from "@/features/reports/server"

export default async function PelaporReportsPage({ searchParams }: { searchParams: Promise<{ cursor?: string; ticket?: string; draftCursor?: string }> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")
  const query = await searchParams
  const data = await getReportService().list(user, query.cursor, query.ticket, query.draftCursor)
  return <PelaporReportList user={user} data={data} selectedTicket={query.ticket} paginated={Boolean(query.cursor || query.draftCursor)} />
}
