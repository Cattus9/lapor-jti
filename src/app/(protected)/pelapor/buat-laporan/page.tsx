import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { ReportForm } from "@/features/reports/components/report-form"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function CreateReportPage() {
  await requireDummyRole("pelapor")
  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Buat Laporan" description="Sampaikan kendala atau temuan Anda agar dapat segera ditindaklanjuti oleh pengelola yang tepat." />
        <ReportForm />
      </ContentShell>
    </DashboardLayout>
  )
}
