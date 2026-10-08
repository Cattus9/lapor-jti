import { managementRequest, readManagementJson } from "@/features/management/infrastructure/http"
import { getOperationsRepository } from "@/features/operations/infrastructure/operations-repository"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getOperationsRepository().listUsers(await managementRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}
export async function POST(request: Request) {
  return apiResult(async () => getOperationsRepository().saveUser(await managementRequest(request, true), await readManagementJson(request)))
}
