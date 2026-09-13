import type { CurrentUser } from "@/lib/auth/dummy-session"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import type { AppRole } from "@/lib/auth/roles"

export function RoleDashboardPage({
  role,
  user,
  title,
  description,
}: {
  role: AppRole
  user: CurrentUser
  title: string
  description: string
}) {
  return (
    <DashboardLayout role={role}>
      <ContentShell>
        <PageHeader title={title} description={description} />
        <p className="text-sm text-muted-foreground">Signed in as {user.name} · {role}</p>
      </ContentShell>
    </DashboardLayout>
  )
}
