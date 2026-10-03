import "server-only"
// [AUTH-ROLE] Guard otorisasi server yang harus dipertahankan untuk login lokal maupun Google Workspace.
// requireUser memeriksa session; requireRole membatasi akses sesuai role database aplikasi.
// Jika engine auth diganti, adaptasikan getCurrentUser(), jangan menghapus guard pada halaman.
import { redirect } from "next/navigation"
import { getCurrentUser } from "./server-session"
import type { AppRole } from "./roles"

export async function requireUser() {
  const user = await getCurrentUser()
  if (!user) redirect("/login")
  return user
}

export async function requireRole(role: AppRole) {
  const user = await requireUser()
  if (user.role !== role) redirect(`/${user.role}/dashboard`)
  return user
}
