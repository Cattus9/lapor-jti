// [AUTH-ROLE] Rekap export is operationally scoped, authenticated and never publicly cached.
import { getManagementService } from "@/features/management/server"
import { managementRequest } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  let response: Response | undefined
  const error = await apiResult(async () => {
    const csv = await getManagementService().export(await managementRequest(request), Object.fromEntries(new URL(request.url).searchParams))
    response = new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": 'attachment; filename="rekap-laporan-manajemen.csv"' } })
    return { ok: true }
  })
  return response ?? error
}
