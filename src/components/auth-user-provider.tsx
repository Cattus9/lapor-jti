"use client"
// [AUTH-SESSION] Meneruskan identitas yang sudah divalidasi server ke komponen presentasi.
// Context browser ini bukan pemeriksaan izin; guard server tetap diperlukan untuk setiap akses protected.

import { createContext, useContext, type ReactNode } from "react"
import type { CurrentUser } from "@/lib/auth/current-user"

const AuthUserContext = createContext<CurrentUser | undefined>(undefined)
export function AuthUserProvider({ user, children }: { user: CurrentUser; children: ReactNode }) {
  return <AuthUserContext.Provider value={user}>{children}</AuthUserContext.Provider>
}
export function useCurrentUser() {
  return useContext(AuthUserContext)
}
