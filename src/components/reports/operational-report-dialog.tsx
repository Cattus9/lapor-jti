"use client"

import type { ComponentProps, ReactNode } from "react"
import type { LucideIcon } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { StatusBadge } from "@/components/ui/status-badge"

// Extracted from the canonical Satpam ReportDetailDialog; all operational roles share its shell.
// Children retain the canonical order (stepper, details, attachments, history) with optional action shelf docked at bottom.
export function OperationalReportDialog({
  open,
  onOpenChange,
  finalFocus,
  icon: Icon,
  category,
  submittedAt,
  status,
  title,
  updatedAt,
  action,
  children,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  finalFocus?: ComponentProps<typeof DialogContent>["finalFocus"]
  icon: LucideIcon
  category: string
  submittedAt?: string
  status: string
  title: string
  updatedAt: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent finalFocus={finalFocus}>
        <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span>{category}</span>
            {submittedAt ? (
              <>
                <span aria-hidden="true">·</span>
                <span>Dikirim {submittedAt} WIB</span>
              </>
            ) : null}
            <StatusBadge status={status} />
          </div>
          <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{title}</DialogTitle>
          <DialogDescription className="mt-2">
            Diperbarui {updatedAt}. Tinjau informasi sebelum melanjutkan penanganan.
          </DialogDescription>
        </div>
        <div className="space-y-6 p-5 md:p-6">{children}</div>
        {action ? (
          <aside aria-label="Aksi penanganan laporan" className="sticky bottom-0 z-10 border-t border-border/60 bg-card/95 p-3.5 backdrop-blur-md sm:p-4 md:px-6 md:py-4">
            {action}
          </aside>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
