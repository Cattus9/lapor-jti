import "server-only"
// [AUTH-ROLE] Read role/status from the database session adapter on every request, independently of SSO.
import { getCurrentUser } from "@/lib/auth/server-session"
import { getAuthEnvironment } from "@/lib/auth/environment"
import { ReportError } from "../../reports/domain/report"
import { requireManagement } from "../domain/management"

export async function managementRequest(request: Request, mutate = false) {
  const user = await getCurrentUser()
  if (!user) throw new ReportError("Silakan login kembali.", 401)
  requireManagement(user)
  if (mutate && request.headers.get("origin") !== new URL(getAuthEnvironment().baseURL).origin) throw new ReportError("Origin permintaan tidak diizinkan.", 403)
  return user
}
export async function readManagementJson(request: Request): Promise<unknown> {
  if (!request.headers.get("content-type")?.startsWith("application/json")) throw new ReportError("Format permintaan tidak valid.", 415)
  if (!request.body) throw new ReportError("Permintaan kosong.")
  const reader = request.body.getReader(), chunks: Uint8Array[] = []; let size = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.length
      if (size > 12000) { await reader.cancel(); throw new ReportError("Permintaan terlalu besar.", 413) }
      chunks.push(value)
    }
  } finally { reader.releaseLock() }
  const bytes = new Uint8Array(size); let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown } catch { throw new ReportError("Permintaan tidak valid.") }
}
