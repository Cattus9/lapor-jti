import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { UserManagement } from "@/features/operations/components/user-management"
import { requireRole } from "@/lib/auth/require-role"

export default async function UserManagementPage() {
  const user = await requireRole("manajemen")
  return <DashboardLayout role="manajemen" user={user}><ContentShell><PageHeader title="Kelola Pengguna" description="Kelola akun Pelapor, Satpam, Teknisi, dan Manajemen Jurusan." /><UserManagement actorId={user.id} /></ContentShell></DashboardLayout>
}
