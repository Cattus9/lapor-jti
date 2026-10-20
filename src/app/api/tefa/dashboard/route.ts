import { getTefaService } from "@/features/tefa/server"
import { tefaRequest } from "@/features/tefa/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
export async function GET(request: Request) { return apiResult(async () => getTefaService().dashboard(await tefaRequest(request))) }
