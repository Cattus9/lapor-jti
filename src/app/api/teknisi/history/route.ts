// [AUTH-ROLE] Completion history uses the same category-scoped service as the operational queue.
import { getTechnicianService } from "@/features/facilities/server"
import { technicianRequest } from "@/features/facilities/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getTechnicianService().history(await technicianRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}
