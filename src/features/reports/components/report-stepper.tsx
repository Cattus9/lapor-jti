import { Check, ClipboardCheck, FileText, ListChecks, type LucideIcon } from "lucide-react"
import { cn } from "cn"

export const reportSteps: { id: "category" | "details" | "review"; title: string; description: string; icon: LucideIcon }[] = [
  { id: "category", title: "Pilih kategori", description: "Jenis laporan", icon: ListChecks },
  { id: "details", title: "Informasi & lampiran", description: "Detail dan foto", icon: FileText },
  { id: "review", title: "Periksa laporan", description: "Konfirmasi kirim", icon: ClipboardCheck },
]

export function ReportStepper({ current }: { current: number }) {
  return (
    <nav aria-label="Langkah pembuatan laporan">
      <ol className="grid gap-3 sm:grid-cols-3">
        {reportSteps.map((step, index) => {
          const done = index < current
          const active = index === current
          const Icon = step.icon
          return (
            <li key={step.id} aria-current={active ? "step" : undefined} className={cn("flex items-center gap-3 rounded-xl border p-3 transition-colors", active ? "border-primary bg-primary/5" : "border-border/60 bg-background/60")}>
              <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg border", done || active ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>
                {done ? <Check className="size-4" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
              </span>
              <span className="min-w-0">
                <span className="block text-xs text-muted-foreground">Langkah {index + 1}</span>
                <span className={cn("block truncate text-sm font-semibold", active || done ? "text-foreground" : "text-muted-foreground")}>{step.title}</span>
              </span>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
