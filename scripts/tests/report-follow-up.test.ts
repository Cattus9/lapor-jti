import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../../src/db/client"
import { getDatabaseUrl } from "../../src/db/environment"
import { notifications, reportLostFoundDetails, reports, reportStatusHistory, users } from "../../src/db/schema"
import { getReportAttention, reportAttentionCutoffs } from "../../src/features/reports/domain/report-follow-up"
import { reportAttentionOrder, requiresReportFollowUp, recordReportProgress, updateReminderKind } from "../../src/features/reports/infrastructure/report-follow-up"
import { DrizzleReportRepository } from "../../src/features/reports/infrastructure/drizzle-report-repository"
import { DrizzleTechnicianRepository } from "../../src/features/facilities/infrastructure/drizzle-technician-repository"

test("Report attention uses WIB calendar days and preserves existing report states", () => {
  const report = {
    status: "baru" as const,
    submittedAt: new Date("2026-11-01T17:00:00+07:00"),
    updatedAt: new Date("2026-11-01T17:00:00+07:00"),
    firstOpenedAt: null,
    firstOpenedTracking: true,
  }
  const attentionOn = (date: string, row = report) => getReportAttention(row, reportAttentionCutoffs(new Date(date)))
  assert.equal(attentionOn("2026-11-03T23:59:59+07:00"), null)
  assert.equal(attentionOn("2026-11-04T00:00:00+07:00"), "review")
  assert.equal(attentionOn("2026-11-04T00:00:00+07:00", { ...report, firstOpenedTracking: false }), null)
  assert.equal(attentionOn("2026-11-08T00:00:00+07:00"), "update")
  assert.equal(getReportAttention({ ...report, updatedAt: new Date("2026-11-07"), firstOpenedAt: new Date("2026-11-02") }, reportAttentionCutoffs(new Date("2026-11-08T00:00:00+07:00"))), null)
  assert.equal(attentionOn("2026-11-15T00:00:00+07:00"), "followUp")
  assert.equal(getReportAttention({ ...report, status: "selesai" }, reportAttentionCutoffs(new Date("2026-11-15"))), null)
  assert.equal(getReportAttention({ ...report, status: "ditolak" }, reportAttentionCutoffs(new Date("2026-11-15"))), null)
})

