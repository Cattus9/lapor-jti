"use client"

import { useState, useSyncExternalStore, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ActivityNotificationProvider } from "@/components/activity-notification-provider"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import { dummyUser, getDummyUserByEmail, type CurrentUser } from "@/lib/auth/dummy-session"
import type { AppRole } from "@/lib/auth/roles"

const DUMMY_EMAIL_COOKIE = "laporjti_dummy_email"
const SIDEBAR_STATE_COOKIE = "sidebar_state"

function getBrowserSessionUser() {
  const email = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${DUMMY_EMAIL_COOKIE}=`))
    ?.split("=")[1]

  return getDummyUserByEmail(decodeURIComponent(email ?? "")) ?? dummyUser
}

function subscribeToSession(onStoreChange: () => void) {
  const timer = window.setTimeout(onStoreChange, 0)
  return () => window.clearTimeout(timer)
}

function getInitialSidebarOpen() {
  if (typeof document === "undefined") return true

  const sidebarState = document.cookie
    .split("; ")
    .find((cookie) => cookie.startsWith(`${SIDEBAR_STATE_COOKIE}=`))
    ?.split("=")[1]

  return sidebarState !== "false"
}

export function DashboardLayout({
  children,
  role = "pelapor",
}: {
  children: ReactNode
  role?: AppRole
}) {
  const sessionUser = useSyncExternalStore<CurrentUser>(subscribeToSession, getBrowserSessionUser, () => dummyUser)
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen)

  return (
    <ActivityNotificationProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} className="h-svh min-h-0 overflow-hidden bg-sidebar">
        <AppSidebar role={role} user={sessionUser} />
        {/* Main content edge: soft elevation only, preserving the three-tone base palette. */}
        <SidebarInset className="m-2 h-[calc(100dvh-1rem)] min-h-0 overflow-hidden rounded-panel border border-border shadow-sm md:m-3 md:h-[calc(100dvh-1.5rem)] md:peer-data-[state=collapsed]:ml-3">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center border-b border-border bg-background/80 px-4 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/75">
              <SidebarTrigger aria-label="Buka navigasi" />
            </div>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ActivityNotificationProvider>
  )
}
