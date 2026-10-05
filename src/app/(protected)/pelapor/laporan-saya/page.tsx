import { PelaporReportList } from "@/features/reports/components/pelapor-report-list"
import { requireRole } from "@/lib/auth/require-role"
import { getReportService } from "@/features/reports/server"
import { parseReportListFilters } from "@/features/reports/domain/report-list-filters"

export default async function PelaporReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")
  const query = await searchParams
  const filters = parseReportListFilters(query)
  const cursor = typeof query.cursor === "string" ? query.cursor : undefined
  const draftCursor = typeof query.draftCursor === "string" ? query.draftCursor : undefined
  const ticket = typeof query.ticket === "string" ? query.ticket : undefined
  const data = await getReportService().list(user, cursor, ticket, draftCursor, filters)
  return <PelaporReportList user={user} data={data} filters={filters} selectedTicket={ticket} cursor={cursor} draftCursor={draftCursor} />
}
