import { getSatpamService } from "@/features/lost-found/server"
import { satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, { params }: { params: Promise<{ ticket: string }> }) {
  return apiResult(async () => getSatpamService().detail(await satpamRequest(request), (await params).ticket))
}