test("PostgreSQL filters age, scopes and deduplicates reminders, and records a progress update without closing a ticket", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient()
  const rollback = Symbol("follow-up fixture rollback")
  try {
    await assert.rejects(db.transaction(async (tx) => {
      const fixtureDb = tx as unknown as typeof db
      const repository = new DrizzleReportRepository(fixtureDb)
      const reporterId = randomUUID(), technicianId = randomUUID(), tefaId = randomUUID(), satpamId = randomUUID()
      await tx.insert(users).values([
        { id: reporterId, name: "Follow-up reporter fixture", email: `${reporterId}@example.invalid`, role: "pelapor" },
        { id: technicianId, name: "Follow-up technician fixture", email: `${technicianId}@example.invalid`, role: "teknisi" },
        { id: tefaId, name: "Follow-up TEFA fixture", email: `${tefaId}@example.invalid`, role: "tefa" },
        { id: satpamId, name: "Follow-up Satpam fixture", email: `${satpamId}@example.invalid`, role: "satpam" },
      ])
      const baseline = await repository.notifications(technicianId, undefined, "teknisi")
      const now = new Date()
      const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000)
      const make = (days: number, override: Partial<typeof reports.$inferInsert> = {}) => ({
        id: randomUUID(), submissionKey: randomUUID(), ticketNumber: `FOLLOW-UP-${randomUUID()}`, reporterId,
        category: "fasilitas" as const, handlerRole: "teknisi" as const, title: "Follow-up fixture", description: "Fixture",
        incidentDate: "2026-01-01", incidentTime: "08:00", locationText: "Fixture", submittedAt: daysAgo(days), updatedAt: daysAgo(days),
        ...override,
      })
      const overdue = make(14, { updatedAt: daysAgo(1) }), stale = make(7), fresh = make(3)
      const closesAfterReminder = make(8)
      const resolved = make(15, { status: "selesai", completedAt: daysAgo(1) })
      const foreign = make(8, { category: "layanan", handlerRole: "tefa" })
      const fixtureReports = [overdue, stale, fresh, closesAfterReminder, resolved, foreign]
      await tx.insert(reports).values(fixtureReports)
      const reportIds = fixtureReports.map((report) => report.id)
      const cutoffs = reportAttentionCutoffs(now)
      assert.deepEqual(await tx.select({ id: reports.id }).from(reports)
        .where(and(inArray(reports.id, reportIds), requiresReportFollowUp(cutoffs))), [{ id: overdue.id }])
      const ranked = await tx.select({ id: reports.id }).from(reports)
        .where(inArray(reports.id, [fresh.id, stale.id, overdue.id])).orderBy(reportAttentionOrder(cutoffs))
      assert.deepEqual(ranked.map(({ id }) => id), [overdue.id, stale.id, fresh.id])

      const list = await repository.notifications(technicianId, undefined, "teknisi")
      const reminders = () => tx.select().from(notifications).where(and(eq(notifications.recipientId, technicianId),
        inArray(notifications.reportId, reportIds), eq(notifications.kind, updateReminderKind)))
      const createdReminders = await reminders()
      const reminder = createdReminders.find((item) => item.reportId === stale.id)
      const closingReminder = createdReminders.find((item) => item.reportId === closesAfterReminder.id)
      assert.ok(reminder && closingReminder)
      assert.equal(list.unread, baseline.unread + 2)
      assert.ok(list.items.some(({ id }) => id === reminder.id))
      assert.ok(!(await repository.notifications(technicianId)).items.some(({ id }) => id === reminder.id))
      await repository.markRead(technicianId, reminder.id, "teknisi")
      await repository.notifications(technicianId, undefined, "teknisi")
      const afterMarkRead = await reminders()
      assert.deepEqual(new Set(afterMarkRead.map(({ id }) => id)), new Set([reminder.id, closingReminder.id]))
      assert.ok(afterMarkRead.find(({ id }) => id === reminder.id)?.readAt)
      await tx.update(notifications).set({ readAt: null }).where(eq(notifications.id, reminder.id))

      const technician = { id: technicianId, role: "teknisi" }
      await assert.rejects(recordReportProgress({ id: tefaId, role: "tefa" }, stale.id, "reviewing", fixtureDb), { status: 404 })
      await assert.rejects(recordReportProgress(technician, resolved.id, "repairing", fixtureDb), { status: 409 })
      await assert.rejects(recordReportProgress(technician, stale.id, "__proto__", fixtureDb), { status: 400 })
      await recordReportProgress(technician, stale.id, "repairing", fixtureDb)
      await recordReportProgress(technician, stale.id, "repairing", fixtureDb)
      const [saved] = await tx.select().from(reports).where(eq(reports.id, stale.id))
      assert.equal(saved.status, "baru")
      assert.equal(saved.firstOpenedAt, null)
      assert.equal(getReportAttention(saved, cutoffs), "review")
      const history = await tx.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, stale.id))
      assert.equal(history.length, 1)
      assert.equal(history[0].note, "Perbaikan fasilitas masih berlangsung.")
      await tx.update(reports).set({ status: "selesai", completedAt: new Date() }).where(eq(reports.id, closesAfterReminder.id))
      const archivedList = await repository.notifications(technicianId, undefined, "teknisi")
      assert.equal(archivedList.unread, baseline.unread)
      const archived = archivedList.items.find(({ id }) => id === closingReminder.id)
      assert.equal(archived?.title, "Riwayat pengingat pembaruan")
      assert.equal(archived.description, "Laporan ini sudah selesai.")
      assert.equal(archived.read, true)
      assert.equal((await reminders()).find(({ id }) => id === closingReminder.id)?.readAt, null)
      assert.match(archivedList.items.find(({ id }) => id === reminder.id)?.description ?? "", /Perkembangan penanganan sudah tercatat/)
      const reporterNotices = await repository.notifications(reporterId)
      assert.deepEqual(reporterNotices.items.map(({ kind, description }) => ({ kind, description })), [{ kind: "response", description: history[0].note }])

      const posReport = make(1, { category: "kehilangan-temuan", handlerRole: "satpam", reporterId: satpamId })
      await tx.insert(reports).values(posReport)
      await tx.insert(reportLostFoundDetails).values({ reportId: posReport.id, kind: "temuan", itemName: "Fixture", itemDetails: "" })
      const satpam = { id: satpamId, role: "satpam" }
      await assert.rejects(recordReportProgress(satpam, posReport.id, "searching", fixtureDb), { status: 400 })
      await recordReportProgress(satpam, posReport.id, "checking", fixtureDb)
      assert.equal((await tx.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, posReport.id))).length, 1)
      assert.deepEqual(await tx.select().from(notifications).where(eq(notifications.reportId, posReport.id)), [])

      const matchedLoss = make(1, { category: "kehilangan-temuan", handlerRole: "satpam", status: "barang_teridentifikasi" })
      await tx.insert(reports).values(matchedLoss)
      await tx.insert(reportLostFoundDetails).values({ reportId: matchedLoss.id, kind: "kehilangan", itemName: "Fixture", itemDetails: "" })
      await assert.rejects(recordReportProgress(satpam, matchedLoss.id, "searching", fixtureDb), { status: 400 })
      assert.deepEqual(await tx.select().from(notifications).where(eq(notifications.reportId, matchedLoss.id)), [])
      await recordReportProgress(satpam, matchedLoss.id, "awaitingHandover", fixtureDb)
      const [handoverNotice] = await tx.select().from(notifications).where(eq(notifications.reportId, matchedLoss.id))
      assert.equal(handoverNotice.description, "Barang sudah teridentifikasi dan menunggu penyerahan.")

      const legacy = make(6, { status: "diproses" })
      await tx.insert(reports).values(legacy)
      const technicianRepository = new DrizzleTechnicianRepository(fixtureDb)
      await recordReportProgress(technician, legacy.id, "repairing", fixtureDb)
      assert.equal((await technicianRepository.detail(legacy.ticketNumber))?.timing.processingStartedAt, null)
      const actualStart = daysAgo(4)
      await tx.insert(reportStatusHistory).values({
        reportId: legacy.id, actorId: technicianId, actorName: "Follow-up technician fixture",
        fromStatus: "diverifikasi", toStatus: "diproses", note: "Mulai", createdAt: actualStart,
      })
      assert.equal((await technicianRepository.detail(legacy.ticketNumber))?.timing.processingStartedAt, actualStart.toISOString())
      throw rollback
    }), (error) => error === rollback)
  } finally {
    await pool.end()
  }
})
