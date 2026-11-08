import type { ReportCategory, ReportPayload } from "./report"
import { getReportServicePolicy } from "./service-policy"

export type ReportFormCategory = ReportCategory | "tefa"
export const reportFormCategoryLabels: Record<ReportFormCategory, string> = {
  "kehilangan-temuan": "Kehilangan & Temuan", fasilitas: "Kerusakan Fasilitas",
  layanan: "Layanan Operasional", tefa: "Layanan JTI (TEFA)", lainnya: "Laporan Lainnya",
}

export function getReportFormCategory(payload: Pick<ReportPayload, "category" | "service" | "serviceAudience">): ReportFormCategory {
  if (payload.category !== "layanan") return payload.category
  // Legacy named JTI drafts have no audience. Server reads additionally resolve
  // custom legacy services against catalog metadata before presenting the draft.
  const audience = payload.serviceAudience ?? (getReportServicePolicy(payload.service).group === "jti" ? "tefa" : "operasional")
  return audience === "tefa" ? "tefa" : "layanan"
}

export function payloadForFormCategory(payload: ReportPayload, category: ReportFormCategory): ReportPayload {
  const base = { ...payload }
  delete base.serviceAudience
  if (category === "tefa" || category === "layanan") return { ...base, category: "layanan", serviceAudience: category === "tefa" ? "tefa" : "operasional" }
  return { ...base, category }
}

export function servicesForFormCategory<T extends { handlerRole?: "manajemen" | "tefa" }>(services: readonly T[], category: ReportFormCategory | "") {
  if (category !== "layanan" && category !== "tefa") return []
  return services.filter(service => service.handlerRole === (category === "tefa" ? "tefa" : "manajemen"))
}
