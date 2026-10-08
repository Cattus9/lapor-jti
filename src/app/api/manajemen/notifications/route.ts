// [AUTH-ROLE] Read state belongs to the session account, never a supplied user/role ID.
import { getManagementService } from "@/features/management/server"
import { managementRequest, readManagementJson } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"

export async function GET(request: Request) {
  return apiResult(async () => getManagementService().notifications(await managementRequest(request), new URL(request.url).searchParams.get("cursor") ?? undefined))
}
export async function PATCH(request: Request) {
  return apiResult(async () => {
    const actor = await managementRequest(request, true), raw = await readManagementJson(request)
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Pilih notifikasi yang akan dibaca.")
    const value = raw as Record<string, unknown>
    if (value.all !== true && typeof value.id !== "string") throw new ReportError("Pilih notifikasi yang akan dibaca.")
    await getManagementService().markRead(actor, value.all === true ? undefined : value.id as string)
    return { ok: true }
  })
}
