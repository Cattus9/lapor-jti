// [AUTH-ROLE] Monitoring is read-only; operational details are additionally category-scoped.
import { getManagementService } from "@/features/management/server"
import { managementRequest } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, { params }: { params: Promise<{ ticket: string }> }) {
  return apiResult(async () => getManagementService().detail(await managementRequest(request), (await params).ticket, true))
}

