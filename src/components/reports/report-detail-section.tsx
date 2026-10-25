import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"

export function ReportDetailSection({ icon: Icon, title, description, children }: { icon: LucideIcon; title: string; description: string; children: ReactNode }) {
  return <section className="space-y-4 border-t border-border/60 pt-6">
    <div className="flex items-center gap-2">
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary"><Icon className="size-4" aria-hidden="true" /></span>
      <div><h3 className="text-sm font-semibold text-foreground">{title}</h3><p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{description}</p></div>
    </div>{children}
  </section>
}
export function ReportDetailTable({ rows }: { rows: { label: string; icon: LucideIcon; hint?: string; value: ReactNode }[] }) {
  return <dl className="overflow-hidden rounded-xl border border-border">
    {rows.map(({ label, icon: Icon, hint, value }) => <div key={label} className="grid border-b border-border/60 last:border-b-0 sm:grid-cols-3">
      <dt className="border-b border-border/60 bg-background p-4 sm:border-b-0 sm:border-r"><span className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 shrink-0" aria-hidden="true" />{label}</span>{hint ? <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{hint}</span> : null}</dt>
      <dd className="whitespace-pre-wrap break-words p-4 text-sm text-foreground sm:col-span-2">{value || "Tidak dicatat"}</dd>
    </div>)}
  </dl>
}
