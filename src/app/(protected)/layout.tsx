import { AuthUserProvider } from "@/components/auth-user-provider"
// [AUTH-SESSION] Batas akses bersama: pengguna harus memiliki session valid sebelum konten protected dirender.
// Jika library/provider auth diganti, sesuaikan adapter server; jangan hilangkan pemeriksaan session.
import { requireUser } from "@/lib/auth/require-role"

export default async function ProtectedLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser()
  return <AuthUserProvider user={user}>{children}</AuthUserProvider>
}
