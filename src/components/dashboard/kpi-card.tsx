import Link from "next/link"
import { ArrowRight, type LucideIcon } from "lucide-react"
import { Card } from "@/components/ui/card"

const toneClasses = {
  blue: "bg-primary/10 text-primary",
  green: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  red: "bg-destructive/10 text-destructive",
} as const

type KpiTone = keyof typeof toneClasses

export function KpiCard({
  label,
  value,
  icon: Icon,
  detail,
  detailValue,
  detailTone = "blue",
  href,
}: {
  label: string
  value: string | number
  icon: LucideIcon
  detail?: string
  detailValue?: string | number
  detailTone?: KpiTone
  href: string
}) {
  const tone = toneClasses[detailTone]
  const [indicatorColor, valueColor] = tone.split(" ")

  return (
    <Card className="justify-between rounded-2xl bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      {/* KPI inner layer: floating content surface. */}
      <div className="space-y-3 rounded-xl border border-border/60 bg-card p-4 text-card-foreground shadow-2xs">
        <div className="flex items-center gap-3.5">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background shadow-2xs">
            <Icon className="size-5 text-foreground" strokeWidth={1.75} />
          </div>
          <div className="flex flex-col">
            <span className="block text-xs font-medium text-muted-foreground">{label}</span>
            <span className="text-xl font-bold tracking-tight text-foreground">{value}</span>
          </div>
        </div>
        {detail && detailValue !== undefined ? (
          <div className="mt-2 flex items-center justify-between border-t border-border/60 pt-2.5 text-xs">
            <div className="flex items-center gap-1.5 font-medium text-muted-foreground">
              <span className={`size-2 rounded-full ${indicatorColor}`} />
              <span>{detail}</span>
            </div>
            <span className={`font-semibold ${valueColor}`}>{detailValue}</span>
          </div>
        ) : null}
      </div>
      <Link href={href} className="group flex items-center justify-between px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
        <span>Lihat detail</span>
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" strokeWidth={1.75} />
      </Link>
    </Card>
  )
}
