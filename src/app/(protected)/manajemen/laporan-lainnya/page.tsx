import { redirect } from "next/navigation"
import { requireRole } from "@/lib/auth/require-role"

export default async function ManagementOtherReportsPage() {
  // [AUTH-ROLE] Halaman ini hanya untuk role "manajemen" dari database aplikasi.
  // Pertahankan guard ini saat beralih ke Google Workspace; adaptasi session ada di server-session.ts.
  await requireRole("manajemen")

  redirect("/manajemen/laporan?category=lainnya")
}
