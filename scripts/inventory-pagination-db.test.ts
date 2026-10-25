import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { satpamInventory, users } from "../src/db/schema"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"

test("Inventory keyset is bounded and complete for timestamp ties, filtered totals, literal search and invalid cursors", { skip: process.env.NODE_ENV !== "development" ? "Local development database required" : false }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient(), id = randomUUID(), rollback = Symbol("inventory-pagination-rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id, name: "Inventory Pagination Fixture", email: `${id}@example.invalid`, role: "satpam" })
        const stamp = new Date("2026-01-01T00:00:00Z")
        const ids = Array.from({ length: 45 }, () => randomUUID())
        await tx.insert(satpamInventory).values(ids.map((itemId, index) => ({ id: itemId, itemName: `${id}%_ ${index}`, registeredBy: id, registeredByName: "Fixture", createdAt: stamp })))
        await tx.insert(satpamInventory).values([
          { itemName: `${id}%_ handed`, status: "diserahkan", registeredBy: id, registeredByName: "Fixture" },
          { itemName: `${id}XX unrelated`, registeredBy: id, registeredByName: "Fixture" },
        ])
        const repository = new DrizzleSatpamRepository(tx as unknown as ConstructorParameters<typeof DrizzleSatpamRepository>[0])
        let cursor: string | undefined, found: string[] = []
        const sizes: number[] = []
        do {
          const page = await repository.listInventory({ query: `${id}%_`, status: "tersimpan", cursor })
          assert.equal(page.total, 45)
          assert.ok(page.items.length <= 20)
          found = [...found, ...page.items.map((item) => item.id)]; sizes.push(page.items.length)
          cursor = page.nextCursor ?? undefined
        } while (cursor)
        assert.deepEqual(sizes, [20, 20, 5])
        assert.equal(new Set(found).size, 45)
        assert.deepEqual(found, ids.sort().reverse())
        assert.equal((await repository.listInventory({ query: `${id}%_`, status: "diserahkan" })).total, 1)
        assert.equal((await repository.listInventory({ query: `${id}%_`, status: "semua" })).total, 46)
        await assert.rejects(repository.listInventory({ cursor: "invalid" }), /Pagination tidak valid/)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.equal((await db.select({ id: users.id }).from(users).where(eq(users.id, id))).length, 0)
  } finally { await pool.end() }
})
