import { getSatpamService } from "@/features/lost-found/server"
import { satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => getSatpamService().pending(await satpamRequest(request), new URL(request.url).searchParams.get("cursor") ?? undefined))
}
