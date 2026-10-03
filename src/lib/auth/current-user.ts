import type { AppRole } from "./roles"
// [AUTH-SESSION] Kontrak identitas aplikasi, terpisah dari bentuk session/provider autentikasi.
// Saat migrasi Google Workspace atau penggantian engine, petakan session ke tipe ini di server-session.ts.

export type CurrentUser = {
  id: string
  name: string
  email: string
  identifier: string
  username: string
  unit: string
  studyProgram: string
  status: "Aktif" | "Nonaktif"
  avatar?: string
  role: AppRole
}
