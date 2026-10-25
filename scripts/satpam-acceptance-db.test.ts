import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import { eq, sql } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports, reportLostFoundDetails, reportStatusHistory, notifications } from "../src/db/schema"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"
import { parseSatpamCommand } from "../src/features/lost-found/domain/satpam"

const localOnly = { skip: process.env.NODE_ENV !== "development" ? "Local development PostgreSQL required" : false }
const localClient = () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl("migration")).hostname))
  return createDatabaseClient("migration")
}
const fixture = (owner: string, category: "kehilangan-temuan" | "fasilitas", status: "baru" | "diverifikasi") => ({
  id: randomUUID(), submissionKey: randomUUID(), ticketNumber: `LJ-2099-${Math.floor(Math.random() * 1e12)}`,
  reporterId: owner, category, handlerRole: category === "fasilitas" ? "teknisi" as const : "satpam" as const,
  title: "Satpam acceptance fixture", description: "Temporary test report", locationText: "Test location",
  incidentDate: "2026-10-25", incidentTime: "09:00", status,
})

test("Migration retires only Satpam verification, preserving timestamps and historical audit on isolated temporary tables", localOnly, async () => {
  const { db, pool } = localClient(), rollback = Symbol("migration-rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        // PG's temporary search path shadows only this connection. No real report is updated.
        await tx.execute(sql`create temporary table reports (like public.reports including defaults including constraints) on commit drop`)
        await tx.execute(sql`create temporary table report_status_history (like public.report_status_history including defaults including constraints) on commit drop`)
        await tx.execute(sql`alter table reports drop constraint reports_status_category_check`)
        const oldConstraint = readFileSync("drizzle/0003_wakeful_ser_duncan.sql", "utf8").split(/\r?\n/).find((line) => line.includes('ADD CONSTRAINT "reports_status_category_check"'))
        assert.ok(oldConstraint)
        await tx.execute(sql.raw(oldConstraint))
        const owner = randomUUID(), stamp = new Date("2026-10-01T03:00:00Z")
        const legacy = fixture(owner, "kehilangan-temuan", "diverifikasi"), technician = fixture(owner, "fasilitas", "diverifikasi"), fresh = fixture(owner, "kehilangan-temuan", "baru")
        await tx.insert(reports).values([legacy, technician, fresh].map((row) => ({ ...row, submittedAt: stamp, updatedAt: stamp })))
        await tx.insert(reportStatusHistory).values({ reportId: legacy.id, actorId: owner, actorName: "Historical actor", fromStatus: "baru", toStatus: "diverifikasi", note: "Original verification record", createdAt: stamp })
        for (const statement of readFileSync("drizzle/0015_simplify_satpam_acceptance.sql", "utf8").split("--> statement-breakpoint")) {
          if (statement.trim()) await tx.execute(sql.raw(statement))
        }
        const [migrated] = await tx.select().from(reports).where(eq(reports.id, legacy.id))
        assert.equal(migrated.status, "diproses")
        assert.equal(migrated.updatedAt.toISOString(), stamp.toISOString())
        assert.equal(migrated.submittedAt.toISOString(), stamp.toISOString())
        assert.equal((await tx.select().from(reports).where(eq(reports.id, technician.id)))[0].status, "diverifikasi")
        assert.equal((await tx.select().from(reports).where(eq(reports.id, fresh.id)))[0].status, "baru")
        const history = await tx.select().from(reportStatusHistory)
        assert.equal(history.length, 1)
        assert.equal(history[0].toStatus, "diverifikasi")
        assert.equal(history[0].actorName, "Historical actor")
        assert.equal(history[0].note, "Original verification record")
        await assert.rejects(tx.transaction(async (checkTx) => {
          await checkTx.insert(reports).values(fixture(owner, "kehilangan-temuan", "diverifikasi"))
        }), (error: unknown) => (error as { cause?: { constraint?: string } }).cause?.constraint === "reports_status_category_check")
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
  } finally { await pool.end() }
})

test("Acceptance commits Baru to Diproses once, with one real actor history/notification and Pelapor visibility", localOnly, async () => {
  const { db, pool } = localClient(), rollback = Symbol("acceptance-rollback"), owner = randomUUID(), guard = randomUUID()
  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values([
          { id: owner, name: "Reporter fixture", email: `${owner}@example.invalid`, role: "pelapor" },
          { id: guard, name: "Guard fixture", email: `${guard}@example.invalid`, role: "satpam" },
        ])
        const row = fixture(owner, "kehilangan-temuan", "baru")
        await tx.insert(reports).values(row)
        await tx.insert(reportLostFoundDetails).values({ reportId: row.id, kind: "kehilangan", itemName: "Fixture", itemDetails: "" })
        const repository = new DrizzleSatpamRepository(tx as unknown as ConstructorParameters<typeof DrizzleSatpamRepository>[0])
        const command = parseSatpamCommand({ type: "status", ticket: row.ticketNumber, status: "diproses", actorId: owner })
        await repository.execute({ id: guard, role: "satpam" }, command)
        await assert.rejects(repository.execute({ id: guard, role: "satpam" }, command), /Status laporan sudah berubah/)
        const history = await tx.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, row.id))
        assert.equal(history.length, 1)
        assert.equal(history[0].fromStatus, "baru")
        assert.equal(history[0].toStatus, "diproses")
        assert.equal(history[0].actorId, guard)
        assert.equal(history[0].actorName, "Guard fixture")
        assert.match(history[0].note, /pencocokan/)
        const notices = await tx.select().from(notifications).where(eq(notifications.reportId, row.id))
        assert.equal(notices.length, 1)
        assert.equal(notices[0].recipientId, owner)
        assert.equal((await repository.detail(row.ticketNumber))?.report.status, "Diproses")
        const reporter = new DrizzleReportRepository(tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0])
        assert.equal((await reporter.detail(owner, row.id))?.status, "diproses")
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.deepEqual(await db.select({ id: users.id }).from(users).where(eq(users.id, owner)), [])
  } finally { await pool.end() }
})
