import type { ComponentProps } from "react"
import { Check } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { cn } from "cn"

export type StepperStep = { value: string; label: string }

// Read-only progress, not navigation. Native ol/li semantics pair with Shadcn
// Badge/Separator; colors, spacing, and typography come from the shared theme.
export function Stepper({ steps, value, variant = "segments", className, ...props }: Omit<ComponentProps<"ol">, "children"> & { steps: readonly StepperStep[]; value: string; variant?: "segments" | "circles" }) {
  const current = steps.findIndex((step) => step.value === value)
  return <ol data-slot="stepper" data-variant={variant} className={cn("flex w-full items-start", variant === "segments" && "gap-1.5", className)} {...props}>
    {steps.map((step, index) => {
      const state = index === current ? "current" : index < current ? "completed" : "upcoming"
      const label = <><span className="sr-only">{state === "completed" ? "Tahap sebelumnya: " : state === "current" ? "Tahap saat ini: " : "Belum dicapai: "}</span>{step.label}</>
      return <li key={step.value} data-slot="stepper-item" data-state={state} aria-current={state === "current" ? "step" : undefined} className={cn("min-w-0 flex-1", variant === "segments" ? "flex flex-col gap-1" : "flex items-start")}>
        {variant === "segments" ? <>
          <Separator aria-hidden="true" className={cn("w-full rounded-full data-[orientation=horizontal]:h-1.5", state === "current" ? "bg-primary" : state === "completed" ? "bg-primary/25" : "bg-muted")} />
          <span className={cn("sr-only text-xs leading-snug sm:not-sr-only sm:truncate", state === "current" ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
        </> : <>
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <Badge variant="outline" aria-hidden="true" className={cn("size-7 rounded-full p-0", state === "current" ? "border-primary-action bg-primary-action text-primary-foreground" : state === "completed" ? "border-primary/25 bg-primary/10 text-primary-action-hover" : "border-border bg-card text-muted-foreground")}>{state === "completed" ? <Check aria-hidden="true" /> : index + 1}</Badge>
            <span className={cn("text-center text-xs leading-snug", state === "current" ? "font-semibold text-foreground" : "text-muted-foreground")}>{label}</span>
          </div>
          {index < steps.length - 1 ? <Separator aria-hidden="true" className={cn("mt-3.5 h-px min-w-3 flex-1", index < current ? "bg-primary/25" : "bg-border")} /> : null}
        </>}
      </li>
    })}
  </ol>
}
