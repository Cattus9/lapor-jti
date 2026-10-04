import { reportPeriods } from "../../reports/domain/report-list-filters"

export const satpamReportPeriods = {
  semua: reportPeriods.semua,
  "hari-ini": reportPeriods["hari-ini"],
  "7-hari": reportPeriods["7-hari"],
  "30-hari": reportPeriods["30-hari"],
} as const

// Both order and period refer to submission time, not incident or status-update time.
export const satpamReportSorts = { terbaru: "Terbaru", terlama: "Terlama" } as const
