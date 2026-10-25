import { getSatpamService } from "@/features/lost-found/server"
import { satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => getSatpamService().getInventoryItem(await satpamRequest(request), (await context.params).id))
}
