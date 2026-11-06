import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { readFileSync } from "node:fs"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, securityOfficers, satpamInventory, reports, reportHandovers, notifications } from "../src/db/schema"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"
import { matchingCandidates } from "../src/features/lost-found/domain/matching-candidates"
import type { ReportActor } from "../src/features/reports/domain/report"

const local = process.env.NODE_ENV === "development"
function guard() { assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname)) }
test("Inventory receipts, linked returns, retry guards, private photos, unified history and legacy backfill", { skip: !local }, async () => {
  guard()
  const { db, pool } = createDatabaseClient(), stop = Symbol("rollback"), actorId = randomUUID(), ownerId = randomUUID(), officerId = randomUUID()
  const actor: ReportActor = { id: actorId, role: "satpam" }
  try {
    try { await db.transaction(async tx => {
      const repo = new DrizzleSatpamRepository(tx as unknown as ConstructorParameters<typeof DrizzleSatpamRepository>[0])
      await tx.insert(users).values([{ id: actorId, name: "Pencatat fixture", email: `${actorId}@example.invalid`, role: "satpam" }, { id: ownerId, name: "Pemilik fixture", email: `${ownerId}@example.invalid`, role: "pelapor" }])
      await tx.insert(securityOfficers).values({ id: officerId, name: "Penyerah fixture" })
      const before = await repo.dashboard()
      const input = { itemName: `Barang ${actorId}`, submissionKey: randomUUID() }
      const item = await repo.createInventory(actor, input)
      assert.equal((await repo.createInventory(actor, input)).id, item.id)
      await assert.rejects(repo.createInventory(actor, { ...input, itemName: "Data berbeda" }), /data berbeda/)
      assert.equal((await repo.dashboard()).storedItems, before.storedItems + 1)
      const handover = { id: item.id, submissionKey: randomUUID(), officerId, recipient: "Pemilik langsung", recipientEmail: "pemilik@example.com", recipientPhone: "081234567890", ownershipEvidence: "Menjelaskan ciri yang sesuai", note: "Di pos" }
      const returned = await repo.handoverInventory(actor, handover)
      assert.equal(returned.handoverOfficer, "Penyerah fixture")
      assert.equal(returned.handoverActor, "Pencatat fixture")
      assert.equal(returned.handoverRecipientEmail, "pemilik@example.com")
      assert.equal(returned.handoverRecipientPhone, "081234567890")
      assert.equal(returned.linkedLossTicket, undefined)
      assert.equal((await repo.handoverInventory(actor, handover)).id, item.id)
      await assert.rejects(repo.handoverInventory(actor, { ...handover, recipient: "Orang berbeda" }), /data berbeda/)
      await assert.rejects(repo.handoverInventory(actor, { ...handover, submissionKey: randomUUID() }), /sudah diserahkan/)
      const directHistory = await repo.history({ query: actorId })
      assert.equal(directHistory.total, 1); assert.equal(directHistory.items[0].source, "inventaris")
      assert.equal(directHistory.items[0].lostSubmittedAt, "")
      assert.equal(directHistory.items[0].status, "Selesai")
      assert.equal(directHistory.items[0].recipientEmail, "pemilik@example.com")
      assert.equal(directHistory.items[0].recipientPhone, "081234567890")
      assert.equal((await repo.dashboard()).storedItems, before.storedItems)

      const found = await repo.createFoundReport(actor, { itemName: "Payung fixture", description: "Payung hitam" })
      const loss = await repo.createLossReport(actor, { itemName: "Payung fixture", characteristics: "Hitam", description: "Tertinggal", ownerName: "Pemilik langsung", ownerContact: "owner@example.invalid" })
      const projection = await repo.detail(loss.ticket!)
      assert.equal(projection?.report.reporter, "Pemilik langsung")
      assert.equal(projection?.report.reporterContact, "owner@example.invalid")
      assert.equal(projection?.report.recordedBy, "Pencatat fixture")
      // Model a real reporter so the notification assertion checks the correct recipient.
      await tx.update(reports).set({ reporterId: ownerId }).where(eq(reports.id, loss.id))
      await tx.update(reports).set({ title: `Temuan unik ${actorId}`, locationText: `Lokasi unik ${actorId}` }).where(eq(reports.id, found.id))
      const sourceBeforeReceipt = (await repo.detail(found.ticket!))!.report
      const originalCandidate = matchingCandidates([sourceBeforeReceipt], [])[0]
      const receipt = await repo.createInventory(actor, { itemName: "Payung fixture", sourceFoundTicket: found.ticket, submissionKey: randomUUID() })
      await assert.rejects(repo.createInventory(actor, { itemName: "Duplikat", sourceFoundTicket: found.ticket }), /sudah tercatat/)
      const candidates = await repo.list({ kind: "temuan", status: "semua", matching: true, query: "Payung fixture", period: "semua", sort: "terbaru" })
      assert.ok(!candidates.items.some(r => r.id === found.id), "A physically received finding is not a second independent matching candidate")
      const inventoryCandidates = await repo.listInventory({ query: `Temuan unik ${actorId}`, status: "tersimpan" })
      assert.equal(inventoryCandidates.total, 1, "Original report title remains searchable after receipt")
      assert.equal(inventoryCandidates.items[0].id, receipt.id)
      const locationSearch = await repo.listInventory({ query: `Lokasi unik ${actorId}`, status: "tersimpan" })
      assert.equal(locationSearch.total, 1, "Original location stays searchable even when receipt fields differ")
      const unified = matchingCandidates([sourceBeforeReceipt], inventoryCandidates.items)
      assert.equal(unified.length, 1)
      assert.equal(unified[0].id, originalCandidate.id)
      assert.equal(unified[0].title, originalCandidate.title)
      assert.equal(unified[0].sortDate, originalCandidate.sortDate)
      assert.equal(unified[0].custody, "di-pos")
      const completion = { id: receipt.id, submissionKey: randomUUID(), officerId, recipient: "Pemilik payung", recipientPhone: "089876543210", ownershipEvidence: "Ciri khusus terkonfirmasi", lossTicket: loss.ticket }
      await repo.handoverInventory(actor, completion)
      const states = await tx.select().from(reports).where(inArray(reports.id, [found.id, loss.id]))
      assert.ok(states.every(r => r.status === "selesai" && r.completedAt))
      assert.equal((await tx.select().from(notifications).where(and(eq(notifications.reportId, loss.id), eq(notifications.recipientId, ownerId)))).length, 1)
      assert.equal((await tx.select().from(reportHandovers).where(eq(reportHandovers.inventoryId, receipt.id))).length, 1)
      await tx.update(securityOfficers).set({ name: "Petugas berganti nama", isActive: false }).where(eq(securityOfficers.id, officerId))
      assert.equal((await repo.history({ officerId, query: "Payung fixture" })).items[0].handler, "Penyerah fixture")
      const waiting = await repo.createInventory(actor, { itemName: "Belum diserahkan" })
      await assert.rejects(repo.handoverInventory(actor, { ...completion, id: waiting.id, lossTicket: undefined, submissionKey: randomUUID() }), /nonaktif/)
      assert.equal((await repo.getInventoryItem(waiting.id))?.status, "tersimpan")
      await tx.update(satpamInventory).set({ photoUrl: "https://external.invalid/private.jpg" }).where(eq(satpamInventory.id, waiting.id))
      assert.equal((await repo.getInventoryItem(waiting.id))?.photoUrl, undefined)
      await tx.update(securityOfficers).set({ isActive: true }).where(eq(securityOfficers.id, officerId))
      const foreign = await repo.createLossReport(actor, { itemName: "Foreign fixture", characteristics: "Ciri", description: "Fixture" })
      await tx.update(reports).set({ category: "fasilitas", handlerRole: "teknisi" }).where(eq(reports.id, foreign.id))
      await assert.rejects(repo.handoverInventory(actor, { ...completion, id: waiting.id, submissionKey: randomUUID(), lossTicket: foreign.ticket }), /Laporan tertaut/)
      assert.equal((await repo.getInventoryItem(waiting.id))?.status, "tersimpan")

      const [legacy] = await tx.insert(satpamInventory).values({ itemName: "Barang lama", registeredBy: actorId, registeredByName: "Pencatat awal", status: "diserahkan", handoverRecipient: "Penerima lama" }).returning()
      const migration = readFileSync("drizzle/0016_satpam_inventory_handovers.sql", "utf8")
      await tx.execute(migration.slice(migration.indexOf("INSERT INTO report_handovers")))
      const [event] = await tx.select().from(reportHandovers).where(eq(reportHandovers.inventoryId, legacy.id))
      assert.equal(event.legacy, true); assert.equal(event.actorId, null); assert.equal(event.officerId, null)
      assert.equal(event.officerName, "Tidak tercatat (data lama)")
      throw stop
    }) } catch (error) { if (error !== stop) throw error }
    assert.equal((await db.select().from(users).where(eq(users.id, actorId))).length, 0)
  } finally { await pool.end() }
})

