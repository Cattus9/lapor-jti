import { Check, ClipboardCheck, FileText, ListChecks, type LucideIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export type PelaporanStepId = "type" | "details" | "review"

export const pelaporanSteps: { id: PelaporanStepId; title: string; description: string; icon: LucideIcon }[] = [
  { id: "type", title: "Pilih jenis", description: "Kehilangan atau Temuan", icon: ListChecks },
  { id: "details", title: "Informasi & lampiran", description: "Detail dan foto", icon: FileText },
  { id: "review", title: "Periksa laporan", description: "Konfirmasi simpan", icon: ClipboardCheck },
]

export function SatpamPelaporanStepper({
  current,
  onStepClick,
}: {
  current: number
  onStepClick?: (index: number) => void
}) {
  return (
    <nav aria-label="Langkah pelaporan Satpam">
      <ol className="grid gap-3 sm:grid-cols-3">
        {pelaporanSteps.map((step, index) => {
          const done = index < current
          const active = index === current
          const Icon = step.icon
          const canClick = Boolean(onStepClick && index < current)

          return (
            <li
              key={step.id}
              aria-current={active ? "step" : undefined}
            ><Button type="button" variant="ghost" disabled={!canClick} onClick={() => onStepClick?.(index)}
              className={cn(
                "h-auto w-full justify-start gap-3 rounded-xl border p-3 text-left transition-colors disabled:opacity-100",
                active ? "border-primary bg-primary/5" : "border-border/60 bg-background/60",
                canClick ? "cursor-pointer hover:border-primary/40" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg border",
                  done || active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground"
                )}
              >
                {done ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Langkah {index + 1}</span>
                <span
                  className={cn(
                    "block truncate text-sm font-semibold",
                    active || done ? "text-foreground" : "text-muted-foreground"
                  )}
                >
                  {step.title}
                </span>
              </span>
            </Button></li>
          )
        })}
      </ol>
    </nav>
  )
}
