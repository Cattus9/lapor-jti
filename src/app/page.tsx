import { redirect } from "next/navigation"
// [AUTH-SESSION] Pengalihan awal mengikuti session dan role database yang divalidasi server.
// Saat provider diganti ke Google Workspace, pertahankan alur ini melalui getCurrentUser().
import { getCurrentUser } from "@/lib/auth/server-session"

export default async function RootPage() {
  const user = await getCurrentUser()
  redirect(user ? `/${user.role}/dashboard` : "/login")
}
