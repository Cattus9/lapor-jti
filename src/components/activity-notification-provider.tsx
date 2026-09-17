"use client"

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react"
import { BellRing, CircleAlert, CircleCheck, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { cn } from "cn"

type ActivityNotificationTone = "success" | "info" | "warning"

type ActivityNotification = {
  id: string
  title: string
  description: string
  tone: ActivityNotificationTone
}

type ActivityNotificationContextValue = {
  notify: (notification: Omit<ActivityNotification, "id">) => void
}

const ActivityNotificationContext = createContext<ActivityNotificationContextValue | null>(null)

const toneMeta = {
  success: { icon: CircleCheck, className: "border-emerald-200 bg-emerald-50 text-emerald-700" },
  info: { icon: BellRing, className: "border-primary/20 bg-primary/5 text-primary" },
  warning: { icon: CircleAlert, className: "border-amber-200 bg-amber-50 text-amber-700" },
} as const

export function ActivityNotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<ActivityNotification[]>([])

  const dismiss = useCallback((id: string) => {
    setNotifications((current) => current.filter((notification) => notification.id !== id))
  }, [])

  const notify = useCallback((notification: Omit<ActivityNotification, "id">) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    setNotifications((current) => [...current.slice(-2), { ...notification, id }])
  }, [])

  useEffect(() => {
    const timers = notifications.map((notification) => window.setTimeout(() => dismiss(notification.id), 6000))
    return () => timers.forEach(window.clearTimeout)
  }, [dismiss, notifications])

  return <ActivityNotificationContext.Provider value={{ notify }}>{children}<div className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex flex-col items-end gap-2 sm:left-auto sm:w-[24rem]" aria-live="polite">{notifications.map((notification) => <ActivityNotificationCard key={notification.id} notification={notification} onDismiss={dismiss} />)}</div></ActivityNotificationContext.Provider>
}

function ActivityNotificationCard({ notification, onDismiss }: { notification: ActivityNotification; onDismiss: (id: string) => void }) {
  const meta = toneMeta[notification.tone]
  const Icon = meta.icon

  return <Card className="pointer-events-auto w-full gap-0 rounded-xl border-border bg-card py-0 text-card-foreground shadow-lg"><CardContent className="flex items-start gap-3 p-3.5"><span className={cn("flex size-8 shrink-0 items-center justify-center rounded-lg border", meta.className)}><Icon className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="text-sm font-medium text-foreground">{notification.title}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{notification.description}</p></div><Button type="button" variant="ghost" size="icon-xs" className="-mr-1 -mt-1" aria-label="Tutup notifikasi" onClick={() => onDismiss(notification.id)}><X className="size-3.5" aria-hidden="true" /></Button></CardContent></Card>
}

export function useActivityNotifications() {
  const context = useContext(ActivityNotificationContext)

  if (!context) throw new Error("useActivityNotifications must be used within an ActivityNotificationProvider")

  return context
}
