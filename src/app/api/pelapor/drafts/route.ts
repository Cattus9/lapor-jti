import { apiResult, reporterRequest, writeReportRequest } from "@/features/reports/infrastructure/http"

export async function POST(request: Request) {
  return apiResult(async () => writeReportRequest(request, await reporterRequest(request, true), false))
}
