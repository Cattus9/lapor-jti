"use client"

import { useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar"
import { ChevronsUpDownIcon, LogOutIcon, MoonIcon, PaletteIcon, SunIcon } from "lucide-react"
import { getThemeSnapshot, setTheme, subscribeToTheme, type AppTheme } from "@/lib/theme"

export function NavUser({
  user,
}: {
  user: {
    name: string
    email: string
    avatar: string
  }
}) {
  const { isMobile } = useSidebar()
  const router = useRouter()
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false)
  const theme: AppTheme = isDark ? "dark" : "light"

  function handleLogout() {
    document.cookie = "laporjti_dummy_email=; path=/; max-age=0; samesite=lax"
    router.push("/login")
    router.refresh()
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <SidebarMenuButton size="lg" className="aria-expanded:bg-muted" />
            }
          >
            <Avatar>
              <AvatarImage src={user.avatar} alt={user.name} />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">{user.name}</span>
              <span className="truncate text-xs">{user.email}</span>
            </div>
            <ChevronsUpDownIcon className="ml-auto size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-64 border border-border shadow-md"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuGroup>
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                  <Avatar>
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback>CN</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-medium">{user.name}</span>
                    <span className="truncate text-xs">{user.email}</span>
                  </div>
                </div>
              </DropdownMenuLabel>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger openOnHover={false}>
                <PaletteIcon />
                Tampilan
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="min-w-44 border border-border/80 bg-popover p-1.5 shadow-lg">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Tema</DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuRadioGroup value={theme} onValueChange={(value) => {
                  if (value === "light" || value === "dark") setTheme(value)
                }}>
                  <DropdownMenuRadioItem value="light" className="gap-2.5 py-1.5">
                    <span className="flex size-7 items-center justify-center rounded-md border border-border bg-background text-foreground shadow-2xs">
                      <SunIcon className="size-3.5" />
                    </span>
                    <span>Terang</span>
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="dark" className="gap-2.5 py-1.5">
                    <span className="flex size-7 items-center justify-center rounded-md border border-border bg-foreground text-background shadow-2xs">
                      <MoonIcon className="size-3.5" />
                    </span>
                    <span>Gelap</span>
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:bg-destructive/10 focus:text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={handleLogout}
            >
              <LogOutIcon />
              Keluar
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
