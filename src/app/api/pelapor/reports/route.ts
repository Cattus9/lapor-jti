import { getReportService } from "@/features/reports/server"
import { apiResult, reporterRequest, writeReportRequest } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => {
    const query = new URL(request.url).searchParams
    return getReportService().list(await reporterRequest(request), query.get("cursor") ?? undefined, query.get("ticket") ?? undefined, query.get("draftCursor") ?? undefined)
  })
}
export async function POST(request: Request) {
  return apiResult(async () => writeReportRequest(request, await reporterRequest(request, true), true))
}
