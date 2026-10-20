import { getTefaService } from "@/features/tefa/server"
import { tefaRequest } from "@/features/tefa/infrastructure/http"
import { readManagementJson } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
export async function GET(request: Request) { return apiResult(async () => getTefaService().list(await tefaRequest(request), Object.fromEntries(new URL(request.url).searchParams))) }
export async function POST(request: Request) { return apiResult(async () => { const actor = await tefaRequest(request, true); return getTefaService().execute(actor, await readManagementJson(request)) }) }
