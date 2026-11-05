import { getSatpamService } from "@/features/lost-found/server"
import { readSatpamJson, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => getSatpamService().getInventoryItem(await satpamRequest(request), (await context.params).id))
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    return getSatpamService().correctInventory(actor, (await context.params).id, await readSatpamJson(request))
  })
}
