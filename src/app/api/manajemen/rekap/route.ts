import { getManagementService } from "@/features/management/server"
import { managementRequest } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getManagementService().recap(
    await managementRequest(request),
    Object.fromEntries(new URL(request.url).searchParams),
  ))
}
