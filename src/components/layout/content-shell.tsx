import type { ReactNode } from "react"

export function ContentShell({ children }: { children: ReactNode }) {
  return <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 md:p-6 lg:p-8">{children}</main>
}
