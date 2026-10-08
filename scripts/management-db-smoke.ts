import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports, reportDrafts, reportAttachments, reportFacilityObjects, reportOtherDetails, reportStatusHistory, notifications, locations, facilityObjects, services } from "../src/db/schema"
import { DrizzleManagementRepository } from "../src/features/management/infrastructure/drizzle-management-repository"
import { ManagementService } from "../src/features/management/application/management-service"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"
import { ReportService } from "../src/features/reports/application/report-service"
import { emptyReportPayload, ReportError } from "../src/features/reports/domain/report"
import { parseManagementFilter } from "../src/features/management/domain/management"
import { getTodayInWib } from "../src/features/reports/domain/report-date"
import type { AttachmentStorage } from "../src/features/reports/application/ports"

// Direct backend/SQL integration, not browser automation or a UI preview server.
// Only development + loopback; delete only exact disposable IDs belonging to this run.
async function main() {
  if (process.env.NODE_ENV !== "development" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl("migration")).hostname)) throw new Error("Run Management DB smoke only against local development PostgreSQL.")
  const { db, pool } = createDatabaseClient("migration")
  const userIds: string[] = [], reportIds: string[] = [], draftIds: string[] = []
  const tag = randomUUID(), today = getTodayInWib()
  let storageReads = 0
  const storage: AttachmentStorage = { store: async () => [], remove: async () => {}, read: async () => { storageReads++; return new Uint8Array([1]) } }
  const repository = new DrizzleManagementRepository(db), service = new ManagementService(repository, storage)
  const reporterService = new ReportService(new DrizzleReportRepository(db), storage)
  try {
    for (const role of ["pelapor", "manajemen", "manajemen", "teknisi", "manajemen"] as const) {
      const id = randomUUID(); userIds.push(id)
      await db.insert(users).values({ id, email: `management-smoke-${id}@example.test`, name: `Petugas uji ${role}`, unit: "Unit pengujian", role, isActive: userIds.length !== 5 })
    }
    const actor = { id: userIds[1], role: "manajemen" }, otherActor = { id: userIds[2], role: "manajemen" }, reporter = { id: userIds[0], role: "pelapor" }
    const [masterService] = await db.select().from(services).where(eq(services.isActive, true)).limit(1)
    const [masterRoom] = await db.select().from(locations).where(eq(locations.isActive, true)).limit(1)
    const objects = await db.select().from(facilityObjects).where(eq(facilityObjects.isActive, true)).limit(2)
    assert.ok(masterService && masterRoom && objects.length === 2, "Existing service, location and two objects required; this test does not seed catalogs.")
    async function submit(category: "layanan" | "lainnya") {
      const id = randomUUID(); draftIds.push(id)
      const result = await reporterService.write(reporter, { id, revision: 0, retainedAttachmentIds: [], payload: { ...emptyReportPayload, category, title: `${category} ${tag}`, description: "Laporan uji sementara.", location: "Portal pengujian", incidentDate: today, incidentTime: "09:00", service: masterService.name, program: "Program pengujian", otherCategory: "Konteks pengujian" } }, [], true)
      assert.ok(result.report); reportIds.push(result.report.id)
      const recipients = await db.select().from(notifications).where(and(eq(notifications.reportId, result.report.id), inArray(notifications.recipientId, userIds)))
      assert.deepEqual(recipients.map((r) => r.recipientId).sort(), userIds.slice(0, 3).sort(), "Pelapor and both active Management accounts receive incoming notices, not inactive/other-role accounts")
      return result.report
    }
    const owned = await submit("layanan"), rejected = await submit("lainnya")
    const detail = await service.detail(actor, owned.ticketNumber)
    assert.equal(detail.report.reporterUnit, "Unit pengujian"); assert.equal(detail.report.program, "Program pengujian"); assert.equal(detail.report.service, masterService.name); assert.equal(detail.history.length, 1)
    await assert.rejects(service.execute(actor, { ticket: owned.ticketNumber, status: "selesai", note: "Tidak boleh lompat." }), (e: unknown) => e instanceof ReportError && e.status === 409)
    const race = await Promise.allSettled([service.execute(actor, { ticket: owned.ticketNumber, status: "diproses", actorId: "spoof" }), service.execute(otherActor, { ticket: owned.ticketNumber, status: "diproses", actorName: "spoof" })])
    assert.equal(race.filter((r) => r.status === "fulfilled").length, 1)
    assert.ok(race.some((r) => r.status === "rejected" && r.reason instanceof ReportError && r.reason.status === 409))
    const history = await db.select().from(reportStatusHistory).where(and(eq(reportStatusHistory.reportId, owned.id), eq(reportStatusHistory.toStatus, "diproses")))
    assert.equal(history.length, 1); assert.ok(userIds.slice(1, 3).includes(history[0].actorId)); assert.equal(history[0].actorName, "Petugas uji manajemen")
    await assert.rejects(service.execute(actor, { ticket: owned.ticketNumber, status: "selesai", note: " " }), ReportError)
    await service.execute(actor, { ticket: owned.ticketNumber, status: "selesai", note: "Respons akhir sudah disampaikan." })
    await service.execute(actor, { ticket: rejected.ticketNumber, status: "ditolak", note: "Di luar cakupan layanan." })
    const [closed] = await db.select().from(reports).where(eq(reports.id, owned.id)); assert.ok(closed.completedAt); assert.equal(closed.status, "selesai")
    assert.ok((await service.detail(actor, owned.ticketNumber)).history.some((r) => r.note === "Respons akhir sudah disampaikan."))
    const reporterInbox = await reporterService.notifications(reporter)
    assert.ok(reporterInbox.items.some((r) => r.ticketNumber === owned.ticketNumber && r.description.includes("Respons akhir")))
    await assert.rejects(service.execute({ id: userIds[3], role: "manajemen" }, { ticket: owned.ticketNumber, status: "diproses" }), (e: unknown) => e instanceof ReportError && e.status === 403)
    console.log("PASS: incoming role notifications, sequential lifecycle, concurrent one-winner conflict, server actor, completion/rejection notes and Pelapor notification")

    const timestamp = new Date(), dateYesterday = new Date(timestamp.getTime() - 86400000), oldDate = new Date(timestamp.getTime() - 40 * 86400000)
    const rows = Array.from({ length: 25 }, (_, index) => ({ id: randomUUID(), ticketNumber: `LJ-2098-${randomInt(100000000000, 999999999999)}`, submissionKey: randomUUID(), reporterId: userIds[0], category: "lainnya" as const, handlerRole: "manajemen" as const, title: `Page ${tag} ${index === 0 ? "%_" : index}`, description: "Pagination fixture.", incidentDate: today, incidentTime: "09:00", locationText: "Lokasi uji", submittedAt: timestamp }))
    reportIds.push(...rows.map((r) => r.id)); await db.insert(reports).values(rows); await db.insert(reportOtherDetails).values(rows.map((r) => ({ reportId: r.id, categoryText: "Pengujian halaman" })))
    for (const sort of ["terbaru", "terlama"]) {
      const first = await service.list(actor, { q: `Page ${tag}`, sort }); assert.equal(first.items.length, 20); assert.equal(first.total, 25); assert.ok(first.nextCursor)
      const second = await service.list(actor, { q: `Page ${tag}`, sort, cursor: first.nextCursor }); assert.equal(second.items.length, 5); assert.equal(second.nextCursor, null)
      const ids = [...first.items, ...second.items].map((r) => r.id); assert.equal(new Set(ids).size, 25)
      assert.deepEqual(ids, rows.map((r) => r.id).sort().map((id, i, sorted) => sort === "terlama" ? id : sorted[sorted.length - 1 - i]))
      assert.equal(first.categoryCounts.lainnya, 25); assert.equal(first.handlerCounts.manajemen, 25)
    }
    assert.equal((await service.list(actor, { q: `Page ${tag} %_` })).total, 1)
    for (const cursor of ["bad", "%%%", Buffer.from(`${timestamp.toISOString()}|${rows[0].id}|extra`).toString("base64url")]) await assert.rejects(service.list(actor, { cursor }), ReportError)
    const csv = await service.export(actor, { q: `Page ${tag}` }); assert.equal(csv.split("\r\n").length, 26, "Export includes all pages")
    console.log("PASS: ASC/DESC keyset pagination with timestamp ties, full SQL counts, escaped literal search and export beyond one UI page")

    const facilityRows = [timestamp, oldDate, dateYesterday].map((date, index) => ({ id: randomUUID(), ticketNumber: `LJ-2098-${randomInt(100000000000, 999999999999)}`, submissionKey: randomUUID(), reporterId: userIds[0], category: "fasilitas" as const, handlerRole: "teknisi" as const, title: `Facility ${tag} ${index}`, description: "Multi-object fixture.", incidentDate: today, incidentTime: "09:00", locationId: masterRoom.id, locationText: masterRoom.name, submittedAt: date, status: index === 1 ? "selesai" as const : index === 2 ? "ditolak" as const : "baru" as const, completedAt: index === 1 ? timestamp : null }))
    reportIds.push(...facilityRows.map((r) => r.id)); await db.insert(reports).values(facilityRows)
    await db.insert(reportFacilityObjects).values(facilityRows.flatMap((r) => objects.map((object) => ({ reportId: r.id, objectId: object.id, objectText: object.name }))))
    await assert.rejects(service.detail(actor, facilityRows[0].ticketNumber), (e: unknown) => e instanceof ReportError && e.status === 404)
    await assert.rejects(service.execute(actor, { ticket: facilityRows[0].ticketNumber, status: "diproses" }), (e: unknown) => e instanceof ReportError && e.status === 404)
    assert.equal((await service.detail(actor, facilityRows[0].ticketNumber, false)).report.handler, "Teknisi")
    const monitoring = await service.list(actor, { q: tag }, false); assert.equal(monitoring.total, 30); assert.equal(monitoring.handlerCounts.teknisi, 3); assert.equal(monitoring.handlerCounts.manajemen, 27)
    assert.equal((await service.list(actor, { q: tag })).total, 27)
    assert.equal((await service.list(actor, { q: tag, status: "belum-selesai" })).total, 25)
    const statistics = await service.statistics(actor, { q: `Facility ${tag}` })
    assert.equal(statistics.total, 3); assert.equal(statistics.rejected, 1); assert.equal(statistics.completed, 1)
    assert.equal(statistics.rooms[0].activeReports, 1); assert.equal(statistics.rooms[0].completedReports, 1); assert.equal(statistics.rooms[0].totalReports, 3)
    assert.deepEqual(statistics.rooms[0].facilities.map((r) => r.activeReports), [1, 1], "Two object mentions remain one active report")
    assert.deepEqual(statistics.rooms[0].facilities.map((r) => r.totalReports), [3, 3], "Historical objects include active, completed and rejected reports without multiplying room tickets")
    const closedOnly = await service.statistics(actor, { q: `Facility ${tag} 1` })
    assert.equal(closedOnly.rooms.length, 1, "A completed-only room remains in historical priority")
    assert.equal(closedOnly.rooms[0].totalReports, 1); assert.equal(closedOnly.rooms[0].activeReports, 0); assert.equal(closedOnly.rooms[0].completedReports, 1)
    assert.deepEqual(closedOnly.rooms[0].facilities.map((r) => r.totalReports), [1, 1])
    assert.deepEqual(closedOnly.rooms[0].facilities.map((r) => r.activeReports), [0, 0])
    assert.equal(statistics.handlers.find((r) => r.handler === "teknisi")?.active, 1)
    const daily = await service.statistics(actor, { q: `Facility ${tag}`, period: "hari-ini" }); assert.equal(daily.total, 1); assert.equal(daily.completed, 0); assert.equal(daily.trend.reduce((n, r) => n + r.completed, 0), 1, "An older incoming report may finish today")
    assert.equal(daily.rooms[0].totalReports, 1)
    assert.deepEqual(daily.rooms[0].facilities.map((r) => r.totalReports), [1, 1], "Historical objects follow the same WIB submission-date period as room totals")
    await db.update(reports).set({ submittedAt: oldDate }).where(eq(reports.id, owned.id))
    assert.equal((await service.list(actor, { q: `layanan ${tag}`, status: "selesai", period: "hari-ini" })).total, 0)
    assert.equal((await service.list(actor, { q: `layanan ${tag}`, status: "selesai", period: "hari-ini", date: "completed" })).total, 1, "Completed-month KPI links follow actual completion dates, not submission dates")
    const grouped = await service.statistics(actor, { q: tag, period: "rentang", from: "2025-01-01", to: today }); assert.equal(grouped.granularity, "month"); assert.ok(grouped.trend.length <= 120)
    console.log("PASS: read-only cross-role monitoring, unique multi-object aggregation, terminal exclusions, WIB event-date trends and bounded monthly analytics")

    const draftId = randomUUID(); draftIds.push(draftId)
    await db.insert(reportDrafts).values({ id: draftId, reporterId: userIds[0], payload: emptyReportPayload })
    const draftFileId = randomUUID(), reportFileId = randomUUID()
    await db.insert(reportAttachments).values([{ id: draftFileId, ownerId: userIds[0], draftId, name: "draft.pdf", mimeType: "application/pdf", size: 1, storageKey: randomUUID() }, { id: reportFileId, ownerId: userIds[0], reportId: facilityRows[0].id, name: "submitted.pdf", mimeType: "application/pdf", size: 1, storageKey: randomUUID() }])
    await assert.rejects(service.download(actor, draftFileId), (e: unknown) => e instanceof ReportError && e.status === 404); assert.equal(storageReads, 0)
    await service.download(actor, reportFileId); assert.equal(storageReads, 1)
    const inbox = await service.notifications(actor), otherInbox = await service.notifications(otherActor)
    assert.ok(inbox.items.length && otherInbox.items.length)
    await service.markRead(actor, otherInbox.items[0].id)
    const [foreign] = await db.select().from(notifications).where(eq(notifications.id, otherInbox.items[0].id)); assert.equal(foreign.readAt, null)
    await service.markRead(actor, inbox.items[0].id)
    const [read] = await db.select().from(notifications).where(eq(notifications.id, inbox.items[0].id)); assert.ok(read.readAt)
    await db.update(users).set({ isActive: false }).where(eq(users.id, userIds[2]))
    await assert.rejects(service.execute(otherActor, { ticket: rows[0].ticketNumber, status: "diproses" }), (e: unknown) => e instanceof ReportError && e.status === 403)
    await db.insert(notifications).values(rows.map((r) => ({ reportId: r.id, recipientId: actor.id, kind: "status", title: "Uji inbox", description: tag, createdAt: timestamp })))
    const firstInbox = await service.notifications(actor), secondInbox = await service.notifications(actor, firstInbox.nextCursor!)
    assert.equal(firstInbox.items.length, 20); assert.ok(firstInbox.nextCursor); assert.equal(new Set([...firstInbox.items, ...secondInbox.items].map((r) => r.id)).size, firstInbox.items.length + secondInbox.items.length)
    const dashboard = await service.dashboard(actor); assert.ok(dashboard.queue.length <= 5); assert.ok(dashboard.queue.every((r) => r.handler === "Manajemen Jurusan" && r.status !== "Selesai" && r.status !== "Ditolak"))
    console.log("PASS: draft-file denial, submitted cross-role files, recipient-owned reads, account deactivation and dashboard queue cap")

    const indexes = await pool.query("select indexname from pg_indexes where schemaname='public' and tablename='reports'")
    for (const name of ["reports_date_idx", "reports_status_date_idx", "reports_handler_status_date_idx"]) assert.ok(indexes.rows.some((r) => r.indexname === name), name)
    for (const query of ["select id from reports order by submitted_at desc, id desc limit 21", "select id from reports where status='baru' order by submitted_at desc, id desc limit 21", "select id from reports where handler_role='manajemen' and status='baru' order by submitted_at desc, id desc limit 21"]) {
      const result = await pool.query("explain (analyze, buffers, format json) " + query); assert.ok(result.rows[0]["QUERY PLAN"][0].Plan)
    }
    assert.equal((await repository.list(parseManagementFilter({ q: tag, category: "fasilitas" }), false)).total, 3)
    console.log("PASS: applied indexes and EXPLAIN ANALYZE for global, status-filtered and operational queues")
    console.log("Management DB integration smoke passed.")
  } finally {
    try {
      if (draftIds.length) await db.delete(reportDrafts).where(inArray(reportDrafts.id, draftIds))
      if (reportIds.length) await db.delete(reports).where(inArray(reports.id, reportIds))
      if (userIds.length) await db.delete(users).where(inArray(users.id, userIds))
      console.log("Exact disposable Management fixtures cleaned; existing users/reports preserved. No physical files created.")
    } finally { await pool.end() }
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Management integration failed."); process.exitCode = 1 })
