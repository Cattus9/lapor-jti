import { getFoundNoticeService } from "@/features/found-notices/server"
import { apiResult, reporterRequest } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => getFoundNoticeService().detail(await reporterRequest(request), { id: (await context.params).id, source: new URL(request.url).searchParams.get("source") }))
}
