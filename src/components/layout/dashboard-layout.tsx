import type { ReactNode } from "react"
import { AppSidebar } from "@/components/app-sidebar"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import type { AppRole } from "@/lib/auth/roles"

export function DashboardLayout({
  children,
  role = "pelapor",
}: {
  children: ReactNode
  role?: AppRole
}) {
  return (
    <SidebarProvider>
      <AppSidebar role={role} />
      <SidebarInset>{children}</SidebarInset>
    </SidebarProvider>
  )
}
