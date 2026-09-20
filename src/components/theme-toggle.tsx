"use client"

import { useSyncExternalStore } from "react"
import { MoonIcon, SunIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import { getThemeSnapshot, setTheme, subscribeToTheme } from "@/lib/theme"

export function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribeToTheme, getThemeSnapshot, () => false)

  function toggleTheme() {
    const nextIsDark = !isDark

    setTheme(nextIsDark ? "dark" : "light")
  }

  const label = isDark ? "Gunakan mode terang" : "Gunakan mode gelap"

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      className="ml-auto text-muted-foreground hover:bg-muted hover:text-foreground"
      aria-label={label}
      aria-pressed={isDark}
      title={label}
      onClick={toggleTheme}
    >
      {isDark ? <SunIcon className="size-4" aria-hidden="true" /> : <MoonIcon className="size-4" aria-hidden="true" />}
    </Button>
  )
}