test("Concurrent inventory returns have one winner; identical concurrent retries create one event", { skip: !local }, async () => {
  guard()
  const { db, pool } = createDatabaseClient(), actorId = randomUUID(), officerId = randomUUID(), ids: string[] = []
  const actor: ReportActor = { id: actorId, role: "satpam" }, repo = new DrizzleSatpamRepository(db)
  try {
    await db.insert(users).values({ id: actorId, name: "Concurrent fixture", email: `${actorId}@example.invalid`, role: "satpam" })
    await db.insert(securityOfficers).values({ id: officerId, name: "Concurrent officer" })
    for (const sameKey of [false, true]) {
      const item = await repo.createInventory(actor, { itemName: `Race ${actorId}` }); ids.push(item.id)
      const input = { id: item.id, officerId, recipient: "Pemilik", recipientPhone: "081234567890", ownershipEvidence: "Ciri cocok", submissionKey: randomUUID() }
      const results = await Promise.allSettled([repo.handoverInventory(actor, input), repo.handoverInventory(actor, { ...input, submissionKey: sameKey ? input.submissionKey : randomUUID(), recipient: sameKey ? input.recipient : "Penerima lain" })])
      assert.equal(results.filter(r => r.status === "fulfilled").length, sameKey ? 2 : 1)
      if (!sameKey) assert.equal((results.find(r => r.status === "rejected") as PromiseRejectedResult).reason.status, 409)
      const events = await db.select().from(reportHandovers).where(eq(reportHandovers.inventoryId, item.id))
      assert.equal(events.length, 1)
      assert.equal(events[0].recipient, (await repo.getInventoryItem(item.id))?.handoverRecipient)
    }
  } finally {
    if (ids.length) { await db.delete(reportHandovers).where(inArray(reportHandovers.inventoryId, ids)); await db.delete(satpamInventory).where(inArray(satpamInventory.id, ids)) }
    await db.delete(securityOfficers).where(eq(securityOfficers.id, officerId))
    await db.delete(users).where(eq(users.id, actorId)); await pool.end()
  }
})
