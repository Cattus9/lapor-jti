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
    <SidebarProvider defaultOpen={defaultOpen} className="bg-sidebar">
      <AppSidebar role={role} />
      {/* Main content edge: soft elevation only, preserving the three-tone base palette. */}
      <SidebarInset className="m-2 rounded-panel border border-border shadow-sm md:m-3 md:peer-data-[state=collapsed]:ml-3">
        <div className="flex h-12 shrink-0 items-center border-b border-border px-4">
          <SidebarTrigger aria-label="Buka navigasi" />
        </div>
        {children}
      </SidebarInset>
    </SidebarProvider>
  )
}
