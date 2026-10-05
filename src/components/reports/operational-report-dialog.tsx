"use client"

import type { ComponentProps, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"

// Extracted from the canonical Satpam ReportDetailDialog; all operational roles share its shell.
// Children retain the canonical order: stepper, action panel, details, attachments, history.
export function OperationalReportDialog({ open, onOpenChange, finalFocus, icon: Icon, category, ticket, status, title, updatedAt, children }: {
  open: boolean; onOpenChange: (open: boolean) => void; finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"]
  icon: LucideIcon; category: string; ticket: string; status: string; title: string; updatedAt: string; children: ReactNode
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent finalFocus={finalFocus}>
    <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Icon className="size-4" aria-hidden="true" /></span>
        <span>{category}</span><span aria-hidden="true">·</span><span>{ticket}</span><StatusBadge status={status} />
      </div>
      <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{title}</DialogTitle>
      <DialogDescription className="mt-2">Diperbarui {updatedAt}. Tinjau informasi sebelum melanjutkan penanganan.</DialogDescription>
    </div>
    <div className="space-y-6 p-5 md:p-6">{children}</div>
  </DialogContent></Dialog>
}
