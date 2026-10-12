"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

function Switch({ className, ...props }: SwitchPrimitive.Root.Props) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      className={cn("inline-flex h-6 w-11 shrink-0 items-center rounded-full border border-input bg-muted p-0.5 outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 data-checked:border-primary data-checked:bg-primary data-disabled:cursor-not-allowed data-disabled:opacity-50", className)}
      {...props}
    >
      <SwitchPrimitive.Thumb data-slot="switch-thumb" className="pointer-events-none block size-4.5 rounded-full bg-background shadow-xs transition-transform data-checked:translate-x-5 motion-reduce:transition-none" />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
