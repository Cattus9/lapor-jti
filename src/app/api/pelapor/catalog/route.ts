import { getOperationsRepository } from "@/features/operations/infrastructure/operations-repository"
import { apiResult, reporterRequest } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => { await reporterRequest(request); return getOperationsRepository().catalog() })
}
