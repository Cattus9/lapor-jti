// [AUTH-ROLE] Read state belongs to the recipient account, never a client-supplied role or user ID.
import { getTechnicianService } from "@/features/facilities/server"
import { readTechnicianJson, technicianRequest } from "@/features/facilities/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"

export async function GET(request: Request) {
  return apiResult(async () => getTechnicianService().notifications(await technicianRequest(request), new URL(request.url).searchParams.get("cursor") ?? undefined))
}
export async function PATCH(request: Request) {
  return apiResult(async () => {
    const actor = await technicianRequest(request, true), raw = await readTechnicianJson(request)
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Pilih notifikasi yang akan dibaca.")
    const value = raw as Record<string, unknown>
    if (value.all !== true && typeof value.id !== "string") throw new ReportError("Pilih notifikasi yang akan dibaca.")
    await getTechnicianService().markRead(actor, value.all === true ? undefined : value.id as string)
    return { ok: true }
  })
}
