import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq, inArray, sql } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports, services, reportAttachments, reportDrafts, reportServiceDetails, reportStatusHistory, notifications } from "../src/db/schema"
import { ReportService } from "../src/features/reports/application/report-service"
import { emptyReportPayload, ReportError, type ReportActor } from "../src/features/reports/domain/report"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"
import { DrizzleManagementRepository } from "../src/features/management/infrastructure/drizzle-management-repository"
import { ManagementService } from "../src/features/management/application/management-service"
import { DrizzleTefaRepository } from "../src/features/tefa/infrastructure/drizzle-tefa-repository"
import { TefaService } from "../src/features/tefa/application/tefa-service"
import { OperationsRepository } from "../src/features/operations/infrastructure/operations-repository"

test("TEFA routing, stable catalog IDs, relational scopes, pagination, attachments, status/notifications and rollback on PostgreSQL", { skip: process.env.NODE_ENV !== "development" ? "Local development database required" : false }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl("application")).hostname))
  const { db, pool } = createDatabaseClient()
  const run = randomUUID(), rollback = Symbol("tefa-backend-rollback")
  const actorIds: string[] = []
  try {
    try {
      await db.transaction(async (tx) => {
        const actors = new Map<string, ReportActor>()
        for (const role of ["pelapor", "manajemen", "tefa", "inactive"] as const) {
          const id = randomUUID(); actorIds.push(id)
          await tx.insert(users).values({ id, name: `${role} ${run}`, email: `${role}-${run}@example.invalid`, role: role === "inactive" ? "tefa" : role, isActive: role !== "inactive" })
          actors.set(role, { id, role: role === "inactive" ? "tefa" : role })
        }
        const actor = actors.get("pelapor")!, manager = actors.get("manajemen")!, tefa = actors.get("tefa")!
        const database = tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0]
        const storage: AttachmentStorage = { store: async (files) => files.map((file) => ({ id: randomUUID(), name: file.name, mimeType: file.mimeType, size: file.bytes.length, storageKey: `${run}/${randomUUID()}` })), remove: async () => {}, read: async () => new TextEncoder().encode("%PDF-fixture") }
        const reporter = new ReportService(new DrizzleReportRepository(database), storage)
        const tefaRepository = new DrizzleTefaRepository(database), tefaService = new TefaService(tefaRepository, storage)
        const management = new ManagementService(new DrizzleManagementRepository(database), storage)
        const ops = new OperationsRepository(database)
        const [catalog] = await tx.select().from(services).where(eq(services.id, "service-1"))
        assert.equal(catalog.handlerRole, "tefa", "Migration maps original JTI IDs")
        const payload = { ...emptyReportPayload, category: "layanan" as const, title: `TEFA ${run}`, description: "Integration fixture", service: catalog.name, program: "TIF", location: "Loket uji", incidentTimeMode: "automatic" as const }
        const submit = (service: string, files = false) => reporter.write(actor, { id: randomUUID(), revision: 0, payload: { ...payload, service } }, files ? [{ name: "fixture.pdf", mimeType: "application/pdf", bytes: new TextEncoder().encode("%PDF-fixture") }] : [], true)
        const own = await submit(catalog.name, true), ownId = own.report!.id, ticket = own.report!.ticketNumber
        const [stored] = await tx.select().from(reports).where(eq(reports.id, ownId))
        assert.equal(stored.handlerRole, "tefa")
        const [snapshot] = await tx.select().from(reportServiceDetails).where(eq(reportServiceDetails.reportId, ownId))
        assert.equal(snapshot.serviceId, catalog.id)
        await assert.rejects(tx.transaction(async (savepoint) => { await savepoint.update(reportServiceDetails).set({ serviceId: `missing-${run}` }).where(eq(reportServiceDetails.reportId, ownId)) }), "Service FK rejects dangling catalog references")
        await assert.rejects(tx.transaction(async (savepoint) => { await savepoint.update(reports).set({ category: "lainnya" }).where(eq(reports.id, ownId)) }), "Category/handler constraint rejects TEFA handling non-service reports")
        const [incoming] = await tx.select().from(notifications).where(and(eq(notifications.reportId, ownId), eq(notifications.recipientId, tefa.id)))
        assert.ok(incoming)
        assert.equal((await tx.select().from(notifications).where(and(eq(notifications.reportId, ownId), inArray(notifications.recipientId, [manager.id, actors.get("inactive")!.id])))).length, 0)
        const foreign = await submit("Administrasi", true)
        assert.equal((await management.detail(manager, foreign.report!.ticketNumber)).report.handler, "Manajemen Jurusan")
        await assert.rejects(tefaService.detail(tefa, foreign.report!.ticketNumber), (e: unknown) => e instanceof ReportError && e.status === 404)
        assert.equal(await tefaRepository.detail(foreign.report!.ticketNumber, false), null, "A false monitoring flag cannot bypass TEFA scope")
        await assert.rejects(management.detail(manager, ticket), (e: unknown) => e instanceof ReportError && e.status === 404)
        assert.equal((await management.detail(manager, ticket, false)).report.handler, "TEFA")
        const detail = await tefaService.detail(tefa, ticket)
        assert.ok(detail.files[0].url.startsWith("/api/tefa/attachments/"))
        assert.ok((await tefaService.download(tefa, detail.files[0].id)).bytes.length)
        const [foreignFile] = await tx.select().from(reportAttachments).where(eq(reportAttachments.reportId, foreign.report!.id))
        await assert.rejects(tefaService.download(tefa, foreignFile.id), (e: unknown) => e instanceof ReportError && e.status === 404)
        const draft = await reporter.write(actor, { id: randomUUID(), revision: 0, payload }, [{ name: "draft.pdf", mimeType: "application/pdf", bytes: new TextEncoder().encode("%PDF-fixture") }], false)
        await assert.rejects(tefaService.download(tefa, draft.draft!.attachments[0].id), (e: unknown) => e instanceof ReportError && e.status === 404)
        for (let i = 0; i < 11; i++) await submit(catalog.name)
        const allIds = (await tx.select({ id: reports.id }).from(reports).where(and(eq(reports.reporterId, actor.id), eq(reports.handlerRole, "tefa")))).map((row) => row.id)
        await tx.update(reports).set({ submittedAt: new Date("2026-10-01T01:00:00Z") }).where(inArray(reports.id, allIds))
        const first = await tefaService.list(tefa, { q: run, serviceId: catalog.id }), second = await tefaService.list(tefa, { q: run, serviceId: catalog.id, cursor: first.nextCursor })
        assert.equal(first.items.length, 6); assert.equal(second.items.length, 6)
        assert.equal(new Set([...first.items, ...second.items].map((row) => row.id)).size, 12)
        assert.equal((await tefaService.list(tefa, { q: `%_${run}` })).total, 0)
        await assert.rejects(tefaService.execute(actors.get("inactive")!, { ticket, status: "diproses" }), (e: unknown) => e instanceof ReportError && e.status === 403)
        await assert.rejects(tefaService.execute(tefa, { ticket: foreign.report!.ticketNumber, status: "diproses" }), ReportError)
        await tefaService.execute(tefa, { ticket, status: "diproses", actorId: manager.id })
        await assert.rejects(tefaService.execute(tefa, { ticket, status: "diproses" }), (e: unknown) => e instanceof ReportError && e.status === 409)
        await assert.rejects(tefaService.execute(tefa, { ticket, status: "selesai", note: " " }), ReportError)
        await tefaService.execute(tefa, { ticket, status: "selesai", note: "Layanan sudah pulih." })
        const [complete] = await tx.select().from(reports).where(eq(reports.id, ownId))
        assert.ok(complete.completedAt)
        const history = await tx.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, ownId))
        assert.equal(history.length, 3)
        assert.equal(history.filter((row) => row.actorId === tefa.id).length, 2)
        assert.equal((await tefaService.list(tefa, { q: run, view: "history" })).total, 1)
        assert.equal((await reporter.detail(actor, ownId)).history?.length, 3)
        const ownNotifications = await tefaService.notifications(tefa)
        assert.ok(ownNotifications.items.some((row) => row.id === incoming.id))
        await tx.insert(notifications).values({ recipientId: tefa.id, reportId: foreign.report!.id, kind: "status", title: "Old role fixture", description: "Should be hidden" })
        assert.ok(!(await tefaService.notifications(tefa)).items.some((row) => row.title === "Old role fixture"))
        await tefaService.markRead(tefa, incoming.id)
        assert.ok((await tx.select().from(notifications).where(eq(notifications.id, incoming.id)))[0].readAt)
        await ops.saveMaster(manager, { entity: "services", name: `Custom ${run}`, handlerRole: "tefa", isActive: true })
        const [custom] = await tx.select().from(services).where(eq(services.name, `Custom ${run}`))
        assert.ok(custom)
        const customReport = await submit(custom.name)
        await ops.saveMaster(manager, { entity: "services", id: custom.id, revision: custom.revision, name: `Renamed ${run}`, isActive: true })
        const [renamed] = await tx.select().from(services).where(eq(services.id, custom.id))
        assert.equal(renamed.handlerRole, "tefa", "Rename without target preserves target")
        await ops.saveMaster(manager, { entity: "services", id: custom.id, revision: renamed.revision, name: renamed.name, isActive: true, handlerRole: "manajemen" })
        assert.equal((await tefaService.detail(tefa, customReport.report!.ticketNumber)).report.handler, "TEFA", "Historical owner is immutable")
        const newOwner = await submit(renamed.name)
        assert.equal((await management.detail(manager, newOwner.report!.ticketNumber)).report.handler, "Manajemen Jurusan")
        const statistics = await management.statistics(manager, { q: run })
        assert.equal(statistics.handlers.find((row) => row.handler === "tefa")?.total, 13)
        const indexes = await tx.execute(sql`select indexname from pg_indexes where schemaname = 'public' and indexname in ('reports_handler_status_date_idx','reports_handler_date_idx','report_service_details_service_report_idx','services_handler_active_idx','notifications_recipient_date_idx')`)
        assert.equal(indexes.rows.length, 5)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.equal((await db.select().from(users).where(inArray(users.id, actorIds))).length, 0)
    assert.equal((await db.select().from(reportDrafts).where(inArray(reportDrafts.reporterId, actorIds))).length, 0)
  } finally { await pool.end() }
})
