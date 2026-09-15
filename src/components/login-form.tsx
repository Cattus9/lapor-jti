"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { ArrowRight, Building2, ImageOff, LogIn, ShieldCheck } from "lucide-react"
import { cn } from "cn"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getDummyUserByEmail } from "@/lib/auth/dummy-session"

export function LoginForm({ className, ...props }: React.ComponentProps<"div">) {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const user = getDummyUserByEmail(email)
    if (!user) {
      setError("Gunakan email dummy yang terdaftar untuk melanjutkan.")
      return
    }
    document.cookie = `laporjti_dummy_email=${encodeURIComponent(user.email)}; path=/; max-age=86400; samesite=lax`
    router.push(`/${user.role}/dashboard`)
    router.refresh()
  }

  return (
    <div className={cn("flex", className)} {...props}>
      <Card className="min-h-[calc(100svh-1.5rem)] w-full overflow-hidden rounded-2xl border border-border bg-card p-0 shadow-xl ring-1 ring-border/80">
        <CardContent className="grid min-h-[inherit] p-0 md:grid-cols-[2fr_3fr]">
          <form className="flex min-h-[calc(100svh-1.5rem)] flex-col justify-between gap-8 p-6 sm:p-8 md:p-10" onSubmit={handleSubmit}>
            <div className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
              <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-xs"><Building2 className="size-4" aria-hidden="true" /></span>
              <span>LaporJTI</span>
            </div>
            <div className="m-auto w-full max-w-md space-y-8 py-10">
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-xs font-medium text-primary"><LogIn className="size-4" aria-hidden="true" />Portal pelaporan internal JTI</div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Masuk ke akun Anda</h1>
                <p className="max-w-md text-sm leading-relaxed text-muted-foreground">Gunakan akun SSO POLIJE untuk membuat laporan, memantau tiket, dan menerima pembaruan dari pengelola.</p>
              </div>
              <Field>
                <FieldLabel htmlFor="email">Email akun</FieldLabel>
                <Input id="email" type="email" value={email} onChange={(event) => { setEmail(event.target.value); setError("") }} placeholder="contoh@polije.ac.id" autoComplete="email" required aria-invalid={Boolean(error)} />
                <FieldDescription>Akun dummy: pelapor@gmail.com atau satpam@gmail.com</FieldDescription>
                {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
              </Field>
              <div className="space-y-4">
                <Button type="submit" size="lg" className="w-full sm:w-auto"><LogIn />Login dengan SSO POLIJE<ArrowRight className="ml-1" /></Button>
                <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>Role dan data identitas Anda ditentukan otomatis dari sistem SSO POLIJE.</span></div>
              </div>
            </div>
            <FieldDescription className="text-xs leading-relaxed">Dengan melanjutkan, Anda menyetujui penggunaan LaporJTI untuk kebutuhan pelaporan internal Jurusan Teknologi Informasi.</FieldDescription>
          </form>
          <aside className="flex min-h-52 flex-col items-center justify-center border-t border-border bg-muted/60 p-8 text-center md:min-h-0 md:border-t-0 md:border-l" aria-label="Area ilustrasi LaporJTI">
            <div className="flex size-16 items-center justify-center rounded-2xl border border-border bg-card text-muted-foreground shadow-2xs"><ImageOff className="size-7" strokeWidth={1.5} aria-hidden="true" /></div>
            <p className="mt-5 text-sm font-medium text-foreground">Area visual LaporJTI</p>
            <p className="mt-1.5 max-w-52 text-xs leading-relaxed text-muted-foreground">Ilustrasi pendukung akan ditambahkan pada tahap berikutnya.</p>
          </aside>
        </CardContent>
      </Card>
    </div>
  )
}
