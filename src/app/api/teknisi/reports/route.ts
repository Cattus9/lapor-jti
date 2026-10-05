// [AUTH-ROLE] Every API request checks the live application session; UI visibility is not authorization.
import { getTechnicianService } from "@/features/facilities/server"
import { readTechnicianJson, technicianRequest } from "@/features/facilities/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getTechnicianService().list(await technicianRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}
export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await technicianRequest(request, true)
    return getTechnicianService().execute(actor, await readTechnicianJson(request))
  })
}
