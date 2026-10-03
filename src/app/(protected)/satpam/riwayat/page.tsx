import { SatpamHandoverHistory } from "@/features/lost-found/components/satpam-handover-history"
import { requireRole } from "@/lib/auth/require-role"

export default async function SatpamHistoryPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "satpam" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  const user = await requireRole("satpam")

  return <SatpamHandoverHistory user={user} />
}
