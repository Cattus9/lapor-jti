export const appRoles = ["pelapor", "satpam", "teknisi", "manajemen", "admin"] as const

export type AppRole = (typeof appRoles)[number]
