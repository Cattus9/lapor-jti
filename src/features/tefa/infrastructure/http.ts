import "server-only"
import { getCurrentUser } from "@/lib/auth/server-session"
import { getAuthEnvironment } from "@/lib/auth/environment"
import { ReportError } from "../../reports/domain/report"
import { requireTefa } from "../domain/tefa"
export async function tefaRequest(request: Request, mutate = false) {
  const user = await getCurrentUser()
  if (!user) throw new ReportError("Silakan login kembali.", 401)
  requireTefa(user)
  if (mutate && request.headers.get("origin") !== new URL(getAuthEnvironment().baseURL).origin) throw new ReportError("Origin permintaan tidak diizinkan.", 403)
  return user
}
