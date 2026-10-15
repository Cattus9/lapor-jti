import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ProfileDetails } from "@/features/profile/components/profile-details"
import { requireRole } from "@/lib/auth/require-role"

export default async function TefaProfilePage() {
  const user = await requireRole("tefa")
  return <DashboardLayout role="tefa" user={user}><ContentShell><PageHeader title="Profil" description="Identitas dan akses akun TEFA yang terdaftar di AspirasiJTI." /><ProfileDetails user={user} /></ContentShell></DashboardLayout>
}
