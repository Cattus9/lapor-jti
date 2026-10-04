import { getSatpamService } from "@/features/lost-found/server"
import { satpamRequest, readSatpamJson } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"

export async function GET(request: Request) {
  return apiResult(async () => getSatpamService().notifications(await satpamRequest(request), new URL(request.url).searchParams.get("cursor") ?? undefined))
}
export async function PATCH(request: Request) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    const raw = await readSatpamJson(request)
    if (!raw || typeof raw !== "object") throw new ReportError("Pilih notifikasi yang akan dibaca.")
    const value = raw as Record<string, unknown>
    if (value.all !== true && typeof value.id !== "string") throw new ReportError("Pilih notifikasi yang akan dibaca.")
    await getSatpamService().markRead(actor, value.all === true ? undefined : value.id as string)
    return { ok: true }
  })
}
