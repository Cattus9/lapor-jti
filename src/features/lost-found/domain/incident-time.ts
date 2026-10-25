import { ReportError } from "../../reports/domain/report"
import { getTodayInWib } from "../../reports/domain/report-date"

export function validateSatpamIncident(date?: string, time?: string) {
  if (Boolean(date) !== Boolean(time)) throw new ReportError("Isi tanggal dan waktu bersamaan atau gunakan waktu otomatis.")
  if (!date) return
  const parsed = new Date(`${date}T00:00:00Z`)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) throw new ReportError("Tanggal kejadian tidak valid.")
  if (date > getTodayInWib()) throw new ReportError("Tanggal kejadian tidak boleh melebihi hari ini (WIB).")
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time ?? "")) throw new ReportError("Waktu kejadian tidak valid.")
}
