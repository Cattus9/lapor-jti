import type { ReactNode } from "react"
import { cookies } from "next/headers"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar"
import type { AppRole } from "@/lib/auth/roles"

export async function DashboardLayout({
  children,
  role = "pelapor",
}: {
  children: ReactNode
  role?: AppRole
}) {
  const sidebarState = (await cookies()).get("sidebar_state")?.value
  const defaultOpen = sidebarState !== "false"

  return (
    <SidebarProvider defaultOpen={defaultOpen} className="h-svh min-h-0 overflow-hidden bg-sidebar">
      <AppSidebar role={role} />
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
  )
}
