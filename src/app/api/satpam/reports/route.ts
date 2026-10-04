import { getSatpamService } from "@/features/lost-found/server"
import { readSatpamJson, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getSatpamService().list(await satpamRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}
export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    return getSatpamService().execute(actor, await readSatpamJson(request))
  })
}
