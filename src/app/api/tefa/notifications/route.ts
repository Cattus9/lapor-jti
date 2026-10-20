import { getTefaService } from "@/features/tefa/server"
import { tefaRequest } from "@/features/tefa/infrastructure/http"
import { readManagementJson } from "@/features/management/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError } from "@/features/reports/domain/report"
export async function GET(request: Request) { return apiResult(async () => getTefaService().notifications(await tefaRequest(request), new URL(request.url).searchParams.get("cursor") ?? undefined)) }
export async function PATCH(request: Request) { return apiResult(async () => { const actor = await tefaRequest(request, true); const raw: unknown = await readManagementJson(request); if (!raw || typeof raw !== "object" || Array.isArray(raw) || (!("all" in raw && raw.all === true) && !("id" in raw && typeof raw.id === "string"))) throw new ReportError("Pilih notifikasi yang akan dibaca."); await getTefaService().markRead(actor, "all" in raw && raw.all === true ? undefined : "id" in raw ? raw.id as string : undefined); return { ok: true } }) }
