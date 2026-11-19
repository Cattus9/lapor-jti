// [AUTH-ROLE] Both export scopes require Management and are never publicly cached.
import { getManagementService } from "@/features/management/server"
import { managementRequest } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  let response: Response | undefined
  const error = await apiResult(async () => {
    const query = Object.fromEntries(new URL(request.url).searchParams)
    const csv = await getManagementService().export(await managementRequest(request), query)
    const filename = query.scope === "monitoring" ? "rekap-laporan-lintas-pengelola.csv" : "rekap-laporan-manajemen.csv"
    response = new Response(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Disposition": `attachment; filename="${filename}"` } })
    return { ok: true }
  })
  return response ?? error
}
