import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { PelaporNotificationList } from "@/features/notifications/components/pelapor-notification-list"
import { requireRole } from "@/lib/auth/require-role"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { getReportService } from "@/features/reports/server"

export default async function PelaporPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")

  const query = await searchParams
  const data = await getReportService().notifications(user, query.cursor)
  return <DashboardLayout role="pelapor"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting tentang perkembangan laporan ${user.name}.`} /><PelaporNotificationList key={query.cursor ?? "latest"} items={data.items} unread={data.unread} /><div className="flex items-center justify-between gap-3">{query.cursor ? <Button variant="outline" nativeButton={false} render={<Link href="/pelapor/notifikasi" />}>Kembali ke terbaru</Button> : <span />}{data.nextCursor ? <Button variant="outline" nativeButton={false} render={<Link href={`/pelapor/notifikasi?cursor=${encodeURIComponent(data.nextCursor)}`} />}>Notifikasi berikutnya</Button> : null}</div></ContentShell></DashboardLayout>
}
