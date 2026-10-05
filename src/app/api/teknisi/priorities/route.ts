// [AUTH-ROLE] Aggregates are private operational data for the authenticated Technician role.
import { getTechnicianService } from "@/features/facilities/server"
import { technicianRequest } from "@/features/facilities/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => ({ items: await getTechnicianService().priorities(await technicianRequest(request), Object.fromEntries(new URL(request.url).searchParams)) }))
}
