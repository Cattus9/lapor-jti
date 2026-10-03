import type { CurrentUser } from "../../src/lib/auth/current-user"
// [AUTH-LOCAL] Identitas demo untuk seed lokal; bukan sumber identitas/role pengguna production.
// Google Workspace harus dipetakan ke pengguna database yang sah, tanpa mengandalkan email/ID fixture ini.

// Development fixtures only. These IDs never become authenticated database identities.
export const demoUsers: Record<string, CurrentUser> = {
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
