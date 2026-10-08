"use client"
// [AUTH-LOCAL] Form email/password sementara untuk akun uji dan akun yang disiapkan pengelola.
// Saat Google Workspace diaktifkan, sesuaikan aksi signIn dan field/copy login di sini.
// [AUTH-ROLE] Dashboard dipilih oleh server dari role database, bukan nilai role yang dikirim form.

import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { Eye, EyeOff, LogIn } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { authClient } from "@/lib/auth/client"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isPending, setIsPending] = useState(false)
  const [error, setError] = useState("")

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isPending) return
    setError("")
    setIsPending(true)
    try {
      const result = await authClient.signIn.email({ email: email.trim().toLowerCase(), password })
      if (result.error) {
        setError(result.error.status === 429 ? "Terlalu banyak percobaan. Tunggu satu menit lalu coba lagi." : "Tidak dapat masuk. Periksa email dan password, atau hubungi pengelola akun.")
        return
      }
      // Refresh server-rendered identity; the root selects the current database role.
      router.replace("/")
      router.refresh()
    } catch {
      setError("Tidak dapat menghubungi server. Silakan coba lagi.")
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className={cn("flex min-h-dvh w-full", className)} {...props}>
      <Card className="min-h-dvh w-full gap-0 rounded-none border-0 bg-sidebar p-2.5 shadow-none ring-0">
        <CardContent className="grid min-h-[calc(100dvh-1.25rem)] flex-1 gap-2.5 p-0 md:grid-cols-[minmax(0,40fr)_minmax(0,60fr)]">
          <form className="login-form-panel flex min-w-0 flex-col justify-between gap-8 rounded-xl border border-border/70 bg-card p-6 sm:p-8 md:p-8 lg:p-10" onSubmit={handleSubmit} aria-busy={isPending}>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <span className="relative size-9 shrink-0 overflow-hidden rounded-xl shadow-xs"><Image src="/logo/logo-sb-login.png" alt="" fill sizes="36px" className="object-cover" /></span>
              <span>AspirasiJTI</span>
            </div>
            <div className="m-auto w-full max-w-sm space-y-8 py-10">
              <div className="space-y-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Masuk ke akun Anda</h1>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Gunakan email dan password akun yang telah disiapkan pengelola. Login SSO kampus belum tersedia.</p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email akun</FieldLabel>
                <Input id="email" name="email" type="email" className="h-12 px-3.5" value={email} onChange={(event) => { setEmail(event.target.value); setError("") }} placeholder="Email akun Anda" autoComplete="username" required disabled={isPending} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
                <FieldDescription>Gunakan email akun yang terdaftar di AspirasiJTI.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="password">Password</FieldLabel>
                <div className="relative">
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} className="h-12 pl-3.5 pr-14" value={password} onChange={(event) => { setPassword(event.target.value); setError("") }} autoComplete="current-password" required maxLength={128} disabled={isPending} aria-invalid={Boolean(error)} aria-describedby={error ? "login-error" : undefined} />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute inset-y-0 right-0.5 my-auto size-11 text-muted-foreground"
                    onClick={() => setShowPassword((visible) => !visible)}
                    disabled={isPending}
                    aria-controls="password"
                    aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                    title={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                  >
                    {showPassword ? <EyeOff className="size-4" aria-hidden="true" /> : <Eye className="size-4" aria-hidden="true" />}
                  </Button>
                </div>
              </Field>
              <div>
                {error ? <p id="login-error" className="mb-3 text-sm text-destructive" role="alert">{error}</p> : null}
                <Button type="submit" size="lg" className="h-12 w-full" disabled={isPending}><LogIn />{isPending ? "Memproses..." : "Masuk"}</Button>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Dengan melanjutkan, Anda menyetujui penggunaan AspirasiJTI untuk kebutuhan pelaporan internal Jurusan Teknologi Informasi.</p>
          </form>
          <aside className="login-visual-panel hidden min-w-0 items-center rounded-xl border border-primary/30 p-10 text-login-panel-foreground md:flex lg:p-16" aria-label="Tentang AspirasiJTI">
            <div className="w-full text-left">
              <Image src="/login/aspirasijti.png" alt="AspirasiJTI" width={866} height={288} sizes="(min-width: 1024px) 480px, 60vw" className="h-auto w-full max-w-[480px]" />
              {/* The logo PNG has transparent margins; align the copy to its visible artwork. */}
              <p className="-mt-5 pl-[min(12.2%,59px)] text-base leading-relaxed lg:-mt-7 lg:text-lg">Selamat datang di AspirasiJTI, ruang untuk menyampaikan aspirasi dan laporan di lingkungan Jurusan Teknologi Informasi. Laporkan kebutuhan fasilitas, kendala layanan, atau kehilangan dan temuan melalui satu portal. Masuk untuk memantau progres penanganan dan mengetahui tindak lanjut setiap laporan hingga selesai.</p>
            </div>
          </aside>
        </CardContent>
      </Card>
    </div>
  )
}
