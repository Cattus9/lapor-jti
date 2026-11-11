import { getFoundNoticeService } from "@/features/found-notices/server"
import { apiResult, reporterRequest } from "@/features/reports/infrastructure/http"
import { PrivateFileStorage } from "@/features/reports/infrastructure/private-file-storage"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let response: Response | undefined
  const error = await apiResult(async () => {
    const actor = await reporterRequest(request)
    const file = await getFoundNoticeService().photo(actor, { id: (await context.params).id, source: new URL(request.url).searchParams.get("source") })
    const preview = await new PrivateFileStorage().readPreview(file)
    response = new Response(new Uint8Array(preview.bytes), { headers: {
      "Content-Type": preview.mimeType, "Content-Length": String(preview.bytes.length), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": "inline; filename=temuan.webp",
    } })
    return { ok: true }
  })
  return response ?? error
}
