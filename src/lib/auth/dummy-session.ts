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
  "teknisi@gmail.com": {
    id: "dummy-teknisi-001",
    name: "Rizky Pratama",
    email: "teknisi@gmail.com",
    identifier: "TEKNISI-001",
    username: "teknisi",
    unit: "Unit Sarana dan Prasarana JTI",
    studyProgram: "Tidak berlaku",
    status: "Aktif",
    role: "teknisi",
  },
  "manajemen@gmail.com": {
    id: "dummy-manajemen-001",
    name: "Dewi Lestari",
    email: "manajemen@gmail.com",
    identifier: "MANAJEMEN-001",
    username: "manajemen",
    unit: "Manajemen Jurusan Teknologi Informasi",
    studyProgram: "Tidak berlaku",
    status: "Aktif",
    role: "manajemen",
  },
}

export const dummyUser = dummyUsers["pelapor@gmail.com"]

export function getDummyUserByEmail(email: string): CurrentUser | undefined {
  return dummyUsers[email.trim().toLowerCase()]
}

export function getDummyUser(): CurrentUser {
  return dummyUser
}
