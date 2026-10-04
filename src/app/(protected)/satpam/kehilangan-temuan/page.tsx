import { SatpamLostFoundWorkspace } from "@/features/lost-found/components/satpam-lost-found-workspace"
import { requireRole } from "@/lib/auth/require-role"
import { getSatpamService } from "@/features/lost-found/server"

export default async function SatpamLostFoundPage({ searchParams }: { searchParams: Promise<{ ticket?: string }> }) {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("satpam")

  const data = await getSatpamService().workspace(user)
  return <SatpamLostFoundWorkspace user={user} data={data} ticket={(await searchParams).ticket} />
}
