"use client"
// [AUTH-ROLE] Menu mengikuti role aplikasi untuk presentasi, bukan bukti otorisasi.
// Login Google Workspace tetap memakai role database; akses URL diperiksa pada server.

import * as React from "react"
import Image from "next/image"
import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import { ReportSubmissionIndicator, useReportSubmissionFeedback } from "@/components/report-submission-feedback-provider"
import { navigationByRole } from "@/components/navigation/nav-config"
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail } from "@/components/ui/sidebar"
import type { AppRole } from "@/lib/auth/roles"

const fallbackUser = { name: "Pengguna AspirasiJTI", email: "", avatar: "" }

export function AppSidebar({ role = "pelapor", user = fallbackUser, ...props }: React.ComponentProps<typeof Sidebar> & { role?: AppRole; user?: { name: string; email: string; avatar?: string } }) {
  const { hasNewReport } = useReportSubmissionFeedback()
  const navigation = navigationByRole[role].map(({ icon: Icon, ...item }) => ({
    ...item,
    icon: <Icon />,
    ...(role === "pelapor" && item.url === "/pelapor/laporan-saya" ? {
      accessibleLabel: hasNewReport ? `${item.title}, laporan baru berhasil dikirim` : undefined,
      indicator: <ReportSubmissionIndicator target="reports" className="absolute top-1/2 right-3 -translate-y-1/2 group-data-[collapsible=icon]:-right-1 group-data-[collapsible=icon]:top-0 group-data-[collapsible=icon]:translate-y-0" />,
    } : {}),
  }))

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="pointer-events-none h-11 select-none gap-2.5 px-3.5">
              <div className="relative size-8 shrink-0 overflow-hidden rounded-lg">
                <Image src="/logo/logo-sb-login.png" alt="" fill sizes="32px" className="object-cover" />
              </div>
              <div className="grid min-w-0 flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                <span className="truncate font-medium">AspirasiJTI</span>
                <span className="truncate text-xs text-muted-foreground">Workspace</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent><NavMain items={navigation} /></SidebarContent>
      <SidebarFooter><NavUser user={{ ...user, avatar: user.avatar ?? "" }} /></SidebarFooter>
      <SidebarRail />
    </Sidebar>
  )
}
