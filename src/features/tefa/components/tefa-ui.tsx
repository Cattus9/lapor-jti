import type { ReactNode } from "react"
import { FlaskConical, RotateCcw, type LucideIcon } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function formatTefaDate(value: string) {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(value))
}

export function TefaPanel({ icon: Icon, title, description, children, action }: { icon: LucideIcon; title: string; description: string; children: ReactNode; action?: ReactNode }) {
  return <Card className="gap-0 rounded-2xl border border-border bg-sidebar p-1.5 shadow-xs"><div className="overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-5"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><CardTitle className="text-base">{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div></div>{action}</CardHeader><CardContent className="p-5">{children}</CardContent></div></Card>
}

export function TefaPreviewNotice({ reset }: { reset: () => void }) {
  return <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/20 bg-primary/5 p-4"><div className="flex min-w-0 items-start gap-3"><FlaskConical className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">Pratinjau ruang kerja TEFA</p><Badge variant="outline" tone="info">Data contoh</Badge></div><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Login sudah memakai akun asli. Laporan dan aksi di sini masih simulasi, tidak disimpan ke database atau dikirim ke pelapor. Muat ulang untuk mengembalikan contoh.</p></div></div><Button type="button" variant="outline" size="sm" onClick={reset}><RotateCcw />Reset contoh</Button></div>
}
