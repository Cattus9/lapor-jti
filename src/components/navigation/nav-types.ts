import type { ComponentType } from "react"

export type NavigationItem = {
  title: string
  url: string
  icon: ComponentType<{ className?: string }>
  items?: { title: string; url: string }[]
}
