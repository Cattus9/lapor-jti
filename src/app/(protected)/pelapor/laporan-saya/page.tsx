import { PelaporReportList } from "@/features/reports/components/pelapor-report-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function PelaporReportsPage() {
  const user = await requireDummyRole("pelapor")
  return <PelaporReportList user={user} />
}
