import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { ProfileDetails } from "@/features/profile/components/profile-details"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function TeknisiProfilePage() {
  const user = await requireDummyRole("teknisi")

  return <DashboardLayout role="teknisi"><ContentShell><PageHeader title="Profil" description="Data diri dan akses akun yang tersinkron dari SSO POLIJE." /><ProfileDetails user={user} /></ContentShell></DashboardLayout>
}
