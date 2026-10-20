import { ReportError, type ReportActor } from "../../reports/domain/report"
import { parseManagementFilter } from "../../management/domain/management"
import type { ManagementFilter } from "../../management/types"

export function requireTefa(actor: ReportActor) {
  if (actor.role !== "tefa") throw new ReportError("Akses hanya untuk TEFA.", 403)
}

export function parseTefaFilter(raw: Record<string, unknown> = {}): ManagementFilter {
  if (raw.category !== undefined && raw.category !== "layanan") throw new ReportError("TEFA hanya menangani laporan layanan.", 403)
  const history = raw.view === "history"
  if (raw.view !== undefined && raw.view !== "history" && raw.view !== "reports") throw new ReportError("Tampilan laporan tidak valid.")
  if (raw.status !== undefined && raw.status !== "semua" && !(history ? ["selesai", "ditolak"] : ["baru", "diproses"]).includes(String(raw.status))) throw new ReportError("Status tidak sesuai tampilan laporan.")
  const serviceId = raw.serviceId
  if (serviceId !== undefined && (typeof serviceId !== "string" || !serviceId.trim() || serviceId.length > 150 || /[\u0000-\u001f\u007f]/.test(serviceId))) throw new ReportError("Layanan filter tidak valid.")
  return { ...parseManagementFilter({ ...raw, category: "layanan" }, true), serviceId: serviceId as string | undefined, lifecycle: history ? "closed" : "active" }
}
