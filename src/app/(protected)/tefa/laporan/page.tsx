import { TefaWorkspace } from "@/features/tefa/components/tefa-workspace"
import { requireRole } from "@/lib/auth/require-role"

export default async function TefaReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("tefa")
  const { status } = await searchParams
  const initialStatus = status === "Baru" || status === "Diproses" ? status : "all"
  return <TefaWorkspace user={user} view="reports" initialStatus={initialStatus} />
}
