import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { FoundNoticeList } from "@/features/found-notices/components/found-notice-list"
import { getFoundNoticeService } from "@/features/found-notices/server"
import { requireRole } from "@/lib/auth/require-role"

export default async function PelaporNewsPage() {
  const user = await requireRole("pelapor")
  const found = await getFoundNoticeService().list(user)

  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Berita" description="Lihat informasi barang yang ditemukan di lingkungan JTI." />
        <FoundNoticeList initialPage={found} />
      </ContentShell>
    </DashboardLayout>
  )
}
