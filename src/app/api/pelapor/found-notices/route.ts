import { getFoundNoticeService } from "@/features/found-notices/server"
import { apiResult, limitedBody, reporterRequest } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"
import type { FoundNoticeState } from "@/features/found-notices/domain/found-notice"

export async function GET(request: Request) {
  return apiResult(async () => {
    const params = new URL(request.url).searchParams
    return getFoundNoticeService().list(await reporterRequest(request), {
      cursor: params.get("cursor") || undefined,
      search: params.get("search") || undefined,
      state: (params.get("state") || undefined) as FoundNoticeState | undefined,
    })
  })
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
