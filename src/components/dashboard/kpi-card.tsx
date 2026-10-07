import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

const toneClasses = {
  blue: {
    surface: "border-primary/20 bg-primary/10",
    foreground: "text-primary-action-hover dark:text-primary",
    indicator: "bg-primary/20 dark:bg-primary/30",
  },
  green: {
    surface: "border-emerald-500/20 bg-emerald-500/10",
    foreground: "text-emerald-700 dark:text-emerald-400",
    indicator: "bg-emerald-500/20 dark:bg-emerald-400/30",
  },
  amber: {
    surface: "border-amber-500/20 bg-amber-500/10",
    foreground: "text-amber-700 dark:text-amber-400",
    indicator: "bg-amber-500/20 dark:bg-amber-400/30",
  },
  red: {
    surface: "border-destructive/20 bg-destructive/10",
    foreground: "text-destructive",
    indicator: "bg-destructive/20 dark:bg-destructive/30",
  },
} as const

type KpiTone = keyof typeof toneClasses

export function KpiCard({
  label,
  value,
  icon: Icon,
  iconTone = "blue",
  detail,
  detailValue,
  detailTone = iconTone,
  href,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  iconTone?: KpiTone
  detail?: string
  detailValue?: string | number
  detailTone?: KpiTone
  href?: string
}) {
  const iconToneClass = toneClasses[iconTone]
  const detailToneClass = toneClasses[detailTone]

  return (
    <Card className="flex min-h-44 flex-col justify-between gap-1 overflow-hidden rounded-2xl border border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      {/* KPI inner layer: floating content surface. */}
      <div className="flex-1 space-y-3 rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl border shadow-2xs ${iconToneClass.surface} ${iconToneClass.foreground}`}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="block text-xs font-medium text-muted-foreground">{label}</span>
            <span className="text-xl font-bold tracking-tight text-foreground">{value}</span>
          </div>
        </div>
        {detail && detailValue !== undefined ? (
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className={`size-2 shrink-0 rounded-full ${detailToneClass.indicator}`} aria-hidden="true" />
              <span>{detail}</span>
            </div>
            <span className={`font-semibold ${detailToneClass.foreground}`}>{detailValue}</span>
          </div>
        ) : null}
      </div>
      {href ? <Link href={href} className="group flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <span>Detail</span>
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
      </Link> : <div className="group flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground">
        <span>Detail</span>
        <ArrowRight className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
      </div>}
    </Card>
  )
}
