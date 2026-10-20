import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export function TefaPanel({ icon: Icon, title, description, children, action }: { icon: LucideIcon; title: string; description: string; children: ReactNode; action?: ReactNode }) {
  return <Card className="gap-0 rounded-2xl border border-border bg-sidebar p-1.5 shadow-xs"><div className="overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 p-5"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><CardTitle className="text-base">{title}</CardTitle><CardDescription className="mt-1">{description}</CardDescription></div></div>{action}</CardHeader><CardContent className="p-5">{children}</CardContent></div></Card>
}
