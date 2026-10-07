"use client"
// [AUTH-SESSION] Identitas sidebar berasal dari provider server, bukan cookie email atau pilihan role browser.
// [AUTH-ROLE] Prop role hanya mengatur tampilan; izin halaman tetap diperiksa melalui requireRole().

import { useState, type ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { ActivityNotificationProvider } from "@/components/activity-notification-provider"
import { ReportSubmissionIndicator, useReportSubmissionFeedback } from "@/components/report-submission-feedback-provider"
import { ThemeToggle } from "@/components/theme-toggle"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type { CurrentUser } from "@/lib/auth/current-user"
import { useCurrentUser } from "@/components/auth-user-provider"
import type { AppRole } from "@/lib/auth/roles"

const SIDEBAR_STATE_COOKIE = "sidebar_state"

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
  user,
}: {
  children: ReactNode
  role?: AppRole
  user?: CurrentUser
}) {
  const authenticatedUser = useCurrentUser()
  const { hasNewReport } = useReportSubmissionFeedback()
  const sessionUser = authenticatedUser ?? user
  const [sidebarOpen, setSidebarOpen] = useState(getInitialSidebarOpen)

  return (
    <ActivityNotificationProvider>
      <SidebarProvider open={sidebarOpen} onOpenChange={setSidebarOpen} className="h-svh min-h-0 overflow-hidden bg-sidebar">
        <AppSidebar role={role} user={sessionUser} />
        {/* Main content edge: soft elevation only, preserving the three-tone base palette. */}
        <SidebarInset className="m-2 h-[calc(100dvh-1rem)] min-h-0 overflow-hidden rounded-panel border border-border shadow-sm md:m-3 md:h-[calc(100dvh-1.5rem)] md:peer-data-[state=collapsed]:ml-3">
          <div className="relative flex min-h-0 flex-1 flex-col">
            <div className="absolute inset-x-0 top-0 z-20 flex h-12 items-center border-b border-border bg-background/80 px-4 backdrop-blur-xl backdrop-saturate-150 supports-[backdrop-filter]:bg-background/75">
              <div className="relative">
                <SidebarTrigger aria-label={role === "pelapor" && hasNewReport ? "Buka navigasi, laporan baru tersedia di Laporan Saya" : "Buka atau tutup navigasi"} />
                {role === "pelapor" ? <ReportSubmissionIndicator target="navigation" className="absolute -top-1 -right-1 md:hidden" /> : null}
              </div>
              <ThemeToggle />
            </div>
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ActivityNotificationProvider>
  )
}
