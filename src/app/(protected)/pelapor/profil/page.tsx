import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ProfileDetails } from "@/features/profile/components/profile-details"
import { requireRole } from "@/lib/auth/require-role"

export default async function PelaporPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "pelapor" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("pelapor")

  return <DashboardLayout role="pelapor"><ContentShell><PageHeader title="Profil" description="Data diri dan akses akun yang terdaftar di AspirasiJTI." /><ProfileDetails user={user} /></ContentShell></DashboardLayout>
}
