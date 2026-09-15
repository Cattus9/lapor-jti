import { PelaporReportList } from "@/features/reports/components/pelapor-report-list"
import { requireDummyRole } from "@/lib/auth/require-role"

export default function PelaporReportsPage() {
  const user = requireDummyRole("pelapor")
  return <PelaporReportList user={user} />
}
