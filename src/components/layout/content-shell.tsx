import type { ReactNode } from "react"

export function ContentShell({ children }: { children: ReactNode }) {
  return <main className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto overscroll-y-contain p-4 pt-16 touch-pan-y [&>*]:shrink-0 [-webkit-overflow-scrolling:touch] md:p-6 md:pt-18 lg:p-8 lg:pt-20">{children}</main>
}
