import { getCurrentUser } from "@/lib/auth/server-session"
import { getAuthEnvironment } from "@/lib/auth/environment"
import { ReportError } from "@/features/reports/domain/report"
import { apiResult } from "@/features/reports/infrastructure/http"
import { markReportOpened } from "@/features/reports/infrastructure/report-opening"

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return apiResult(async () => {
    const actor = await getCurrentUser()
    if (!actor) throw new ReportError("Silakan login kembali.", 401)
    if (request.headers.get("origin") !== new URL(getAuthEnvironment().baseURL).origin) throw new ReportError("Origin permintaan tidak diizinkan.", 403)
    return markReportOpened(actor, (await params).id)
  })
}
