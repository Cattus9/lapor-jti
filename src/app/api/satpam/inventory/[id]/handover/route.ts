import { getSatpamService } from "@/features/lost-found/server"
import { readSatpamJson, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    const { id } = await context.params
    const body = (await readSatpamJson(request)) as Record<string, unknown>
    if (!body || typeof body !== "object") {
      throw new ReportError("Isian permintaan tidak valid.", 400)
    }

    return getSatpamService().handoverInventory(actor, {
      id,
      recipient: String(body.recipient ?? ""),
      note: typeof body.note === "string" ? body.note : undefined,
    })
  })
}
