import type { ReactNode } from "react"
import { requireRole } from "@/lib/auth/require-role"

export default async function TefaLayout({ children }: { children: ReactNode }) {
  await requireRole("tefa")
  return children
}
