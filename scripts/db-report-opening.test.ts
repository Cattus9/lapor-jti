import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { readFile } from "node:fs/promises"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports } from "../src/db/schema"
import { markReportOpened } from "../src/features/reports/infrastructure/report-opening"

test("Migration preserves unknown opening history and enables tracking on new reports", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { pool } = createDatabaseClient("migration")
  const client = await pool.connect()
  try {
    await client.query("BEGIN")
    await client.query("CREATE TEMP TABLE reports (id integer primary key) ON COMMIT DROP")
    await client.query("INSERT INTO reports (id) VALUES (1)")
    const migration = await readFile("drizzle/0018_report_first_opened.sql", "utf8")
    for (const statement of migration.split("--> statement-breakpoint")) if (statement.trim()) await client.query(statement)
    await client.query("INSERT INTO reports (id) VALUES (2)")
    const { rows } = await client.query("SELECT id, first_opened_at, first_opened_tracking FROM reports ORDER BY id")
    assert.deepEqual(rows, [{ id: 1, first_opened_at: null, first_opened_tracking: false }, { id: 2, first_opened_at: null, first_opened_tracking: true }])
  } finally { await client.query("ROLLBACK"); client.release(); await pool.end() }
})

test("Opening belongs to the assigned team, is idempotent and leaves report activity untouched", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient("migration"), rollback = Symbol("rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        const reporter = randomUUID(), id = randomUUID(), technician = randomUUID()
        await tx.insert(users).values([{ id: reporter, email: `${reporter}@example.invalid`, name: "Pelapor", role: "pelapor" }, { id: technician, email: `${technician}@example.invalid`, name: "Teknisi", role: "teknisi" }])
        await tx.insert(reports).values({ id, reporterId: reporter, submissionKey: randomUUID(), ticketNumber: `LJ-2096-${randomInt(100000000000, 999999999999)}`, category: "fasilitas", handlerRole: "teknisi", title: "Lampu", description: "Lampu rusak", incidentDate: "2026-10-01", incidentTime: "09:00", locationText: "Ruang uji" })
        const scoped = tx as unknown as Parameters<typeof markReportOpened>[2]
        const actor = { id: technician, role: "teknisi" }
        const [before] = await tx.select().from(reports).where(eq(reports.id, id))
        assert.equal(before.firstOpenedAt, null)
        assert.equal(before.firstOpenedTracking, true)
        await assert.rejects(markReportOpened({ id: reporter, role: "pelapor" }, id, scoped), /tidak ditemukan/i)
        await assert.rejects(markReportOpened({ id: reporter, role: "manajemen" }, id, scoped), /tidak ditemukan/i)
        const first = await markReportOpened(actor, id, scoped)
        const again = await markReportOpened(actor, id, scoped)
        assert.equal(first.firstOpenedAt, again.firstOpenedAt)
        const [after] = await tx.select().from(reports).where(eq(reports.id, id))
        assert.equal(after.firstOpenedAt?.toISOString(), first.firstOpenedAt)
        assert.equal(after.updatedAt.toISOString(), before.updatedAt.toISOString())
        assert.equal(after.status, before.status)
        for (const [role, category] of [["satpam", "kehilangan-temuan"], ["manajemen", "lainnya"], ["tefa", "layanan"]] as const) {
          const reportId = randomUUID()
          await tx.insert(reports).values({ id: reportId, reporterId: reporter, submissionKey: randomUUID(), ticketNumber: `LJ-2096-${randomInt(100000000000, 999999999999)}`, category, handlerRole: role, title: "Uji", description: "Uji pembukaan", incidentDate: "2026-10-01", incidentTime: "09:00", locationText: "Lokasi", firstOpenedTracking: false })
          await assert.rejects(markReportOpened(actor, reportId, scoped), /tidak ditemukan/i)
          const result = await markReportOpened({ id: technician, role }, reportId, scoped)
          const [legacy] = await tx.select().from(reports).where(eq(reports.id, reportId))
          assert.equal(legacy.firstOpenedTracking, true)
          assert.equal(legacy.firstOpenedAt?.toISOString(), result.firstOpenedAt)
        }
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
  } finally { await pool.end() }
})
