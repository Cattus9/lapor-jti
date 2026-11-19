import { getCurrentUser } from "@/lib/auth/server-session"
import { getAuthEnvironment } from "@/lib/auth/environment"
import { ReportError } from "@/features/reports/domain/report"
import { apiResult, limitedBody } from "@/features/reports/infrastructure/http"
import { recordReportProgress } from "@/features/reports/infrastructure/report-follow-up"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiResult(async () => {
    const actor = await getCurrentUser()
    if (!actor) throw new ReportError("Silakan login kembali.", 401)
    if (request.headers.get("origin") !== new URL(getAuthEnvironment().baseURL).origin) throw new ReportError("Origin permintaan tidak diizinkan.", 403)
    const body = await limitedBody(request, 1024)
    let input: unknown
    try { input = JSON.parse(new TextDecoder().decode(body)) }
    catch { throw new ReportError("Isian perkembangan tidak valid.") }
    return recordReportProgress(actor, (await params).id, input && typeof input === "object" && "choice" in input ? input.choice : undefined)
  })
}
