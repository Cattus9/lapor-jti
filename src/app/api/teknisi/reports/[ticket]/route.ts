// [AUTH-ROLE] Google Workspace may replace the provider, not the database role/category access rules.
import { getTechnicianService } from "@/features/facilities/server"
import { technicianRequest } from "@/features/facilities/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request, { params }: { params: Promise<{ ticket: string }> }) {
  return apiResult(async () => getTechnicianService().detail(await technicianRequest(request), (await params).ticket))
}
