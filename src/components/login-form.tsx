"use client"
// [AUTH-LOCAL] Form email/password sementara untuk akun uji dan akun yang disiapkan pengelola.
// Saat Google Workspace diaktifkan, sesuaikan aksi signIn dan field/copy login di sini.
// [AUTH-ROLE] Dashboard dipilih oleh server dari role database, bukan nilai role yang dikirim form.

import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import { ChevronRight, Eye, EyeOff, ImageOff, LogIn, MapPin, PackageSearch, ShieldCheck } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { SectionCard } from "@/components/ui/section-card"
import { authClient } from "@/lib/auth/client"

const sampleFoundItems = [
  { name: "Botol minum", location: "Ruang kelas", description: "Botol minum berwarna biru ditemukan di atas meja." },
  { name: "Payung", location: "Area gedung", description: "Payung lipat berwarna hitam ditemukan di dekat pintu masuk." },
]

function LoginFoundItems() {
  return (
    <SectionCard
      title="Barang temuan terbaru"
      icon={PackageSearch}
      meta={<span className="text-login-panel-muted">Data contoh</span>}
      className={cn(
        "max-w-3xl border-login-panel-foreground/25 bg-login-panel/65 shadow-none backdrop-blur-sm",
        "[&_[data-slot=section-header]_h2]:text-login-panel-foreground [&_[data-slot=section-header]_svg]:text-login-panel-foreground",
      )}
      contentClassName="space-y-2 border-0 bg-transparent p-2 pt-0 text-login-panel-foreground shadow-none md:p-2 md:pt-0"
    >
      {sampleFoundItems.map(item => (
        <Dialog key={item.name}>
          <DialogTrigger render={
            <Button
              type="button"
              variant="ghost"
              className={cn(
                "h-auto w-full justify-start gap-3 whitespace-normal rounded-xl p-3 text-left",
                "border-login-panel-foreground/20 bg-login-panel-foreground/5 hover:bg-login-panel-foreground/10 hover:text-login-panel-foreground dark:hover:bg-login-panel-foreground/10",
                "focus-visible:border-login-panel-foreground focus-visible:ring-login-panel-foreground/60",
                "aria-expanded:bg-login-panel-foreground/10 aria-expanded:text-login-panel-foreground",
              )}
            />
          }>
            <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-login-panel-foreground/10 text-login-panel-muted">
              <ImageOff className="size-4" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1 space-y-1">
              <span className="block"><span className="sr-only">Lihat detail </span>{item.name}</span>
              <span className="flex items-center gap-1 text-xs text-login-panel-muted"><MapPin className="size-3.5" aria-hidden="true" />{item.location}</span>
            </span>
            <ChevronRight className="ml-auto size-4 text-login-panel-muted" aria-hidden="true" />
          </DialogTrigger>
          <DialogContent className="max-w-md gap-4 p-5 sm:p-6">
            <DialogHeader className="pr-8">
              <DialogTitle>{item.name}</DialogTitle>
              <DialogDescription>Contoh detail barang temuan</DialogDescription>
            </DialogHeader>
            <div className="flex min-h-28 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-empty-surface p-4 text-muted-foreground">
              <ImageOff className="size-5" aria-hidden="true" />
              <span className="text-xs">Foto tidak tersedia</span>
            </div>
            <div className="space-y-2">
              <p className="flex items-center gap-2 text-sm font-medium"><MapPin className="size-4 text-muted-foreground" aria-hidden="true" />{item.location}</p>
              <p className="text-sm leading-relaxed text-muted-foreground">{item.description}</p>
            </div>
            <div className="flex items-start gap-2 rounded-lg border border-border bg-field-surface p-3 text-xs leading-relaxed text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <p>Untuk mengklaim barang temuan, hubungi Pos Satpam dan jelaskan ciri khusus barang Anda.</p>
            </div>
          </DialogContent>
        </Dialog>
      ))}
    </SectionCard>
  )
}

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
                  <Input id="password" name="password" type={showPassword ? "text" : "password"} className="h-12 pl-3.5 pr-14" value={password} onChange={(event) => { setPassword(event.target.value); setError("") }} placeholder="Password akun Anda" autoComplete="current-password" required maxLength={128} disabled={isPending} aria-invalid={Boolean(error)} aria-describedby={error ? "password-hint login-error" : "password-hint"} />
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
                <FieldDescription id="password-hint">Password akun terdiri dari 12–128 karakter.</FieldDescription>
              </Field>
              <div>
                {error ? <p id="login-error" className="mb-3 text-sm text-destructive" role="alert">{error}</p> : null}
                <Button type="submit" size="lg" className="h-12 w-full" disabled={isPending}><LogIn />{isPending ? "Memproses..." : "Masuk"}</Button>
              </div>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">Dengan melanjutkan, Anda menyetujui penggunaan AspirasiJTI untuk kebutuhan pelaporan internal Jurusan Teknologi Informasi.</p>
          </form>
          <aside className="login-visual-panel flex min-w-0 items-center rounded-xl border border-primary/30 p-6 text-login-panel-foreground sm:p-8 md:p-10 lg:p-16" aria-label="Tentang AspirasiJTI dan barang temuan">
            <div className="w-full text-left">
              <Image src="/login/aspirasijti.png" alt="AspirasiJTI" width={866} height={288} sizes="(min-width: 1024px) 480px, 60vw" className="h-auto w-full max-w-[480px]" />
              <div className="-mt-5 ml-(--login-brand-inset) space-y-6 lg:-mt-7">
                <p className="max-w-4xl text-base leading-relaxed lg:text-lg">Selamat datang di AspirasiJTI, ruang untuk menyampaikan aspirasi dan laporan di lingkungan Jurusan Teknologi Informasi. Laporkan kebutuhan fasilitas, kendala layanan, atau kehilangan dan temuan melalui satu portal. Masuk untuk memantau progres penanganan dan mengetahui tindak lanjut setiap laporan hingga selesai.</p>
                <LoginFoundItems />
              </div>
            </div>
          </aside>
        </CardContent>
      </Card>
    </div>
  )
}
