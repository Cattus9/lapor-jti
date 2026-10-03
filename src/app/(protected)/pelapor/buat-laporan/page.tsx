import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { ReportForm } from "@/features/reports/components/report-form"
import { requireRole } from "@/lib/auth/require-role"
import { notFound } from "next/navigation"
import { getReportService } from "@/features/reports/server"
import { ReportError } from "@/features/reports/domain/report"

export default async function CreateReportPage({ searchParams }: { searchParams: Promise<{ draft?: string }> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")
  const query = await searchParams
  let draft
  if (query.draft) {
    try { draft = await getReportService().draft(user, query.draft) }
    catch (error) { if (error instanceof ReportError && error.status === 404) notFound(); throw error }
  }
  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Buat Laporan" description="Sampaikan kendala atau temuan Anda agar dapat segera ditindaklanjuti oleh pengelola yang tepat." />
        <ReportForm key={draft?.id ?? "new"} initialDraft={draft} />
      </ContentShell>
    </DashboardLayout>
  )
}
