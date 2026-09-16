"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarMenuSub, SidebarMenuSubButton, SidebarMenuSubItem,
} from "@/components/ui/sidebar"
import { ChevronRightIcon } from "lucide-react"
import { cn } from "cn"

const menuButtonClass = "h-11 gap-2.5 rounded-lg border border-transparent px-3 text-[15px] font-medium text-sidebar-foreground/70 transition-colors data-active:border-sidebar-border data-active:bg-sidebar-accent data-active:text-sidebar-accent-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground [&_svg]:size-[18px] [&_svg]:stroke-[1.75] group-data-[collapsible=icon]:size-8! group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:[&_svg]:translate-x-1"
const activeMenuClass = "border-sidebar-border bg-sidebar-accent text-sidebar-accent-foreground"

export function NavMain({ items }: { items: { title: string; url: string; icon?: React.ReactNode; isActive?: boolean; items?: { title: string; url: string }[] }[] }) {
  const pathname = usePathname()
  return (
    <SidebarGroup className="px-1.5 py-2 group-data-[collapsible=icon]:px-0">
      <SidebarGroupLabel className="px-2">Workspace</SidebarGroupLabel>
      <SidebarMenu className="gap-1 group-data-[collapsible=icon]:items-center group-data-[collapsible=icon]:gap-3">
        {items.map((item) => {
          const isActive = item.isActive ?? (item.url !== "#" && pathname === item.url)
          return item.items?.length ? (
          <Collapsible key={item.title} defaultOpen={isActive} className="group/collapsible" render={<SidebarMenuItem />}>
            <CollapsibleTrigger render={<SidebarMenuButton isActive={isActive} tooltip={item.title} className={cn(menuButtonClass, isActive && activeMenuClass, "group-data-[collapsible=icon]:mx-auto")} />}>
              {item.icon}<span>{item.title}</span><ChevronRightIcon className="ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90" />
            </CollapsibleTrigger>
            <CollapsibleContent className="overflow-hidden data-open:animate-in data-open:fade-in-0 data-open:slide-in-from-top-1 data-closed:animate-out data-closed:fade-out-0 data-closed:slide-out-to-top-1 data-open:duration-100 data-closed:duration-100">
              <SidebarMenuSub className="mt-1 gap-1 border-sidebar-border/70">
                {item.items.map((subItem) => <SidebarMenuSubItem key={subItem.title}><SidebarMenuSubButton className="h-9 px-3 text-sm" render={<Link href={subItem.url} />}><span>{subItem.title}</span></SidebarMenuSubButton></SidebarMenuSubItem>)}
              </SidebarMenuSub>
            </CollapsibleContent>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.title}><SidebarMenuButton isActive={isActive} tooltip={item.title} className={cn(menuButtonClass, isActive && activeMenuClass, "group-data-[collapsible=icon]:mx-auto")} render={<Link href={item.url} />}>{item.icon}<span>{item.title}</span></SidebarMenuButton></SidebarMenuItem>
        )
        })}
      </SidebarMenu>
    </SidebarGroup>
  )
}
