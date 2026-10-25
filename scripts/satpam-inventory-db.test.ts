import "dotenv/config"
import assert from "node:assert/strict"
import test from "node:test"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, satpamInventory, reportHandovers, securityOfficers } from "../src/db/schema"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"
import type { ReportActor } from "../src/features/reports/domain/report"

test("satpam inventory persistence in PostgreSQL: insert, list, and handover", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { pool, db } = createDatabaseClient()
  const testId = randomUUID()
  const officerId = randomUUID()
  const actorId = randomUUID()
  const actorName = `Satpam Test ${testId.slice(0, 8)}`
  const actorEmail = `satpam-${testId.slice(0, 8)}@example.com`
  const satpamActor: ReportActor = {
    id: actorId,
    role: "satpam",
  }

  try {
    // 1. Create a satpam user fixture
    await db.insert(users).values({
      id: actorId,
      name: actorName,
      email: actorEmail,
      role: "satpam",
      isActive: true,
    })

    await db.insert(securityOfficers).values({ id: officerId, name: "Penyerah test" })
    const repo = new DrizzleSatpamRepository(db)

    // 2. Insert an inventory item
    const created = await repo.createInventory(satpamActor, {
      itemName: `Kunci Motor Honda ${testId.slice(0, 6)}`,
      founderName: "Ahmad Mahasiswa",
      description: "Ditemukan di dekat parkiran Gedung TI",

    })

    assert.ok(created.id)
    assert.equal(created.itemName, `Kunci Motor Honda ${testId.slice(0, 6)}`)
    assert.equal(created.status, "tersimpan")
    assert.equal(created.founderName, "Ahmad Mahasiswa")
    assert.equal(created.registeredByName, actorName)


    // 3. Verify in PostgreSQL
    const [row] = await db.select().from(satpamInventory).where(eq(satpamInventory.id, created.id))
    assert.ok(row)
    assert.equal(row.status, "tersimpan")
    assert.equal(row.registeredBy, satpamActor.id)

    // 4. Test listing with search query
    const listResult = await repo.listInventory({ query: testId.slice(0, 6), status: "tersimpan" })
    assert.equal(listResult.items.length, 1)
    assert.equal(listResult.items[0].id, created.id)

    // 5. Test handover
    const handedOver = await repo.handoverInventory(satpamActor, {
      id: created.id,
      recipient: "Riko Pemilik",
      officerId, submissionKey: randomUUID(), ownershipEvidence: "Menunjukkan ciri khusus dan bukti kepemilikan",
      note: "Menyerahkan bukti STNK motor",
    })

    assert.equal(handedOver.status, "diserahkan")
    assert.equal(handedOver.handoverRecipient, "Riko Pemilik")
    assert.equal(handedOver.handoverNote, "Menyerahkan bukti STNK motor")
    assert.ok(handedOver.handedOverAt)

    // 6. Verify handover in PostgreSQL
    const [updatedRow] = await db.select().from(satpamInventory).where(eq(satpamInventory.id, created.id))
    assert.equal(updatedRow.status, "diserahkan")
    assert.equal(updatedRow.handoverRecipient, "Riko Pemilik")
  } finally {
    // Cleanup fixture
    await db.delete(reportHandovers).where(eq(reportHandovers.actorId, actorId))
    await db.delete(securityOfficers).where(eq(securityOfficers.id, officerId))
    await db.delete(satpamInventory).where(eq(satpamInventory.registeredBy, satpamActor.id)).catch(() => {})
    await db.delete(users).where(eq(users.id, satpamActor.id)).catch(() => {})
    await pool.end()
  }
})
