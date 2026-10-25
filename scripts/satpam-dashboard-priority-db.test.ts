import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports, reportLostFoundDetails, lostFoundMatches } from "../src/db/schema"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"
import type { ReportStatus } from "../src/features/reports/domain/report"

test("Dashboard SQL prioritizes the five oldest active scoped reports, includes handover stages and counts pairs separately", { skip: process.env.NODE_ENV !== "development" ? "Local development PostgreSQL required" : false }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient(), owner = randomUUID(), guard = randomUUID(), rollback = Symbol("dashboard-priority-rollback")
  try {
    const live = await new DrizzleSatpamRepository(db).dashboard()
    assert.ok(live.queue.length <= 5, "Root read-only transaction works outside the rollback fixture")
    try {
      await db.transaction(async (tx) => {
        const repository = new DrizzleSatpamRepository(tx as unknown as ConstructorParameters<typeof DrizzleSatpamRepository>[0])
        const baseline = await repository.dashboard()
        // Do not inherit matching-only scopes, overfetch photos, or slice an already paginated list.
        repository.list = async () => { throw new Error("Dashboard must have a bounded SQL projection") }
        repository.workspace = async () => { throw new Error("Dashboard must not load workspace officers and pending rows") }
        await tx.insert(users).values([
          { id: owner, name: "Priority fixture", email: `${owner}@example.invalid`, role: "pelapor" },
          { id: guard, name: "Guard fixture", email: `${guard}@example.invalid`, role: "satpam" },
        ])
        const make = (status: ReportStatus, day: number, category: "kehilangan-temuan" | "fasilitas" = "kehilangan-temuan"): typeof reports.$inferInsert => ({
          id: randomUUID(), submissionKey: randomUUID(), ticketNumber: `PRIORITY-${randomUUID()}`, reporterId: owner,
          category, handlerRole: category === "fasilitas" ? "teknisi" : "satpam", status,
          title: `Priority ${day}`, description: "Fixture", locationText: "Pos", incidentDate: "2026-10-25", incidentTime: "09:00",
          submittedAt: new Date(`1600-01-${String(day).padStart(2, "0")}T00:00:00Z`), completedAt: status === "selesai" ? new Date("1601-01-01") : null,
        })
        const active = (["diserahkan", "barang_teridentifikasi", "diproses", "baru", "baru", "diproses", "barang_teridentifikasi"] as const).map((status, index) => make(status, index < 2 ? 2 : index + 2))
        const ended = [make("selesai", 1), make("ditolak", 1)]
        const foreign = make("baru", 1, "fasilitas")
        await tx.insert(reports).values([...active, ...ended, foreign])
        await tx.insert(reportLostFoundDetails).values([...active, ...ended, foreign].map((row, index) => ({ reportId: row.id!, kind: index % 2 ? "temuan" : "kehilangan", itemName: "Fixture", itemDetails: "" })))
        await tx.insert(lostFoundMatches).values({ lossReportId: active[6].id!, foundReportId: active[1].id!, matchedBy: guard })
        const result = await repository.dashboard()
        const expected = [...active].sort((one, two) => (one.submittedAt as Date).getTime() - (two.submittedAt as Date).getTime() || one.id!.localeCompare(two.id!)).slice(0, 5)
        assert.deepEqual(result.queue.map((row) => row.id), expected.map((row) => row.id))
        assert.ok(result.queue.some((row) => row.status === "Diserahkan"))
        assert.ok(result.queue.some((row) => row.status === "Barang teridentifikasi"))
        assert.equal(result.lostReports, baseline.lostReports + 4)
        assert.equal(result.foundReports, baseline.foundReports + 3)
        assert.equal(result.newFindings, baseline.newFindings + 1)
        assert.equal(result.readyForHandover, baseline.readyForHandover + 1, "A matched pair counts once, not twice")
        assert.deepEqual(Object.keys(result.queue[0]).sort(), ["id", "ticket", "kind", "title", "location", "status", "submittedAt"].sort())
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.deepEqual(await db.select({ id: users.id }).from(users).where(eq(users.id, owner)), [])
  } finally { await pool.end() }
})
