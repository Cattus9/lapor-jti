import { LoginForm } from "@/components/login-form"
// [AUTH-LOCAL] Halaman masuk saat ini memakai form email/password Better Auth.
// Saat Google Workspace tersedia, ubah metode login; pengalihan session aktif tetap diperlukan.
import { getCurrentUser } from "@/lib/auth/server-session"
import { redirect } from "next/navigation"

export default async function LoginPage() {
  const user = await getCurrentUser()
  if (user) redirect(`/${user.role}/dashboard`)
  return (
    <main className="min-h-dvh w-full bg-background">
      <LoginForm />
    </main>
  )
}
