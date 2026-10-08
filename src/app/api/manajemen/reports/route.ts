// [AUTH-ROLE] UI visibility is not authorization; every request checks the live database role.
import { getManagementService } from "@/features/management/server"
import { managementRequest, readManagementJson } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getManagementService().list(await managementRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}

export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await managementRequest(request, true)
    return getManagementService().execute(actor, await readManagementJson(request))
  })
}

