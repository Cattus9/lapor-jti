import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports } from "../src/db/schema"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"

test("Report previews are bounded Unicode text in every list path and cannot expose another owner's report", { skip: process.env.NODE_ENV !== "development" ? "Local development database required" : false }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient(), owner = randomUUID(), other = randomUUID(), rollback = Symbol("report-preview-rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values([owner, other].map((id) => ({ id, name: "Report Preview Fixture", email: `${id}@example.invalid`, role: "pelapor" as const })))
        const description = "Lampu rusak 💡 ".repeat(30)
        const [report] = await tx.insert(reports).values({
          ticketNumber: `PREVIEW-${owner}`, submissionKey: randomUUID(), reporterId: owner,
          category: "fasilitas", title: "Preview fixture", description,
          incidentDate: "2026-10-25", incidentTime: "09:00", locationText: "Fixture", handlerRole: "teknisi",
        }).returning()
        const repository = new DrizzleReportRepository(tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0])
        const page = await repository.list(owner, undefined, report.ticketNumber)
        const expected = Array.from(description).slice(0, 240).join("")
        assert.equal(page.items[0].descriptionPreview, expected)
        assert.equal(page.selected?.descriptionPreview, expected)
        assert.equal((await repository.dashboard(owner)).recent[0].descriptionPreview, expected)
        const foreign = await repository.list(other, undefined, report.ticketNumber)
        assert.deepEqual(foreign.items, [])
        assert.equal(foreign.selected, undefined)
        assert.equal((await repository.detail(owner, report.id))?.detail.description, description)
        assert.equal((await repository.detail(other, report.id)), null)
        assert.equal((await tx.select().from(reports).where(eq(reports.id, report.id)))[0].description, description)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.deepEqual(await db.select({ id: users.id }).from(users).where(eq(users.id, owner)), [])
  } finally { await pool.end() }
})
