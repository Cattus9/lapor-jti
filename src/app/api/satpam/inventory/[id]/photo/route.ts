import { getSatpamService } from "@/features/lost-found/server"
import { satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let response: Response | undefined
  const error = await apiResult(async () => {
    const actor = await satpamRequest(request)
    const { id } = await context.params
    const { photo, bytes } = await getSatpamService().downloadInventoryPhoto(actor, id, new URL(request.url).searchParams.get("preview") === "1")
    const disposition = new URL(request.url).searchParams.get("preview") === "1" ? "inline" : "attachment"

    response = new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": photo.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
        "Content-Disposition": `${disposition}; filename="foto-inventaris"; filename*=UTF-8''${encodeURIComponent(photo.name).replace(/'/g, "%27")}`,
      },
    })
    return { ok: true }
  })

  return response ?? error
}
