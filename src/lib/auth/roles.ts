// [AUTH-ROLE] Daftar hak akses internal AspirasiJTI, bukan role Google Workspace.
// Role disimpan di users.role dan ditentukan pengelola; tetap digunakan ketika metode login diganti.
// Nilai admin mempertahankan kompatibilitas tipe lama, bukan penambahan modul/akun admin.
export const appRoles = ["pelapor", "satpam", "teknisi", "manajemen", "admin"] as const

export type AppRole = (typeof appRoles)[number]
