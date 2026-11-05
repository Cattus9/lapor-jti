import { getSatpamDraftService } from "@/features/lost-found/server"
import { satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, { params }: { params: Promise<{ id: string; photoId: string }> }) {
  let response: Response | undefined
  const error = await apiResult(async () => {
    const actor = await satpamRequest(request)
    const { id, photoId } = await params
    const { file, bytes } = await getSatpamDraftService().photo(actor, id, photoId)
    response = new Response(new Uint8Array(bytes), { headers: { "Content-Type": file.mimeType, "Content-Length": String(bytes.length), "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox", "Content-Disposition": `attachment; filename="foto-draft"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}` } })
    return { ok: true }
  })
  return response ?? error
}
