import { getTefaService } from "@/features/tefa/server"
import { tefaRequest } from "@/features/tefa/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
export async function GET(request: Request, { params }: { params: Promise<{ ticket: string }> }) { return apiResult(async () => getTefaService().detail(await tefaRequest(request), (await params).ticket)) }
