"use client"

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"
import { usePathname } from "next/navigation"
import { Badge } from "@/components/ui/badge"

const reportsPath = "/pelapor/laporan-saya"
const markerClassName = "size-4 rounded-full border-0 bg-red-600 p-0 text-xs font-bold text-white shadow-xs"
type Flight = { id: number; path: string; source: { x: number; y: number } }
type Feedback = { hasNewReport: boolean; submissionSucceeded: (source?: DOMRect) => void }
const FeedbackContext = createContext<Feedback | null>(null)

function visibleTarget(kind: "reports" | "navigation") {
  return Array.from(document.querySelectorAll<HTMLElement>(`[data-report-submission-target="${kind}"]`)).find((element) => {
    const rect = element.getBoundingClientRect()
    return rect.width > 0 && rect.height > 0 && rect.right > 0 && rect.left < window.innerWidth && rect.bottom > 0 && rect.top < window.innerHeight
  })
}

function SubmissionFlight({ flight, onComplete }: { flight: Flight; onComplete: (id: number) => void }) {
  const marker = useRef<HTMLSpanElement>(null)
  useEffect(() => {
    const element = marker.current
    const target = visibleTarget("reports") ?? visibleTarget("navigation")
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (!element || !target || reducedMotion.matches || !element.animate) { onComplete(flight.id); return }
    const rect = target.getBoundingClientRect()
    const destination = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
    const control = { x: (flight.source.x + destination.x) / 2, y: Math.max(16, Math.min(flight.source.y, destination.y) - 80) }
    // Native transform-only animation: no React updates for individual frames.
    const frames = Array.from({ length: 13 }, (_, index) => {
      const t = index / 12, remaining = 1 - t
      const x = remaining ** 2 * flight.source.x + 2 * remaining * t * control.x + t ** 2 * destination.x
      const y = remaining ** 2 * flight.source.y + 2 * remaining * t * control.y + t ** 2 * destination.y
      return { transform: `translate(${x - 8}px, ${y - 8}px) scale(${1 + Math.sin(t * Math.PI) * 0.25})`, opacity: 1, offset: t }
    })
    const animation = element.animate(frames, { duration: 700, easing: "ease-in-out", fill: "both" })
    let disposed = false
    const finish = () => { if (!disposed) onComplete(flight.id) }
    const stop = () => { animation.cancel(); finish() }
    animation.finished.then(finish, () => {})
    // If geometry changes, fall back to the badge instead of flying to a stale position.
    window.addEventListener("resize", stop)
    window.addEventListener("scroll", stop, { capture: true, passive: true })
    reducedMotion.addEventListener("change", stop)
    return () => {
      disposed = true
      animation.cancel()
      window.removeEventListener("resize", stop)
      window.removeEventListener("scroll", stop, true)
      reducedMotion.removeEventListener("change", stop)
    }
  }, [flight, onComplete])
  // Feedback layer sits above the closing preview and toast; it never captures input.
  return createPortal(<Badge ref={marker} aria-hidden="true" className={`${markerClassName} pointer-events-none fixed top-0 left-0 z-[90] opacity-0`}>!</Badge>, document.body)
}

// Local presentation feedback, not a database unread count or an authorization decision.
// Mounted in the protected layout so in-app navigation does not discard the reminder.
export function ReportSubmissionFeedbackProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const [reminder, setReminder] = useState({ path: pathname, unseen: false })
  const [flight, setFlight] = useState<Flight | null>(null)
  const sequence = useRef(0)
  if (reminder.path !== pathname) {
    setReminder({ path: pathname, unseen: pathname === reportsPath ? false : reminder.unseen })
    if (flight) setFlight(null)
  }
  const activeFlight = flight?.path === pathname ? flight : null
  const hasNewReport = reminder.unseen && pathname !== reportsPath && !activeFlight
  const finish = useCallback((id: number) => setFlight((current) => current?.id === id ? null : current), [])
  const submissionSucceeded = useCallback((source?: DOMRect) => {
    setReminder({ path: pathname, unseen: true })
    setFlight(null)
    if (!source || source.width <= 0 || source.height <= 0 || source.bottom <= 0 || source.top >= window.innerHeight || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    setFlight({ id: ++sequence.current, path: pathname, source: { x: source.left + source.width / 2, y: source.top + source.height / 2 } })
  }, [pathname])
  return <FeedbackContext.Provider value={{ hasNewReport, submissionSucceeded }}>{children}{activeFlight ? <SubmissionFlight key={activeFlight.id} flight={activeFlight} onComplete={finish} /> : null}</FeedbackContext.Provider>
}

export function useReportSubmissionFeedback() {
  const value = useContext(FeedbackContext)
  if (!value) throw new Error("Report submission feedback requires its protected-layout provider.")
  return value
}

export function ReportSubmissionIndicator({ target, className = "" }: { target: "reports" | "navigation"; className?: string }) {
  const { hasNewReport } = useReportSubmissionFeedback()
  return <Badge data-report-submission-target={target} aria-hidden="true" className={`${markerClassName} pointer-events-none ${className} ${hasNewReport ? "opacity-100" : "opacity-0"}`}>!</Badge>
}
