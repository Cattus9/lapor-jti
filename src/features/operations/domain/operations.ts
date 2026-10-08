import { isUuid, ReportError } from "../../reports/domain/report"
import { isFacilityCategory, type FacilityCategory } from "./facility-categories"

export const operationalRoles = ["pelapor", "satpam", "teknisi", "manajemen"] as const
export type OperationalRole = typeof operationalRoles[number]
export const roleLabels: Record<OperationalRole, string> = { pelapor: "Pelapor", satpam: "Satpam", teknisi: "Teknisi", manajemen: "Manajemen Jurusan" }
export type MasterKind = "areas" | "locations" | "objects" | "services" | "officers"
export type MasterRecord = { id: string; name: string; isActive: boolean; revision: number; kind?: string; sortOrder?: number; areaId?: string; group?: string; objectIds?: string[] }
export type OperationalCatalog = Record<MasterKind, MasterRecord[]>
export type UserRecord = { id: string; name: string; email: string; role: OperationalRole; isActive: boolean; identifier: string | null; unit: string | null; studyProgram: string | null; updatedAt: string }
export type UsersPage = { items: UserRecord[]; total: number; page: number; pageSize: number }
export type MasterCommand = { entity: MasterKind; id?: string; revision?: number; name: string; isActive: boolean; kind: "floor" | "area"; sortOrder: number; areaId: string; group: FacilityCategory | ""; objectIds: string[] }
export type UserCommand = { id?: string; updatedAt?: string; name: string; email: string; role: OperationalRole; isActive: boolean; identifier: string | null; unit: string | null; studyProgram: string | null; password?: string }
function object(raw: unknown) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Isian tidak valid.")
  return raw as Record<string, unknown>
}
function text(raw: unknown, label: string, max = 100, required = true) {
  if (typeof raw !== "string") { if (!required && raw == null) return ""; throw new ReportError(`${label} tidak valid.`) }
  const value = raw.trim()
  if ((required && !value) || value.length > max || /[\u0000-\u001f\u007f]/.test(value)) throw new ReportError(`${label} maksimal ${max} karakter dan tidak boleh kosong.`)
  return value
}
function active(raw: unknown) { if (typeof raw !== "boolean") throw new ReportError("Status aktif tidak valid."); return raw }
export function parseMasterCommand(raw: unknown): MasterCommand {
  const value = object(raw), entity = value.entity as MasterKind
  if (!["areas", "locations", "objects", "services", "officers"].includes(entity)) throw new ReportError("Jenis konfigurasi tidak valid.")
  const id = value.id === undefined ? undefined : text(value.id, "ID", 150)
  if (id && entity === "officers" && !isUuid(id)) throw new ReportError("ID petugas tidak valid.")
  const revision = id ? value.revision : undefined
  if (id && (!Number.isSafeInteger(revision) || Number(revision) < 0)) throw new ReportError("Versi konfigurasi tidak valid.")
  const name = text(value.name, "Nama")
  if (name.toLowerCase() === "lainnya") throw new ReportError("Nama Lainnya dicadangkan sebagai pilihan lokasi atau objek yang belum terdaftar.")
  let objectIds: string[] = []
  if (entity === "locations") {
    if (!Array.isArray(value.objectIds) || value.objectIds.length > 100 || value.objectIds.some((id) => typeof id !== "string" || !id || id.length > 150)) throw new ReportError("Pemetaan fasilitas tidak valid (maksimal 100 objek).")
    objectIds = [...new Set(value.objectIds as string[])]
  }
  const kind = value.kind ?? "area", sortOrder = value.sortOrder ?? 0
  if (entity === "areas" && (kind !== "floor" && kind !== "area" || !Number.isSafeInteger(sortOrder) || Number(sortOrder) < 0 || Number(sortOrder) > 999)) throw new ReportError("Jenis atau urutan area tidak valid.")
  let group: FacilityCategory | "" = ""
  if (entity === "objects") {
    const category = text(value.group, "Kategori fasilitas", 80)
    if (!isFacilityCategory(category)) throw new ReportError("Pilih kategori fasilitas dari daftar yang tersedia.")
    group = category
  }
  return { entity, id, revision: revision as number | undefined, name, isActive: active(value.isActive), kind: kind as "floor" | "area", sortOrder: Number(sortOrder), areaId: entity === "locations" ? text(value.areaId, "Area/lantai", 150) : "", group, objectIds }
}
export function parseUserCommand(raw: unknown): UserCommand {
  const value = object(raw), id = value.id as string | undefined, role = value.role as OperationalRole
  if (id !== undefined && !isUuid(id)) throw new ReportError("ID pengguna tidak valid.")
  if (!operationalRoles.includes(role)) throw new ReportError("Peran ini tidak dapat dikelola.", 403)
  const email = text(value.email, "Email", 254).toLowerCase()
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ReportError("Alamat email tidak valid.")
  // Editing profiles never resets passwords. Passwords only provision a NEW credential account.
  if (id && value.password !== undefined) throw new ReportError("Password tidak dapat diubah melalui pengaturan profil.")
  if (!id && (typeof value.password !== "string" || value.password.length < 12 || value.password.length > 128)) throw new ReportError("Password awal harus 12-128 karakter.")
  if (id && (typeof value.updatedAt !== "string" || !Number.isFinite(Date.parse(value.updatedAt)))) throw new ReportError("Versi pengguna tidak valid.")
  return { id, updatedAt: value.updatedAt as string | undefined, name: text(value.name, "Nama"), email, role, isActive: active(value.isActive), identifier: text(value.identifier, "Identitas", 80, false) || null, unit: text(value.unit, "Unit", 100, false) || null, studyProgram: text(value.studyProgram, "Program studi", 100, false) || null, ...(!id ? { password: value.password as string } : {}) }
}
export function assertUserChange(actorId: string, before: { id: string; role: string; isActive: boolean }, after: Pick<UserCommand, "role" | "isActive">, activeManagers: number) {
  if (!operationalRoles.includes(before.role as OperationalRole)) throw new ReportError("Akun ini tidak dapat dikelola.", 403)
  if (actorId === before.id && (!after.isActive || after.role !== "manajemen")) throw new ReportError("Anda tidak dapat menonaktifkan atau mengganti peran akun sendiri.", 409)
  if (before.role === "manajemen" && before.isActive && (after.role !== "manajemen" || !after.isActive) && activeManagers <= 1) throw new ReportError("Minimal satu akun Manajemen harus tetap aktif.", 409)
}
export function availableFacilities(catalog: OperationalCatalog, locationName: string) {
  const location = catalog.locations.find((row) => row.name === locationName)
  return catalog.objects.filter((row) => row.isActive && row.name !== "Lainnya" && (locationName === "Lainnya" || location?.objectIds?.includes(row.id)))
}
