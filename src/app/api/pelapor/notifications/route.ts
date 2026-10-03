import { getReportService } from "@/features/reports/server"
import { apiResult, reporterRequest, readNotificationRequest } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getReportService().notifications(await reporterRequest(request), new URL(request.url).searchParams.get("cursor") ?? undefined))
}
export async function PATCH(request: Request) {
  return apiResult(async () => readNotificationRequest(request, await reporterRequest(request, true)))
}
