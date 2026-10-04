"use client"
// [AUTH-SESSION] Keluar harus membatalkan session aplikasi melalui Better Auth.
// Untuk Google Workspace, logout aplikasi tidak berarti logout seluruh akun Google; pertahankan pembatalan session lokal.

import { useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth/client"
import { UserAvatar } from "@/components/user-avatar"
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
  const [isPending, setIsPending] = useState(false)
  const [logoutError, setLogoutError] = useState("")
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false)
  const theme: AppTheme = isDark ? "dark" : "light"

  async function handleLogout() {
    if (isPending) return
    setIsPending(true)
    setLogoutError("")
    try {
      const result = await authClient.signOut()
      if (result.error) {
        setLogoutError("Gagal keluar. Silakan coba lagi.")
        return
      }
      router.replace("/login")
      router.refresh()
    } catch {
      setLogoutError("Gagal keluar. Periksa koneksi dan coba lagi.")
    } finally {
      setIsPending(false)
    }
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
            <UserAvatar user={user} />
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
                  <UserAvatar user={user} />
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
              disabled={isPending}
            >
              <LogOutIcon />
              {isPending ? "Memproses..." : "Keluar"}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        {logoutError ? <p className="px-2 py-1 text-xs text-destructive" role="alert">{logoutError}</p> : null}
      </SidebarMenuItem>
    </SidebarMenu>
  )
}
