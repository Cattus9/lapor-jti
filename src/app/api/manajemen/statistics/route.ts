// [AUTH-ROLE] UI visibility is not authorization; every request checks the live database role.
import { getManagementService } from "@/features/management/server"
import { managementRequest } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getManagementService().statistics(await managementRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}

