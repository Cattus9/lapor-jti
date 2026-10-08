import "server-only"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { and, asc, count, eq, ilike, inArray, or, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { accounts, facilityObjects, locationAreas, locationFacilityObjects, locations, operationalAudit, securityOfficers, services, sessions, users } from "@/db/schema"
import { requireManagement } from "@/features/management/domain/management"
import { ReportError, type ReportActor } from "@/features/reports/domain/report"
import { assertUserChange, operationalRoles, parseMasterCommand, parseUserCommand, type MasterRecord, type OperationalCatalog, type UserRecord, type UsersPage } from "../domain/operations"

const userColumns = { id: users.id, name: users.name, email: users.email, role: users.role, isActive: users.isActive, identifier: users.identifier, unit: users.unit, studyProgram: users.studyProgram, updatedAt: users.updatedAt }
type UserRow = Pick<typeof users.$inferSelect, keyof typeof userColumns>
const publicUser = (row: UserRow): UserRecord => ({ id: row.id, name: row.name, email: row.email, role: row.role as UserRecord["role"], isActive: row.isActive, identifier: row.identifier, unit: row.unit, studyProgram: row.studyProgram, updatedAt: row.updatedAt.toISOString() })
type Tx = Parameters<Parameters<ReturnType<typeof getDb>["transaction"]>[0]>[0]
async function liveManager(tx: Tx, actor: ReportActor) {
  requireManagement(actor)
  const [manager] = await tx.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "manajemen"), eq(users.isActive, true))).for("share")
  if (!manager) throw new ReportError("Akun tidak memiliki akses.", 403)
  return manager
}
function translateError(error: unknown): never {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : error
  if (cause && typeof cause === "object" && "code" in cause && cause.code === "23505") throw new ReportError("Nama, email, atau identitas sudah digunakan. Gunakan nilai yang berbeda.", 409)
  throw error
}
export class OperationsRepository {
  constructor(private readonly db = getDb()) {}
  async catalog(management = false): Promise<OperationalCatalog> {
    // One read transaction gives locations and their mappings a consistent snapshot.
    return this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock_shared(748193)`)
      // A PostgreSQL transaction has one connection: run its statements sequentially.
      const areas = await tx.select().from(locationAreas).orderBy(asc(locationAreas.sortOrder), asc(locationAreas.name))
      const rooms = await tx.select().from(locations).orderBy(asc(locations.name))
      const objects = await tx.select().from(facilityObjects).orderBy(asc(facilityObjects.group), asc(facilityObjects.name))
      const serviceRows = await tx.select().from(services).orderBy(asc(services.name))
      const officers = management ? await tx.select().from(securityOfficers).orderBy(asc(securityOfficers.name)) : []
      const mapping = await tx.select().from(locationFacilityObjects)
      const mappingsByRoom = new Map<string, string[]>()
      for (const link of mapping) { const ids = mappingsByRoom.get(link.locationId) ?? []; ids.push(link.objectId); mappingsByRoom.set(link.locationId, ids) }
      const activeAreas = new Set(areas.filter((row) => row.isActive).map((row) => row.id))
      return { areas: areas.filter((row) => management || row.isActive), objects: objects.filter((row) => management || row.isActive), services: serviceRows.filter((row) => management || row.isActive), officers, locations: rooms.filter((row) => management || row.isActive && activeAreas.has(row.areaId)).map((row) => ({ ...row, objectIds: mappingsByRoom.get(row.id) ?? [] })) }
    })
  }
  async managementCatalog(actor: ReportActor) { requireManagement(actor); return this.catalog(true) }
  async saveMaster(actor: ReportActor, raw: unknown) {
    requireManagement(actor)
    const input = parseMasterCommand(raw)
    try { return await this.db.transaction(async (tx) => {
      // Serialize operational/user mutations, then recheck the live actor inside the transaction.
      await tx.execute(sql`select pg_advisory_xact_lock(748194)`)
      const manager = await liveManager(tx, actor)
      await tx.execute(sql`select pg_advisory_xact_lock(748193)`)
      const tables = { areas: locationAreas, locations, objects: facilityObjects, services, officers: securityOfficers }, table = tables[input.entity]
      const [before] = input.id ? await tx.select().from(table).where(eq(table.id, input.id)).for("update") : []
      if (input.id && !before) throw new ReportError("Konfigurasi tidak ditemukan.", 404)
      if (before && before.revision !== input.revision) throw new ReportError("Konfigurasi telah berubah. Muat ulang sebelum menyimpan.", 409)
      const id = input.id ?? randomUUID(), base = { id, name: input.name, isActive: input.isActive, revision: (before?.revision ?? -1) + 1 }
      let after: MasterRecord
      let beforeMapping: string[] | undefined
      if (input.entity === "locations") {
        const [area] = await tx.select().from(locationAreas).where(eq(locationAreas.id, input.areaId))
        if (!area || input.isActive && !area.isActive) throw new ReportError("Pilih area/lantai yang aktif.")
        const selected = input.objectIds.length ? await tx.select().from(facilityObjects).where(inArray(facilityObjects.id, input.objectIds)) : []
        beforeMapping = before ? (await tx.select().from(locationFacilityObjects).where(eq(locationFacilityObjects.locationId, id))).map((row) => row.objectId) : []
        if (selected.length !== input.objectIds.length || selected.some((row) => row.name === "Lainnya" || !row.isActive && !beforeMapping?.includes(row.id))) throw new ReportError("Pemetaan mengandung fasilitas yang tidak tersedia.")
        const values = { ...base, areaId: area.id, group: area.name }
        const [saved] = before ? await tx.update(locations).set(values).where(eq(locations.id, id)).returning() : await tx.insert(locations).values(values).returning()
        await tx.delete(locationFacilityObjects).where(eq(locationFacilityObjects.locationId, id))
        if (input.objectIds.length) await tx.insert(locationFacilityObjects).values(input.objectIds.map((objectId) => ({ locationId: id, objectId })))
        after = { ...saved, objectIds: input.objectIds }
      } else if (input.entity === "areas") {
        const values = { ...base, kind: input.kind, sortOrder: input.sortOrder }
        const [saved] = before ? await tx.update(locationAreas).set(values).where(eq(locationAreas.id, id)).returning() : await tx.insert(locationAreas).values(values).returning()
        // Keep the old grouping column consistent for existing report consumers.
        if (before && before.name !== saved.name) await tx.update(locations).set({ group: saved.name, revision: sql`${locations.revision} + 1` }).where(eq(locations.areaId, id))
        after = saved
      } else if (input.entity === "objects") {
        const values = { ...base, group: input.group }
        const [saved] = before ? await tx.update(facilityObjects).set(values).where(eq(facilityObjects.id, id)).returning() : await tx.insert(facilityObjects).values(values).returning()
        after = saved
      } else if (input.entity === "services") {
        const [saved] = before ? await tx.update(services).set(base).where(eq(services.id, id)).returning() : await tx.insert(services).values(base).returning()
        after = saved
      } else {
        const [saved] = before ? await tx.update(securityOfficers).set(base).where(eq(securityOfficers.id, id)).returning() : await tx.insert(securityOfficers).values(base).returning()
        after = saved
      }
      await tx.insert(operationalAudit).values({ actorId: manager.id, actorName: manager.name, entity: input.entity, entityId: id, action: before ? "updated" : "created", before: before ? { ...before, ...(beforeMapping ? { objectIds: beforeMapping } : {}) } : null, after })
      return { ok: true }
    }) } catch (error) { translateError(error) }
  }
  async listUsers(actor: ReportActor, query: Record<string, string>): Promise<UsersPage> {
    requireManagement(actor)
    const page = Number(query.page ?? 1), q = (query.q ?? "").trim(), role = query.role ?? "all", status = query.status ?? "all"
    if (!Number.isSafeInteger(page) || page < 1 || page > 10000 || q.length > 100 || role !== "all" && !operationalRoles.includes(role as UserRecord["role"]) || !["all", "active", "inactive"].includes(status)) throw new ReportError("Filter pengguna tidak valid.")
    const search = `%${q.replace(/[\\%_]/g, (char) => `\\${char}`)}%`
    const where = and(inArray(users.role, [...operationalRoles]), q ? or(ilike(users.name, search), ilike(users.email, search), ilike(users.identifier, search)) : undefined, role !== "all" ? eq(users.role, role as UserRecord["role"]) : undefined, status !== "all" ? eq(users.isActive, status === "active") : undefined)
    const pageSize = 12
    return this.db.transaction(async (tx) => {
      const rows = await tx.select(userColumns).from(users).where(where).orderBy(asc(users.name), asc(users.id)).limit(pageSize).offset((page - 1) * pageSize)
      const [total] = await tx.select({ value: count() }).from(users).where(where)
      return { items: rows.map(publicUser), total: total.value, page, pageSize }
    }, { isolationLevel: "repeatable read", accessMode: "read only" })
  }
  async saveUser(actor: ReportActor, raw: unknown) {
    requireManagement(actor)
    const input = parseUserCommand(raw)
    // Hash outside the transaction to avoid holding database locks during expensive crypto.
    const passwordHash = input.password ? await hashPassword(input.password) : undefined
    try { return await this.db.transaction(async (tx) => {
      await tx.execute(sql`select pg_advisory_xact_lock(748194)`)
      const manager = await liveManager(tx, actor)
      const [before] = input.id ? await tx.select(userColumns).from(users).where(eq(users.id, input.id)).for("update") : []
      if (input.id && !before) throw new ReportError("Pengguna tidak ditemukan.", 404)
      if (before && before.updatedAt.toISOString() !== input.updatedAt) throw new ReportError("Pengguna telah berubah. Muat ulang sebelum menyimpan.", 409)
      if (before) {
        const [total] = await tx.select({ value: count() }).from(users).where(and(eq(users.role, "manajemen"), eq(users.isActive, true)))
        assertUserChange(actor.id, before, input, total.value)
        if (input.email !== before.email.toLowerCase()) throw new ReportError("Email akun yang sudah dibuat tidak dapat diubah di sini.")
      }
      const { password: _password, updatedAt: _version, id: _id, ...profile } = input
      void _password; void _version; void _id
      const id = input.id ?? randomUUID()
      // Keep the edit token strictly increasing even if two writes share a clock millisecond.
      const updatedAt = new Date(Math.max(Date.now(), (before?.updatedAt.getTime() ?? 0) + 1))
      const [saved] = before ? await tx.update(users).set({ ...profile, updatedAt }).where(eq(users.id, id)).returning(userColumns) : await tx.insert(users).values({ ...profile, id }).returning(userColumns)
      if (!before) await tx.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: passwordHash! })
      if (before && (before.role !== input.role || before.isActive !== input.isActive)) await tx.delete(sessions).where(eq(sessions.userId, id))
      const after = publicUser(saved)
      await tx.insert(operationalAudit).values({ actorId: manager.id, actorName: manager.name, entity: "users", entityId: id, action: before ? "updated" : "created", before: before ? publicUser(before) : null, after })
      return { ok: true, user: after }
    }) } catch (error) { translateError(error) }
  }
}
let repository: OperationsRepository | undefined
export const getOperationsRepository = () => repository ??= new OperationsRepository()
