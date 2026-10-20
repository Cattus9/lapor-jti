import { TefaWorkspace } from "@/features/tefa/components/tefa-workspace"
import { requireRole } from "@/lib/auth/require-role"

export default async function TefaReportsPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await requireRole("tefa")
  const { status, ticket } = await searchParams
  const initialStatus = status === "baru" || status === "Baru" ? "baru" : status === "diproses" || status === "Diproses" ? "diproses" : "all"
  return <TefaWorkspace key={typeof ticket === "string" ? ticket : "queue"} user={user} view="reports" initialStatus={initialStatus} initialTicket={typeof ticket === "string" && /^LJ-\d{4}-\d{1,12}$/.test(ticket) ? ticket : undefined} />
}
