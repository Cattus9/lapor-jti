import { managementRequest, readManagementJson } from "@/features/management/infrastructure/http"
import { getOperationsRepository } from "@/features/operations/infrastructure/operations-repository"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => {
    const actor = await managementRequest(request)
    const query = Object.fromEntries(new URL(request.url).searchParams)
    const repository = getOperationsRepository()
    if (query.ids !== undefined) return { items: await repository.listSelectedUsers(actor, query.ids) }
    return repository.listUsers(actor, query)
  })
}
export async function POST(request: Request) {
  return apiResult(async () => getOperationsRepository().saveUser(await managementRequest(request, true), await readManagementJson(request)))
}
