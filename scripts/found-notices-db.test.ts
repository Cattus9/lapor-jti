import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { foundNoticeReads, reportAttachments, reportLostFoundDetails, reports, satpamInventory, users } from "../src/db/schema"
import { DrizzleFoundNoticeRepository } from "../src/features/found-notices/infrastructure/drizzle-found-notice-repository"
import type { ReportStatus } from "../src/features/reports/domain/report"

test("PostgreSQL: immediate visibility, linked inventory deduplication, private projections, per-user reads, SQL pagination and closed states", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient(), rollback = Symbol("found-notices-rollback")
  try {
    try {
      await db.transaction(async tx => {
        const repository = new DrizzleFoundNoticeRepository(tx as unknown as ConstructorParameters<typeof DrizzleFoundNoticeRepository>[0])
        const owner = randomUUID(), reader = randomUUID(), guard = randomUUID()
        await tx.insert(users).values([
          { id: owner, name: "PRIVATE OWNER", email: `${owner}@example.invalid`, role: "pelapor" },
          { id: reader, name: "Notice reader", email: `${reader}@example.invalid`, role: "pelapor" },
          { id: guard, name: "Notice guard", email: `${guard}@example.invalid`, role: "satpam" },
        ])
        const baseline = await repository.list(reader)
        const future = new Date("2400-01-01T00:00:00.000Z")
        async function report(kind: "temuan" | "kehilangan", status: ReportStatus = "baru") {
          const id = randomUUID()
          await tx.insert(reports).values({ id, submissionKey: randomUUID(), ticketNumber: `NOTICE-${id}`, reporterId: owner,
            category: "kehilangan-temuan", handlerRole: "satpam", status, title: "PRIVATE TITLE", description: "PRIVATE DESCRIPTION",
            locationText: "Ruang 3.2", incidentDate: "2026-11-08", incidentTime: "08:00", submittedAt: future,
            completedAt: status === "selesai" ? future : null })
          await tx.insert(reportLostFoundDetails).values({ reportId: id, kind, itemName: "Dompet uji", itemDetails: "PRIVATE SERIAL" })
          return id
        }
        const foundId = await report("temuan"), lostId = await report("kehilangan"), rejectedId = await report("temuan", "ditolak")
        const foundPhotoKey = randomUUID()
        await tx.insert(reportAttachments).values([
          { id: randomUUID(), ownerId: owner, reportId: foundId, storageKey: randomUUID(), name: "document.pdf", mimeType: "application/pdf", size: 5 },
          { id: randomUUID(), ownerId: owner, reportId: foundId, storageKey: foundPhotoKey, name: "found.jpg", mimeType: "image/jpeg", size: 5 },
          { id: randomUUID(), ownerId: owner, reportId: lostId, storageKey: randomUUID(), name: "private.jpg", mimeType: "image/jpeg", size: 5 },
          { id: randomUUID(), ownerId: owner, reportId: rejectedId, storageKey: randomUUID(), name: "rejected.jpg", mimeType: "image/jpeg", size: 5 },
        ])
        const first = await repository.list(reader)
        assert.equal(first.total, baseline.total + 1)
        const published = first.items.find(row => row.id === foundId)!
        assert.equal(published.state, "reported", "A new finding is visible before Satpam acceptance")
        const foundDetail = await repository.detail(reader, { source: "report", id: foundId })
        assert.equal(foundDetail?.description, "PRIVATE DESCRIPTION")
        assert.deepEqual(Object.keys(foundDetail!).sort(), ["source", "id", "itemName", "foundLocation", "storageLocation", "publishedAt", "state", "read", "hasPhoto", "description"].sort())
        assert.equal(await repository.detail(reader, { source: "report", id: lostId }), null)
        assert.equal(await repository.detail(reader, { source: "report", id: rejectedId }), null)
        assert.equal(published.hasPhoto, true)
        assert.equal((await repository.photo(reader, { source: "report", id: foundId }))?.storageKey, foundPhotoKey)
        assert.equal(await repository.photo(reader, { source: "report", id: lostId }), null)
        assert.equal(await repository.photo(reader, { source: "report", id: rejectedId }), null)
        assert.equal(first.items.some(row => row.id === lostId || row.id === rejectedId), false)
        assert.equal(JSON.stringify(first).includes("PRIVATE"), false)
        assert.equal(await repository.detail(reader, { source: "inventory", id: foundId }), null)
        assert.equal(await repository.markRead(reader, { source: "report", id: lostId }), false)
        await repository.markRead(reader, { source: "report", id: foundId })
        await repository.markRead(reader, { source: "report", id: foundId })
        assert.equal((await tx.select().from(foundNoticeReads).where(and(eq(foundNoticeReads.userId, reader), eq(foundNoticeReads.reportId, foundId)))).length, 1)
        assert.equal((await repository.list(reader)).unread, baseline.unread)
        assert.equal((await repository.detail(owner, { source: "report", id: foundId }))?.read, false)
        await assert.rejects(repository.markRead(guard, { source: "report", id: foundId }), /Pelapor/)
        const linked = randomUUID()
        const inventoryPhotoKey = randomUUID(), handoverPhotoKey = randomUUID()
        await tx.insert(satpamInventory).values({ id: linked, sourceFoundReportId: foundId, itemName: "Dompet fisik", description: "PRIVATE", founderName: "PRIVATE", registeredBy: guard, registeredByName: "PRIVATE", createdAt: future, photoStorageKey: inventoryPhotoKey, photoMimeType: "image/png", handoverPhotoStorageKey: handoverPhotoKey, handoverPhotoMimeType: "image/jpeg" })
        const stored = await repository.list(reader)
        assert.equal(stored.total, first.total, "Receiving the finding does not publish a second entry")
        assert.equal(stored.items.some(row => row.id === linked), false)
        assert.equal(stored.items.find(row => row.id === foundId)?.state, "stored")
        assert.equal(stored.items.find(row => row.id === foundId)?.read, true)
        assert.equal((await repository.detail(reader, { source: "report", id: foundId }))?.description, "PRIVATE DESCRIPTION", "Linked inventory preserves the original report description")
        assert.equal((await repository.photo(reader, { source: "report", id: foundId }))?.storageKey, inventoryPhotoKey)
        assert.equal(await repository.photo(reader, { source: "inventory", id: linked }), null)
        const inventoryIds = Array.from({ length: 23 }, () => randomUUID())
        await tx.insert(satpamInventory).values(inventoryIds.map(id => ({ id, itemName: "Barang inventaris uji", description: "PRIVATE", registeredBy: guard, registeredByName: "PRIVATE", createdAt: future })))
        const standaloneKey = randomUUID()
        const fullDescription = "Deskripsi inventaris lengkap\nBaris kedua"
        await tx.update(satpamInventory).set({ photoStorageKey: standaloneKey, photoMimeType: "image/webp", description: fullDescription }).where(eq(satpamInventory.id, inventoryIds[0]))
        await tx.update(satpamInventory).set({ handoverPhotoStorageKey: randomUUID(), handoverPhotoMimeType: "image/jpeg" }).where(eq(satpamInventory.id, inventoryIds[1]))
        assert.equal((await repository.detail(reader, { source: "inventory", id: inventoryIds[0] }))?.hasPhoto, true)
        assert.equal((await repository.detail(reader, { source: "inventory", id: inventoryIds[0] }))?.description, fullDescription)
        assert.equal((await repository.photo(reader, { source: "inventory", id: inventoryIds[0] }))?.storageKey, standaloneKey)
        assert.equal((await repository.detail(reader, { source: "inventory", id: inventoryIds[1] }))?.hasPhoto, false)
        assert.equal(await repository.photo(reader, { source: "inventory", id: inventoryIds[1] }), null, "Handover evidence is never an item photo")
        const pages = [], seen = new Set<string>()
        let cursor: string | undefined
        do {
          const page = await repository.list(reader, { cursor, limit: 3 })
          assert.ok(page.items.length <= 3)
          for (const item of page.items) {
            const key = `${item.source}:${item.id}`
            assert.ok(!seen.has(key), "Equal timestamps must not duplicate items across pages")
            seen.add(key)
          }
          pages.push(page)
          cursor = page.nextCursor ?? undefined
        } while (cursor && pages.length < 200)
        assert.equal(seen.size, baseline.total + 24)
        await tx.update(satpamInventory).set({ status: "diserahkan", handedOverAt: new Date() }).where(eq(satpamInventory.id, linked))
        assert.equal((await repository.detail(reader, { source: "report", id: foundId }))?.state, "returned")
        assert.equal((await repository.list(reader, { activeOnly: true })).items.some(row => row.id === foundId), false)
        await tx.update(reports).set({ status: "ditolak" }).where(eq(reports.id, foundId))
        assert.equal(await repository.detail(reader, { source: "report", id: foundId }), null)
        assert.equal(await repository.photo(reader, { source: "report", id: foundId }), null)
        assert.equal(await repository.markRead(reader, { source: "report", id: foundId }), false)
        await tx.update(satpamInventory).set({ status: "diserahkan", handedOverAt: new Date() }).where(inArray(satpamInventory.id, inventoryIds))
        assert.equal((await repository.detail(reader, { source: "inventory", id: inventoryIds[0] }))?.state, "returned")
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
  } finally { await pool.end() }
})
