import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { verifyPassword } from "better-auth/crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { accounts, facilityObjects, locationAreas, locationFacilityObjects, locations, notifications, operationalAudit, reportDrafts, reportFacilityObjects, reportStatusHistory, reports, services, sessions, users } from "../src/db/schema"
import { OperationsRepository } from "../src/features/operations/infrastructure/operations-repository"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"
import { ReportService } from "../src/features/reports/application/report-service"
import { emptyReportPayload, ReportError } from "../src/features/reports/domain/report"
import { getTodayInWib } from "../src/features/reports/domain/report-date"
import { parseMasterCommand } from "../src/features/operations/domain/operations"

// Direct backend tests only. Exact disposable IDs; never delete existing users/catalogs/reports.
async function main() {
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl("migration")).hostname)) throw new Error("Operations DB smoke requires local development PostgreSQL.")
  const { db, pool } = createDatabaseClient("migration"), repo = new OperationsRepository(db)
  const tag = randomUUID(), managerId = randomUUID(), reporterId = randomUUID(), areaId = randomUUID(), roomId = randomUUID(), lampId = randomUUID(), sinkId = randomUUID(), serviceId = randomUUID()
  const fixtureUsers: string[] = [managerId, reporterId], reportIds: string[] = [], draftIds: string[] = []
  const actor = { id: managerId, role: "manajemen" }, reporter = { id: reporterId, role: "pelapor" }
  const reportService = new ReportService(new DrizzleReportRepository(db), { store: async () => [], remove: async () => {}, read: async () => new Uint8Array() })
  const payload = { ...emptyReportPayload, category: "fasilitas" as const, title: "Lampu uji", description: "Pengujian pemetaan lokasi.", incidentDate: getTodayInWib(), incidentTime: "09:00", location: `Lab ${tag}`, facilities: [`Lampu ${tag}`] }
  async function write(facilities = payload.facilities, submit = true) {
    const id = randomUUID(); draftIds.push(id)
    const result = await reportService.write(reporter, { id, revision: 0, retainedAttachmentIds: [], payload: { ...payload, facilities } }, [], submit)
    if (result.report) reportIds.push(result.report.id)
    return result
  }
  try {
    await db.insert(users).values([{ id: managerId, name: `Manager ${tag}`, email: `${managerId}@example.test`, role: "manajemen" }, { id: reporterId, name: `Reporter ${tag}`, email: `${reporterId}@example.test`, role: "pelapor" }])
    await db.insert(locationAreas).values({ id: areaId, name: `Area ${tag}`, kind: "floor" })
    await db.insert(locations).values({ id: roomId, name: payload.location, areaId, group: `Area ${tag}` })
    await db.insert(facilityObjects).values([{ id: lampId, name: payload.facilities[0], group: "Perangkat" }, { id: sinkId, name: `Sink ${tag}`, group: "Sanitasi" }])
    await db.insert(services).values({ id: serviceId, name: `Service ${tag}` })
    await repo.saveMaster(actor, { entity: "locations", id: roomId, revision: 0, name: payload.location, isActive: true, areaId, objectIds: [lampId] })
    assert.equal((await repo.catalog()).officers.length, 0)
    assert.deepEqual((await repo.catalog()).locations.find((row) => row.id === roomId)?.objectIds, [lampId])
    await assert.rejects(() => repo.saveMaster(reporter, { entity: "services", name: "Unauthorized", isActive: true }), (error: unknown) => error instanceof ReportError && error.status === 403)
    await assert.rejects(() => repo.saveMaster({ ...reporter, role: "manajemen" }, { entity: "services", name: "Spoof", isActive: true }), (error: unknown) => error instanceof ReportError && error.status === 403)
    await assert.rejects(() => write([`Sink ${tag}`]), /tidak terdaftar/)
    await write()
    await assert.rejects(() => repo.saveMaster(actor, { entity: "objects", id: lampId, revision: 0, name: `Renamed ${tag}`, group: "Kategori bebas", isActive: true }), /Pilih kategori fasilitas/)
    await repo.saveMaster(actor, { entity: "objects", id: lampId, revision: 0, name: `Renamed ${tag}`, group: "Perangkat", isActive: true })
    const [snapshot] = await db.select().from(reportFacilityObjects).where(eq(reportFacilityObjects.reportId, reportIds[0]))
    assert.equal(snapshot.objectText, payload.facilities[0], "Historical name is preserved")
    await assert.rejects(() => write(), /tidak tersedia/)
    const staleDraft = await write(payload.facilities, false); assert.ok(staleDraft.draft, "Catalog changes do not prevent draft saves")
    payload.facilities = [`Renamed ${tag}`]
    await repo.saveMaster(actor, { entity: "areas", id: areaId, revision: 0, name: `Area ${tag}`, kind: "floor", isActive: false, sortOrder: 1 })
    assert.equal((await repo.catalog()).locations.some((row) => row.id === roomId), false)
    await assert.rejects(() => write(), /Area\/lantai/)
    await repo.saveMaster(actor, { entity: "areas", id: areaId, revision: 1, name: `Area ${tag}`, kind: "floor", isActive: true, sortOrder: 1 })
    const roomCommand = parseMasterCommand({ entity: "locations", id: roomId, revision: 1, name: payload.location, areaId, isActive: true, objectIds: [sinkId] })
    const races = await Promise.allSettled([repo.saveMaster(actor, roomCommand), repo.saveMaster(actor, { ...roomCommand, objectIds: [lampId] })])
    assert.equal(races.filter((row) => row.status === "fulfilled").length, 1, "One concurrent mapping edit wins")
    const created = await repo.saveUser(actor, { name: `New ${tag}`, email: `created-${tag}@example.test`, role: "teknisi", isActive: true, password: `Unique-${tag}` })
    fixtureUsers.push(created.user.id)
    const [credential] = await db.select().from(accounts).where(eq(accounts.userId, created.user.id))
    assert.equal(await verifyPassword({ hash: credential.password!, password: `Unique-${tag}` }), true)
    assert.notEqual(credential.password, `Unique-${tag}`)
    await db.insert(sessions).values({ userId: created.user.id, token: randomUUID(), expiresAt: new Date(Date.now() + 60000) })
    const changed = await repo.saveUser(actor, { ...created.user, role: "satpam" })
    assert.equal((await db.select().from(sessions).where(eq(sessions.userId, created.user.id))).length, 0, "Access changes revoke sessions")
    await assert.rejects(() => repo.saveUser(actor, { ...created.user, name: "Stale" }), /telah berubah/)
    await assert.rejects(() => repo.saveUser(actor, { ...changed.user, email: "different@example.test" }), /Email akun/)
    await repo.saveUser(actor, { ...changed.user, isActive: false })
    const self = (await repo.listUsers(actor, { q: managerId })).items[0]
    await assert.rejects(() => repo.saveUser(actor, { ...self, isActive: false }), /akun sendiri/)
    const audit = await db.select().from(operationalAudit).where(eq(operationalAudit.actorId, actor.id))
    assert.ok(audit.length >= 8)
    assert.equal(JSON.stringify(audit).includes(`Unique-${tag}`), false)
    assert.equal(JSON.stringify(audit).includes(credential.password!), false)
    assert.equal((await repo.listUsers(actor, { q: `created-${tag}`, status: "inactive" })).total, 1)
    console.log("PASS: permissions, live actor, area/mapping filters, unmapped rejection, historical snapshots, stale drafts, optimistic concurrency, Better Auth password verification, session revocation, user guards and credential-free audit.")
  } finally {
    await db.transaction(async (tx) => {
      await tx.delete(operationalAudit).where(inArray(operationalAudit.actorId, fixtureUsers))
      if (reportIds.length) { await tx.delete(notifications).where(inArray(notifications.reportId, reportIds)); await tx.delete(reportStatusHistory).where(inArray(reportStatusHistory.reportId, reportIds)); await tx.delete(reportFacilityObjects).where(inArray(reportFacilityObjects.reportId, reportIds)); await tx.update(reportDrafts).set({ submittedReportId: null }).where(inArray(reportDrafts.id, draftIds)); await tx.delete(reports).where(inArray(reports.id, reportIds)) }
      if (draftIds.length) await tx.delete(reportDrafts).where(and(inArray(reportDrafts.id, draftIds), eq(reportDrafts.reporterId, reporterId)))
      await tx.delete(locationFacilityObjects).where(eq(locationFacilityObjects.locationId, roomId))
      await tx.delete(locations).where(eq(locations.id, roomId)); await tx.delete(locationAreas).where(eq(locationAreas.id, areaId))
      await tx.delete(facilityObjects).where(inArray(facilityObjects.id, [lampId, sinkId])); await tx.delete(services).where(eq(services.id, serviceId))
      await tx.delete(users).where(inArray(users.id, fixtureUsers))
    })
    await pool.end()
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Operations DB smoke failed"); process.exitCode = 1 })
