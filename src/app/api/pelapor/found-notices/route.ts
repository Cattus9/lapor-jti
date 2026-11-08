import { getFoundNoticeService } from "@/features/found-notices/server"
import { apiResult, limitedBody, reporterRequest } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"

export async function GET(request: Request) {
  return apiResult(async () => getFoundNoticeService().list(await reporterRequest(request), { cursor: new URL(request.url).searchParams.get("cursor") ?? undefined }))
}
export async function PATCH(request: Request) {
  return apiResult(async () => {
    const actor = await reporterRequest(request, true)
    const bytes = await limitedBody(request, 1024)
    let value: unknown
    try { value = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new ReportError("Isian permintaan tidak valid.") }
    return getFoundNoticeService().markRead(actor, value)
  })
}
