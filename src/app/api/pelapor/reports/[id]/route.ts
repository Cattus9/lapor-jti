import { getReportService } from "@/features/reports/server"
import { apiResult, reporterRequest } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => getReportService().detail(await reporterRequest(request), (await context.params).id))
}
