"use client"

import Link from "next/link"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"

const menuButtonClass = "h-11 gap-2.5 px-3.5 text-[15px] text-sidebar-foreground/70 transition-colors data-active:bg-blue-100 data-active:text-blue-700 data-active:font-normal dark:data-active:bg-blue-950 dark:data-active:text-blue-300 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-[18px] [&_svg]:stroke-[1.75] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:translate-x-1"

export function NavMain({ items }: { items: { title: string; url: string; icon?: React.ReactNode; isActive?: boolean; items?: { title: string; url: string }[] }[] }) {
  return (
    <SidebarGroup className="px-1.5 py-2 group-data-[collapsible=icon]:px-0">
      <SidebarGroupLabel className="px-2">Workspace</SidebarGroupLabel>
      <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-3">
        {items.map((item) => item.items?.length ? (
          <Collapsible key={item.title} defaultOpen={item.isActive} className="group/collapsible" render={<SidebarMenuItem />}>
            <CollapsibleTrigger render={<SidebarMenuButton isActive={item.isActive} tooltip={item.title} className={`${menuButtonClass} group-data-[collapsible=icon]:mx-auto`} />}>
              {item.icon}<span>{item.title}</span><ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-1 data-open:duration-100 data-closed:duration-100">
              <SidebarMenuSub className="mt-1 gap-1 border-sidebar-border/70">
                {item.items.map((subItem) => <SidebarMenuSubItem key={subItem.title}><SidebarMenuSubButton className="h-9 px-3 text-sm" render={<Link href={subItem.url} />}><span>{subItem.title}</span></SidebarMenuSubButton></SidebarMenuSubItem>)}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.title}><SidebarMenuButton isActive={item.isActive} tooltip={item.title} className={`${menuButtonClass} group-data-[collapsible=icon]:mx-auto`} render={<Link href={item.url} />}>{item.icon}<span>{item.title}</span></SidebarMenuButton></SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}
