import type { ManagementReport } from "../types"

// Quoting alone does not prevent spreadsheet formula injection from user-controlled fields.
export function managementCsvCell(value: string) {
  const safe = /^[\s\uFEFF]*[=+@-]/u.test(value) || /^[\t\r\n]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}
export function managementCsv(reports: ManagementReport[]) {
  const rows = [
    ["Nomor tiket", "Judul laporan", "Kategori", "Layanan atau konteks", "Pelapor", "Lokasi atau kanal", "Status", "Waktu laporan (WIB)"],
    ...reports.map((r) => [r.ticket, r.title, r.category, r.service, r.reporter, r.location, r.status, r.submittedAt]),
  ]
  return `\uFEFF${rows.map((row) => row.map(managementCsvCell).join(",")).join("\r\n")}`
}
