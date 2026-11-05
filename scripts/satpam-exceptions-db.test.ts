import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, securityOfficers, reports, lostFoundMatches, reportHandovers, reportStatusHistory, operationalAudit, notifications } from "../src/db/schema"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"
import { parseSatpamCommand } from "../src/features/lost-found/domain/satpam"

test("Satpam links receipts, audits corrections, cancels mistaken matches and closes confirmed returns atomically", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient("migration"), rollback = Symbol("rollback")
  try {
    try { await db.transaction(async tx => {
      const actor = { id: randomUUID(), role: "satpam" }, other = { id: randomUUID(), role: "tefa" }, officerId = randomUUID()
      await tx.insert(users).values([actor, other].map(value => ({ id: value.id, role: value.role as "satpam" | "tefa", name: value.role, email: `${value.id}@example.invalid` })))
      await tx.insert(securityOfficers).values({ id: officerId, name: "Petugas fixture" })
      const repo = new DrizzleSatpamRepository(tx as unknown as ConstructorParameters<typeof DrizzleSatpamRepository>[0])
      const loss = () => repo.createLossReport(actor, { itemName: "Dompet", characteristics: "Hitam", description: "Hilang di kelas", ownerName: "Pemilik langsung" })
      const found = () => repo.createFoundReport(actor, { itemName: "Dompet", description: "Ditemukan" })
      const execute = (raw: unknown) => repo.execute(actor, parseSatpamCommand(raw))
      const first = await found()
      const item = await repo.createInventory(actor, { itemName: "Dompet", sourceFoundTicket: first.ticket, submissionKey: randomUUID() })
      assert.equal(item.sourceFoundTicket, first.ticket)
      await assert.rejects(repo.createInventory(actor, { itemName: "Duplikat", sourceFoundTicket: first.ticket, submissionKey: randomUUID() }), /sudah tercatat/)
      const correction = { itemName: "Dompet kulit hitam", description: "Ciri diperjelas", storageLocation: "Lemari pos", version: item.version, reason: "Memperbaiki nama barang" }
      await assert.rejects(repo.correctInventory(other, item.id, correction), /akses/)
      const corrected = await repo.correctInventory(actor, item.id, correction)
      assert.equal(corrected.itemName, correction.itemName)
      assert.equal(corrected.corrections?.[0].reason, correction.reason)
      await assert.rejects(repo.correctInventory(actor, item.id, correction), /berubah/)
      const unlinked = await repo.createInventory(actor, { itemName: "Barang langsung" })
      const second = await found()
      const linked = await repo.correctInventory(actor, unlinked.id, { ...correction, version: unlinked.version, sourceFoundTicket: second.ticket })
      assert.equal(linked.sourceFoundTicket, second.ticket)
      const owner = await loss()
      const returned = await repo.handoverInventory(actor, { id: item.id, officerId, recipient: "Pemilik", ownershipEvidence: "Menjelaskan ciri khusus", lossTicket: owner.ticket, submissionKey: randomUUID() })
      assert.equal(returned.status, "diserahkan")
      await assert.rejects(repo.correctInventory(actor, item.id, { ...correction, version: returned.version }), /diserahkan/)
      await assert.rejects(execute({ type: "close", ticket: first.ticket, expectedStatus: "diproses", reason: "withdrawn", note: "Ditutup" }), /Inventaris|berubah/)

      const missing = await loss(), discovery = await found()
      await execute({ type: "status", ticket: missing.ticket, status: "diproses" })
      await execute({ type: "match", lossTicket: missing.ticket, foundTicket: discovery.ticket })
      const [pair] = await tx.select().from(lostFoundMatches).where(eq(lostFoundMatches.lossReportId, missing.id))
      assert.equal((await repo.pending()).items.find(row => row.id === pair.id)?.reporter, "Pemilik langsung")
      await execute({ type: "cancel-match", matchId: pair.id, note: "Ternyata barang berbeda" })
      assert.equal((await tx.select().from(lostFoundMatches).where(eq(lostFoundMatches.id, pair.id))).length, 0)
      assert.equal((await tx.select().from(operationalAudit).where(and(eq(operationalAudit.entityId, pair.id), eq(operationalAudit.action, "cancel")))).length, 1)
      assert.ok((await tx.select().from(reports).where(inArray(reports.id, [missing.id, discovery.id]))).every(row => row.status === "diproses"))
      await execute({ type: "match", lossTicket: missing.ticket, foundTicket: discovery.ticket })
      const [replacement] = await tx.select().from(lostFoundMatches).where(eq(lostFoundMatches.lossReportId, missing.id))
      const handover = { type: "handover", matchId: replacement.id, officerId, recipient: "Pemilik", location: "Pos", note: "", ownershipEvidence: "Ciri khusus sesuai", submissionKey: randomUUID() }
      await execute(handover)
      await execute(handover)
      await assert.rejects(execute({ ...handover, recipient: "Orang lain" }), /data berbeda/)
      assert.equal((await tx.select().from(reportHandovers).where(eq(reportHandovers.matchId, replacement.id))).length, 1)
      const complete = await tx.select().from(reports).where(inArray(reports.id, [missing.id, discovery.id]))
      assert.ok(complete.every(row => row.status === "selesai" && row.completedAt))
      assert.ok((await tx.select().from(lostFoundMatches).where(eq(lostFoundMatches.id, replacement.id)))[0].completedAt)
      assert.equal((await tx.select().from(reportStatusHistory).where(and(eq(reportStatusHistory.reportId, missing.id), eq(reportStatusHistory.toStatus, "diserahkan")))).length, 1)
      assert.equal((await tx.select().from(notifications).where(and(eq(notifications.reportId, missing.id), eq(notifications.title, "Laporan selesai")))).length, 1)
      await assert.rejects(execute({ type: "cancel-match", matchId: replacement.id, note: "Salah" }), /tidak dapat dibatalkan/)

      const selfFound = await loss()
      await execute({ type: "close", ticket: selfFound.ticket, expectedStatus: "baru", reason: "self_found", note: "Dikonfirmasi pemilik" })
      assert.equal((await tx.select().from(reports).where(eq(reports.id, selfFound.id)))[0].status, "selesai")
      assert.equal((await tx.select().from(reportHandovers).where(eq(reportHandovers.lossReportId, selfFound.id))).length, 0)
      assert.equal((await tx.select().from(operationalAudit).where(eq(operationalAudit.entityId, selfFound.id))).length, 1)
      await assert.rejects(execute({ type: "close", ticket: selfFound.ticket, expectedStatus: "baru", reason: "self_found", note: "Ulang" }), /berubah/)
      throw rollback
    }) } catch (cause) { if (cause !== rollback) throw cause }
  } finally { await pool.end() }
})
