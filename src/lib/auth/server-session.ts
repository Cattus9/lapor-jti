import "server-only"
// [AUTH-SESSION] Adapter terpusat dari session Better Auth ke CurrentUser aplikasi.
// Jika engine auth diganti, mulai penyesuaian validasi session di sini agar pemanggil tidak tersebar.
// [AUTH-ROLE] Tetap baca role/status aktif dari users, termasuk ketika identitas berasal dari Google Workspace.
import { cache } from "react"
import { headers } from "next/headers"
import { eq } from "drizzle-orm"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { getAuth } from "./auth"
import type { CurrentUser } from "./current-user"

export const getCurrentUser = cache(async (): Promise<CurrentUser | null> => {
  // Establish request-time rendering before reading runtime-only auth configuration.
  const requestHeaders = await headers()
  const session = await getAuth().api.getSession({ headers: requestHeaders })
  if (!session) return null
  // Read authorization from the database, not a client-supplied role or stale cookie cache.
  const [user] = await getDb().select().from(users).where(eq(users.id, session.user.id)).limit(1)
  if (!user?.isActive) return null
  return {
    id: user.id, name: user.name, email: user.email, role: user.role,
    identifier: user.identifier ?? "Belum diisi",
    username: user.username ?? "Belum diisi",
    unit: user.unit ?? "Belum diisi",
    studyProgram: user.studyProgram ?? "Belum diisi",
    status: "Aktif", avatar: user.image ?? undefined,
  }
})
