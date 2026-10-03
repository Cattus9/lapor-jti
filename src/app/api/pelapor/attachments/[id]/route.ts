import { getReportService } from "@/features/reports/server"
import { apiResult, reporterRequest } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  let response: Response | undefined
  const error = await apiResult(async () => {
    const { file, bytes } = await getReportService().download(await reporterRequest(request), (await context.params).id)
    const disposition = new URL(request.url).searchParams.get("preview") === "1" && file.mimeType.startsWith("image/") ? "inline" : "attachment"
    response = new Response(new Uint8Array(bytes), { headers: {
      "Content-Type": file.mimeType, "Content-Length": String(bytes.length), "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff", "Content-Security-Policy": "default-src 'none'; sandbox",
      "Content-Disposition": `${disposition}; filename="attachment"; filename*=UTF-8''${encodeURIComponent(file.name).replace(/'/g, "%27")}`,
    } })
    return { ok: true }
  })
  return response ?? error
}
