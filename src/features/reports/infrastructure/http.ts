import "server-only"
// [AUTH-SESSION] API authentication uses the same session adapter as pages; no client-supplied identity/role.
import { getCurrentUser } from "@/lib/auth/server-session"
import { getAuthEnvironment } from "@/lib/auth/environment"
import { getReportService } from "../server"
import { ReportError, requireReporter, type ReportActor, type AttachmentUpload } from "../domain/report"

export async function reporterRequest(request: Request, mutate = false) {
  const user = await getCurrentUser()
  if (!user) throw new ReportError("Silakan login kembali.", 401)
  requireReporter(user)
  if (mutate && request.headers.get("origin") !== new URL(getAuthEnvironment().baseURL).origin) throw new ReportError("Origin permintaan tidak diizinkan.", 403)
  return user
}
export async function apiResult(run: () => Promise<unknown>) {
  try { return Response.json(await run(), { headers: { "Cache-Control": "private, no-store" } }) }
  catch (error) {
    if (error instanceof ReportError) return Response.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "private, no-store" } })
    console.error("Report request failed. Check database/storage availability.")
    return Response.json({ error: "Permintaan belum berhasil. Silakan coba lagi." }, { status: 500 })
  }
}
async function limitedBody(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length"))
  if (length > limit) throw new ReportError("Ukuran permintaan terlalu besar.", 413)
  if (!request.body) throw new ReportError("Isian permintaan kosong.")
  const reader = request.body.getReader(); const parts: Uint8Array[] = []; let size = 0
  try {
    for (;;) {
      const result = await reader.read()
      if (result.done) break
      size += result.value.byteLength
      if (size > limit) { await reader.cancel(); throw new ReportError("Ukuran permintaan terlalu besar.", 413) }
      parts.push(result.value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0
  for (const part of parts) { bytes.set(part, offset); offset += part.length }
  return bytes
}
export async function writeReportRequest(request: Request, actor: ReportActor, submit: boolean) {
  const contentType = request.headers.get("content-type") ?? ""
  if (!contentType.startsWith("multipart/form-data")) throw new ReportError("Format permintaan tidak valid.", 415)
  const bytes = await limitedBody(request, 22 * 1024 * 1024)
  let form: FormData
  try { form = await new Response(bytes, { headers: { "Content-Type": contentType } }).formData() }
  catch { throw new ReportError("Isian formulir tidak valid.") }
  const data = form.get("data")
  if (typeof data !== "string" || data.length > 30000) throw new ReportError("Isian laporan terlalu besar atau tidak valid.")
  let raw: unknown
  try { raw = JSON.parse(data) } catch { throw new ReportError("Isian laporan tidak valid.") }
  const uploads = form.getAll("files")
  if (uploads.length > 4) throw new ReportError("Maksimal 4 lampiran.")
  const files: AttachmentUpload[] = []
  for (const upload of uploads) {
    if (!(upload instanceof File) || upload.size > 5 * 1024 * 1024) throw new ReportError("Lampiran maksimal 5 MB per file.")
    files.push({ name: upload.name, mimeType: upload.type, bytes: new Uint8Array(await upload.arrayBuffer()) })
  }
  return getReportService().write(actor, raw, files, submit)
}
export async function readNotificationRequest(request: Request, actor: ReportActor) {
  const bytes = await limitedBody(request, 1024)
  let value: unknown
  try { value = JSON.parse(new TextDecoder().decode(bytes)) } catch { throw new ReportError("Isian permintaan tidak valid.") }
  if (!value || typeof value !== "object") throw new ReportError("Isian permintaan tidak valid.")
  const body = value as Record<string, unknown>
  if (body.all !== true && typeof body.id !== "string") throw new ReportError("Pilih notifikasi yang akan dibaca.")
  await getReportService().markRead(actor, body.all === true ? undefined : body.id as string)
  return { ok: true }
}
