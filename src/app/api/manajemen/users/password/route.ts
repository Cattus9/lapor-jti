import { managementRequest, readManagementJson } from "@/features/management/infrastructure/http"
import { getOperationsRepository } from "@/features/operations/infrastructure/operations-repository"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await managementRequest(request, true)
    return getOperationsRepository().resetLocalPassword(actor, await readManagementJson(request))
  })
}
