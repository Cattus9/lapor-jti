import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { FoundNoticeList } from "@/features/found-notices/components/found-notice-list"
import { getFoundNoticeService } from "@/features/found-notices/server"
import { requireRole } from "@/lib/auth/require-role"
import { foundNoticeStates, type FoundNoticeState } from "@/features/found-notices/domain/found-notice"

export default async function PelaporNewsPage({ searchParams }: { searchParams: Promise<{ search?: string; state?: string }> }) {
  const user = await requireRole("pelapor")
  const params = await searchParams
  const search = typeof params.search === "string" ? params.search.trim().slice(0, 100) : ""
  const state = typeof params.state === "string" && Object.hasOwn(foundNoticeStates, params.state) ? params.state as FoundNoticeState : undefined
  const found = await getFoundNoticeService().list(user, { search, state })

  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader title="Berita" description="Lihat informasi barang yang ditemukan di lingkungan JTI." />
        <FoundNoticeList initialPage={found} filters={{ search, state }} />
      </ContentShell>
    </DashboardLayout>
  )
}
