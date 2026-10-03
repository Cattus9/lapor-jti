import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ProfileDetails } from "@/features/profile/components/profile-details"
import { requireRole } from "@/lib/auth/require-role"

export default async function TeknisiProfilePage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "teknisi" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Profil" description="Data diri dan akses akun yang terdaftar di AspirasiJTI." /><ProfileDetails user={user} /></ContentShell></DashboardLayout>
}
