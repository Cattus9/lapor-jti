"use client"

import { useEffect, useRef, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function UnopenedReportBadge({ unseen }: { unseen?: boolean }) {
  return unseen ? <Badge variant="outline" tone="primary"><span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />Belum dibuka</Badge> : null
}

// Mount only after an authorized detail has loaded, never on list or monitoring reads.
export function ReportOpeningTracker({ reportId, onMarked }: { reportId?: string; onMarked: () => void }) {
  const [attempt, setAttempt] = useState(0)
  const [failed, setFailed] = useState(false)
  const lastAttempt = useRef("")
  useEffect(() => {
    if (!reportId) return
    const key = `${reportId}:${attempt}`
    if (lastAttempt.current === key) return
    lastAttempt.current = key
    void fetch(`/api/reports/${encodeURIComponent(reportId)}/opened`, { method: "POST" }).then((response) => {
      if (!response.ok) throw new Error("Penanda belum tersimpan")
      setFailed(false)
      onMarked()
    }).catch(() => setFailed(true))
  }, [reportId, attempt, onMarked])
  return failed ? <p role="status" className="text-xs text-muted-foreground">Penanda pembukaan belum tersimpan. <Button type="button" variant="link" size="sm" onClick={() => setAttempt((value) => value + 1)}>Coba lagi</Button></p> : null
}
