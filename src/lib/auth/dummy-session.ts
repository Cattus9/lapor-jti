import type { AppRole } from "./roles"

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

export const dummyUsers: Record<string, CurrentUser> = {
  "pelapor@gmail.com": {
    id: "dummy-pelapor-001",
    name: "Ayu Santoso",
    email: "pelapor@gmail.com",
    identifier: "PELAPOR-001",
    username: "pelapor",
    unit: "Jurusan Teknologi Informasi",
    studyProgram: "Teknik Informatika",
    status: "Aktif",
    role: "pelapor",
  },
  "satpam@gmail.com": {
    id: "dummy-satpam-001",
    name: "Budi Santoso",
    email: "satpam@gmail.com",
    identifier: "SATPAM-001",
    username: "satpam",
    unit: "Unit Keamanan JTI",
    studyProgram: "Tidak berlaku",
    status: "Aktif",
    role: "satpam",
  },
}

export const dummyUser = dummyUsers["pelapor@gmail.com"]

export function getDummyUserByEmail(email: string): CurrentUser | undefined {
  return dummyUsers[email.trim().toLowerCase()]
}

export function getDummyUser(): CurrentUser {
  return dummyUser
}
