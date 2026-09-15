"use client"

import * as React from "react"
import { ChartNoAxesCombined } from "lucide-react"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { navigationByRole } from "@/components/navigation/nav-config"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"
import type { AppRole } from "@/lib/auth/roles"

const user = { name: "Ayu Santoso", email: "ayu.santoso@example.com", avatar: "/avatars/shadcn.jpg" }

export function AppSidebar({ role = "pelapor", ...props }: React.ComponentProps<typeof Sidebar> & { role?: AppRole }) {
  const navigation = navigationByRole[role].map(({ icon: Icon, ...item }) => ({ ...item, icon: <Icon /> }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none h-11 select-none gap-2.5 px-3.5">
              <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <ChartNoAxesCombined className="size-[18px]" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">LaporJTI</span>
                <span className="truncate text-xs text-muted-foreground">Workspace</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent><NavMain items={navigation} /></SidebarContent>
      <SidebarFooter><NavUser user={user} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
