import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { reports, reportDrafts, services, users } from "../src/db/schema"
import { ReportService } from "../src/features/reports/application/report-service"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"
import { emptyReportPayload } from "../src/features/reports/domain/report"
import { getReportFormCategory } from "../src/features/reports/domain/report-form-category"

test("PostgreSQL: independent service draft slots, legacy custom TEFA resume, catalog routing and mismatched-audience rollback", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient(), owner = randomUUID(), foreign = randomUUID(), rollback = Symbol("service-audience-rollback")
  try {
    try {
      await db.transaction(async tx => {
        await tx.insert(users).values([owner, foreign].map(id => ({ id, email: `${id}@example.invalid`, name: "Service audience fixture", role: "pelapor" as const })))
        const tefaName = `Custom service ${randomUUID()}`, opsName = `JTI operational ${randomUUID()}`
        await tx.insert(services).values([{ id: randomUUID(), name: tefaName, handlerRole: "tefa" }, { id: randomUUID(), name: opsName, handlerRole: "manajemen" }])
        const repo = new DrizzleReportRepository(tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0])
        const app = new ReportService(repo, { store: async () => [], remove: async () => {}, read: async () => new Uint8Array() })
        const actor = { id: owner, role: "pelapor" }
        const base = { ...emptyReportPayload, category: "layanan" as const, title: "Fixture", description: "Temporary draft", location: "Loket", program: "TIF", incidentTimeMode: "automatic" as const }
        const tefaId = randomUUID(), opsId = randomUUID()
        const tefa = await app.write(actor, { id: tefaId, revision: 0, payload: { ...base, service: tefaName, serviceAudience: "tefa" } }, [], false)
        const ops = await app.write(actor, { id: opsId, revision: 0, payload: { ...base, service: opsName, serviceAudience: "operasional" } }, [], false)
        const resumed = await app.categoryDrafts(actor)
        assert.equal(resumed.length, 2)
        assert.equal(resumed.find(row => getReportFormCategory(row.payload) === "tefa")?.id, tefaId)
        assert.equal(resumed.find(row => getReportFormCategory(row.payload) === "layanan")?.id, opsId)
        assert.deepEqual(await app.categoryDrafts({ id: foreign, role: "pelapor" }), [])
        const legacyId = randomUUID()
        await tx.insert(reportDrafts).values({ id: legacyId, reporterId: owner, payload: { ...base, service: tefaName }, updatedAt: new Date("2400-01-01") })
        const legacy = await app.draft(actor, legacyId)
        assert.equal(legacy.payload.serviceAudience, "tefa", "Custom legacy service grouping comes from catalog metadata")
        assert.equal((await app.categoryDrafts(actor)).find(row => getReportFormCategory(row.payload) === "tefa")?.id, legacyId)
        const submitted = await app.write(actor, { id: tefaId, revision: tefa.draft!.revision, payload: tefa.draft!.payload }, [], true)
        const [row] = await tx.select().from(reports).where(eq(reports.id, submitted.report!.id))
        assert.equal(row.handlerRole, "tefa")
        assert.equal(row.category, "layanan")
        const opsSubmitted = await app.write(actor, { id: opsId, revision: ops.draft!.revision, payload: ops.draft!.payload }, [], true)
        assert.equal((await tx.select().from(reports).where(eq(reports.id, opsSubmitted.report!.id)))[0].handlerRole, "manajemen")
        const forgedId = randomUUID()
        await assert.rejects(app.write(actor, { id: forgedId, revision: 0, payload: { ...base, service: opsName, serviceAudience: "tefa" } }, [], true), /tidak sesuai/)
        assert.deepEqual(await tx.select().from(reportDrafts).where(eq(reportDrafts.id, forgedId)), [], "Rejected submission must roll back its provisional draft")
        await app.write(actor, { id: legacyId, revision: 0, payload: { ...emptyReportPayload, category: "layanan", serviceAudience: "tefa" } }, [], false)
        assert.equal(await repo.draft(owner, legacyId), null)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.deepEqual(await db.select({ id: users.id }).from(users).where(eq(users.id, owner)), [])
  } finally { await pool.end() }
})
