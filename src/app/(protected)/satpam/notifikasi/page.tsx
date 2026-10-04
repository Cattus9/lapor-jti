import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { SatpamNotificationList } from "@/features/notifications/components/satpam-notification-list"
import { requireRole } from "@/lib/auth/require-role"
import { getSatpamService } from "@/features/lost-found/server"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default async function SatpamNotificationsPage({ searchParams }: { searchParams: Promise<{ cursor?: string }> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("satpam")

  const query = await searchParams
  const data = await getSatpamService().notifications(user, query.cursor)
  return <DashboardLayout role="satpam"><ContentShell><PageHeader title="Notifikasi" description={`Pembaruan penting untuk penanganan laporan, ${user.name}.`} /><SatpamNotificationList key={query.cursor ?? "latest"} items={data.items} unread={data.unread} /><div className="flex items-center justify-between gap-3">{query.cursor ? <Button variant="outline" nativeButton={false} render={<Link href="/satpam/notifikasi" />}>Kembali ke terbaru</Button> : <span />}{data.nextCursor ? <Button variant="outline" nativeButton={false} render={<Link href={`/satpam/notifikasi?cursor=${encodeURIComponent(data.nextCursor)}`} />}>Notifikasi berikutnya</Button> : null}</div></ContentShell></DashboardLayout>
}
