import { ExternalLink, IdCard, Mail, ShieldCheck, UserRound, UserRoundCheck } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import type { CurrentUser } from "@/lib/auth/dummy-session"

const roleLabel = { pelapor: "Pelapor", satpam: "Satpam", teknisi: "Teknisi", manajemen: "Manajemen Jurusan", admin: "Admin Sistem" } as const

function initials(name: string) {
  return name.split(" ").slice(0, 2).map((part) => part[0]).join("").toUpperCase()
}

function DetailItem({ label, value, icon: Icon }: { label: string; value: string; icon: typeof UserRound }) {
  return <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5"><span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="mt-1 truncate text-sm font-medium text-foreground">{value}</dd></div></div>
}

export function ProfileDetails({ user }: { user: CurrentUser }) {
  return <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-medium text-muted-foreground">
        <IdCard className="size-4 text-primary" aria-hidden="true" />
        <span>Informasi akun</span>
      </div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-4 border-b border-border/60 p-5 md:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
            <Avatar size="lg" className="size-16"><AvatarImage src={user.avatar} alt={user.name} /><AvatarFallback className="text-lg font-semibold">{initials(user.name)}</AvatarFallback></Avatar>
            <div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><CardTitle className="text-xl md:text-2xl">{user.name}</CardTitle><Badge variant="secondary">{roleLabel[user.role]}</Badge></div><p className="mt-1 text-sm text-muted-foreground">{user.email}</p><p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5 text-primary" aria-hidden="true" />Data identitas tersinkron dari SSO POLIJE</p></div>
          </div>
        </CardHeader>
        <CardContent className="p-5 md:p-6"><dl className="grid gap-3 sm:grid-cols-2"><DetailItem label="NIM / NIP / NIDN / NIDK" value={user.identifier} icon={IdCard} /><DetailItem label="Username" value={user.username} icon={UserRound} /><DetailItem label="Email POLIJE" value={user.email} icon={Mail} /><DetailItem label="Unit / Jurusan" value={user.unit} icon={ShieldCheck} /><DetailItem label="Program studi" value={user.studyProgram} icon={IdCard} /><DetailItem label="Status pengguna" value={user.status} icon={UserRoundCheck} /></dl></CardContent>
      </div>
    </Card>
    <div className="space-y-6"><Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4 md:p-6 md:pb-5"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs"><ExternalLink className="size-5 text-primary" aria-hidden="true" /></div><div><CardTitle className="text-base">Akses akun</CardTitle><p className="mt-1 text-sm text-muted-foreground">Pengaturan akun dilakukan melalui SSO POLIJE.</p></div></CardHeader><CardContent className="space-y-3 p-5 pt-0 md:p-6 md:pt-0"><Button type="button" variant="outline" className="w-full bg-card" disabled><ExternalLink />Kelola akun di SSO POLIJE</Button><p className="text-xs leading-relaxed text-muted-foreground">Tautan pengelolaan akun akan tersedia setelah integrasi SSO POLIJE diaktifkan.</p></CardContent></div></Card><Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4 md:p-6 md:pb-5"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs"><ShieldCheck className="size-5 text-primary" aria-hidden="true" /></div><div><CardTitle className="text-base">Status sinkronisasi</CardTitle><p className="mt-1 text-sm text-muted-foreground">Informasi akun diambil dari provider identitas kampus.</p></div></CardHeader><CardContent className="p-5 pt-0 md:p-6 md:pt-0"><div className="flex items-center justify-between gap-3 rounded-lg bg-muted/60 p-3 text-sm"><span className="text-muted-foreground">Status akun</span><Badge variant="secondary">{user.status}</Badge></div><p className="mt-3 text-xs leading-relaxed text-muted-foreground">Perubahan data diri perlu dilakukan melalui sistem SSO POLIJE dan akan tersinkron otomatis.</p></CardContent></div></Card></div>
  </div>
}
