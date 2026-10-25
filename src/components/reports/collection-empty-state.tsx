import type { ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

export function CollectionEmptyState({ icon: Icon, title, description, action, className, size = "default" }: {
  icon: LucideIcon; title: string; description: string; action?: ReactNode; className?: string; size?: "default" | "compact"
}) {
  return (
    <Card className={cn("gap-0 rounded-xl border border-dashed border-border bg-empty-surface py-0 shadow-none ring-0", className)}>
      <CardContent className={cn("flex flex-col items-center justify-center px-4 py-6 text-center sm:px-6", size === "compact" ? "min-h-36" : "min-h-52")}>
        <Icon className="size-6 text-muted-foreground" aria-hidden="true" />
        <h3 className="mt-3 text-sm font-medium text-foreground">{title}</h3>
        <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">{description}</p>
        {action ? <div className="mt-4">{action}</div> : null}
      </CardContent>
    </Card>
  )
}
