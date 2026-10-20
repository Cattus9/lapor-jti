import type { ManagementDashboard } from "../management/types"
export type TefaServiceSummary = { id: string; name: string; available: boolean; activeReports: number }
export type TefaDashboard = ManagementDashboard & { services: TefaServiceSummary[] }
