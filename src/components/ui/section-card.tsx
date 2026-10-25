import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

// A compact section header belongs to the outer layer, above the content surface.
export function SectionCard({ title, icon: Icon, meta, children, className, contentClassName }: {
  title: string; icon: LucideIcon; meta?: ReactNode; children: ReactNode
  className?: string; contentClassName?: string
}) {
  return (
    <Card className={cn("gap-1 rounded-2xl border border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs ring-0", className)}>
      <div data-slot="section-header" className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <h2 className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />{title}</h2>
        {meta !== undefined && meta !== null ? <div className="ml-auto text-xs text-muted-foreground">{meta}</div> : null}
      </div>
      <CardContent className={cn("rounded-xl border border-border/60 bg-card p-5 text-card-foreground shadow-2xs md:p-6", contentClassName)}>{children}</CardContent>
    </Card>
  )
}
