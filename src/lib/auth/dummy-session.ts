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

export const dummyUser: CurrentUser = {
  id: "dummy-user-001",
  name: "Ayu Santoso",
  email: "ayu.santoso@example.com",
  identifier: "DUMMY-001",
  username: "ayu.santoso",
  unit: "Jurusan Teknologi Informasi",
  studyProgram: "Teknik Informatika",
  status: "Aktif",
  role: "pelapor",
}

export function getDummyUser(): CurrentUser {
  return dummyUser
}
