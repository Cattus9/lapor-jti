import type { ReactNode } from "react"
import { requireRole } from "@/lib/auth/require-role"
import { TefaPreviewProvider } from "@/features/tefa/components/tefa-preview-provider"

export default async function TefaLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("tefa")
  return <TefaPreviewProvider key={user.id}>{children}</TefaPreviewProvider>
}
