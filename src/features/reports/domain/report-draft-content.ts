import type { ReportPayload } from "./report"
import { getIncidentTimeMode } from "./report"
import { getReportServicePolicy } from "./service-policy"

export function hasReportDraftContent(payload: ReportPayload, attachments = 0) {
  if (attachments > 0) return true
  const values = [payload.title, payload.description]
  if (payload.category !== "layanan" || getReportServicePolicy(payload.service).locationMode !== "hidden") values.push(payload.location)
  if (getIncidentTimeMode(payload) === "custom") values.push(payload.incidentDate, payload.incidentTime)
  if (payload.category === "kehilangan-temuan") values.push(payload.reportType, payload.itemName, payload.itemDetails)
  if (payload.category === "fasilitas") values.push(payload.facilityAreaId ?? "", ...payload.facilities, payload.otherLocation, payload.otherFacility)
  if (payload.category === "layanan") {
    values.push(payload.service)
    if (getReportServicePolicy(payload.service).requiresProgram) values.push(payload.program)
  }
  if (payload.category === "lainnya") values.push(payload.otherCategory)
  return values.some((value) => value.trim().length > 0)
}
