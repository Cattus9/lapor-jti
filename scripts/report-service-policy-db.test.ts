import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import test from "node:test"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports, reportServiceDetails, services } from "../src/db/schema"
import { ReportService } from "../src/features/reports/application/report-service"
import { emptyReportPayload, ReportError, type ReportActor } from "../src/features/reports/domain/report"
import { getReportServicePolicy } from "../src/features/reports/domain/service-policy"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"

test("Service program policy persists drafts/submissions, retains legacy snapshots and keeps retries idempotent", {
  skip: process.env.NODE_ENV !== "development" ? "Requires explicit NODE_ENV=development and local PostgreSQL" : false,
}, async () => {
  const target = new URL(getDatabaseUrl())
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(target.hostname), "Only local development PostgreSQL is allowed")
  const { pool, db } = createDatabaseClient()
  const actorId = randomUUID()
  const rollback = Symbol("service-policy-test-rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        // Read catalog references only; never rename/reactivate another user's master data.
        const active = await tx.select().from(services).where(eq(services.isActive, true))
        const jti = active.find((row) => getReportServicePolicy(row.name).group === "jti")
        const operational = active.find((row) => row.name === "Administrasi")
        const fieldServices = active.filter((row) => ["Keamanan", "Kebersihan"].includes(row.name))
        assert.ok(jti && operational && fieldServices.length === 2, "Test requires active JTI, Administration, Security and Cleaning services")
        await tx.insert(users).values({ id: actorId, name: "Service Policy Test", email: `service-policy-${actorId}@example.invalid`, role: "pelapor", isActive: true })
        const actor: ReportActor = { id: actorId, role: "pelapor" }
        // The repository supports nested transactions at runtime. Keep all fixture work
        // on this transaction; never fall back to getDb() or a second pool for writes.
        const repository = new DrizzleReportRepository(tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0])
        const service = new ReportService(repository, { store: async () => [], remove: async () => {}, read: async () => new Uint8Array() })
        const payload = { ...emptyReportPayload, category: "layanan" as const, service: jti.name, program: "TKK", title: "Service policy fixture", description: "Temporary integration fixture", location: "Portal JTI", incidentTimeMode: "automatic" as const }
        const draftId = randomUUID()
        const saved = await service.write(actor, { id: draftId, revision: 0, payload }, [], false)
        assert.equal(saved.draft?.payload.program, "")
        assert.equal(saved.draft?.payload.location, "")
        assert.equal((await service.draft(actor, draftId)).payload.program, "")
        const request = { id: draftId, revision: saved.draft!.revision, payload }
        const submitted = await service.write(actor, request, [], true)
        const reportId = submitted.report!.id
        const [detail] = await tx.select().from(reportServiceDetails).where(eq(reportServiceDetails.reportId, reportId))
        assert.equal(detail.program, "")
        const [core] = await tx.select().from(reports).where(eq(reports.id, reportId))
        assert.equal(core.handlerRole, jti.handlerRole)
        assert.equal(core.locationText, "")
        assert.ok(!(await service.detail(actor, reportId)).detail.fields.some((field) => field.label === "Unit atau program studi"))
        const retry = await service.write(actor, request, [], true)
        assert.equal(retry.report?.id, reportId)
        await assert.rejects(service.write(actor, { id: randomUUID(), revision: 0, payload: { ...payload, service: operational.name, program: "" } }, [], true), ReportError)
        const administrationDraftId = randomUUID()
        const administrationPayload = { ...payload, service: operational.name, program: "TKK", location: "Loket lama" }
        const administrationDraft = await service.write(actor, { id: administrationDraftId, revision: 0, payload: administrationPayload }, [], false)
        assert.equal((await service.draft(actor, administrationDraftId)).payload.location, "")
        const operationalResult = await service.write(actor, { id: administrationDraftId, revision: administrationDraft.draft!.revision, payload: administrationPayload }, [], true)
        const [operationalDetail] = await tx.select().from(reportServiceDetails).where(eq(reportServiceDetails.reportId, operationalResult.report!.id))
        assert.equal(operationalDetail.program, "TKK")
        const [operationalCore] = await tx.select().from(reports).where(eq(reports.id, operationalResult.report!.id))
        assert.equal(operationalCore.locationText, "")
        await tx.update(reports).set({ locationText: "Loket lama" }).where(eq(reports.id, operationalResult.report!.id))
        assert.equal((await service.detail(actor, operationalResult.report!.id)).detail.location, "Loket lama", "Old Administration snapshots remain readable")
        for (const fieldService of fieldServices) {
          await assert.rejects(service.write(actor, { id: randomUUID(), revision: 0, payload: { ...payload, service: fieldService.name, program: "", location: "" } }, [], true), ReportError)
          const fieldResult = await service.write(actor, { id: randomUUID(), revision: 0, payload: { ...payload, service: fieldService.name, program: "TKK", location: "Koridor lantai 2" } }, [], true)
          const [fieldDetail] = await tx.select().from(reportServiceDetails).where(eq(reportServiceDetails.reportId, fieldResult.report!.id))
          const [fieldCore] = await tx.select().from(reports).where(eq(reports.id, fieldResult.report!.id))
          assert.equal(fieldDetail.program, "")
          assert.equal(fieldCore.locationText, "Koridor lantai 2")
        }
        // Emulate an old JTI snapshot on our own fixture only; reads must retain it.
        await tx.update(reportServiceDetails).set({ program: "TIF" }).where(eq(reportServiceDetails.reportId, reportId))
        await tx.update(reports).set({ locationText: "Portal lama" }).where(eq(reports.id, reportId))
        assert.equal((await service.detail(actor, reportId)).detail.fields.find((field) => field.label === "Unit atau program studi")?.value, "TIF")
        assert.equal((await service.detail(actor, reportId)).detail.location, "Portal lama")
        throw rollback
      })
    } catch (error) {
      if (error !== rollback) throw error
    }
    assert.equal((await db.select({ id: users.id }).from(users).where(eq(users.id, actorId))).length, 0, "Successful assertions must also roll back")
    assert.equal((await db.select({ id: reports.id }).from(reports).where(eq(reports.reporterId, actorId))).length, 0)
  } finally {
    await pool.end()
  }
})
