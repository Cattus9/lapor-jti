import type { ComponentProps, ReactNode } from "react"
import { cn } from "cn"
import { Badge } from "@/components/ui/badge"
import { getStatusBadgePresentation } from "./status-badge-presentation"

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "children" | "tone"> & {
  status: string
  children?: ReactNode
}

function StatusBadge({ status, children, className, ...props }: StatusBadgeProps) {
  const presentation = getStatusBadgePresentation(status)
  return (
    <Badge variant="outline" tone={presentation.tone} className={cn(presentation.className, className)} {...props}>
      {children ?? status}
    </Badge>
  )
}

export { StatusBadge }
