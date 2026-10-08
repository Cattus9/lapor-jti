"use client"

import { useRef, useState, type ReactNode } from "react"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { OperationalRefreshContext } from "@/components/reports/use-operational-data"
import { ManagementReportDetailDialog } from "./management-report-detail-dialog"
import type { ManagementCommand } from "../domain/management"
import type { ManagementReport } from "../types"

export type OpenManagementReport = (report: ManagementReport, trigger: HTMLButtonElement) => void
export function ManagementReportSession({ children, initialTicket = "", readOnly = false }: {
  children: (openReport: OpenManagementReport, retry: () => void) => ReactNode; initialTicket?: string; readOnly?: boolean
}) {
  const { notify } = useActivityNotifications()
  const [selection, setSelection] = useState<{ ticket: string; report?: ManagementReport }>(() => ({ ticket: initialTicket }))
  const [open, setOpen] = useState(Boolean(initialTicket)), [revision, setRevision] = useState(0), [pending, setPending] = useState(false), [error, setError] = useState("")
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null)
  const submitting = useRef(false)
  const retry = () => setRevision((value) => value + 1)
  async function command(value: ManagementCommand) {
    if (submitting.current || readOnly) return false
    submitting.current = true; setPending(true); setError("")
    try {
      const response = await fetch("/api/manajemen/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Status belum berhasil diperbarui.")
      notify({ title: "Status laporan diperbarui", description: `${value.ticket} berhasil diperbarui.`, tone: "success" }); retry(); return true
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Koneksi bermasalah."
      setError(message); notify({ title: "Pembaruan belum berhasil", description: message, tone: "warning" }); retry(); return false
    } finally { submitting.current = false; setPending(false) }
  }
  return <OperationalRefreshContext.Provider value={revision}>
    {children((report, element) => { setTrigger(element); setSelection({ ticket: report.ticket, report }); setError(""); setOpen(true) }, retry)}
    {/* Keep the modal outside filtered/paginated rows so refreshing status cannot unmount it. */}
    {selection.ticket ? <ManagementReportDetailDialog key={selection.ticket} ticket={selection.ticket} initialReport={selection.report} open={open} onOpenChange={setOpen} finalFocus={() => trigger?.isConnected ? trigger : false} onCommand={readOnly ? undefined : command} pending={pending} error={error} onRetry={retry} readOnly={readOnly} /> : null}
  </OperationalRefreshContext.Provider>
}
