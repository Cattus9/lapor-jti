import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reports, reportStatusHistory, notifications } from "../src/db/schema"
import { DrizzleTechnicianRepository } from "../src/features/facilities/infrastructure/drizzle-technician-repository"
import { TechnicianService } from "../src/features/facilities/application/technician-service"
import { reportLifecycleForStatus } from "../src/features/reports/domain/report"

test("Direct completion preserves old status history, scopes roles and reports, and notifies the reporter", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient("migration"), rollback = Symbol("rollback")
  const reporterId = randomUUID(), technicianId = randomUUID(), satpamId = randomUUID()
  try {
    try {
      await db.transaction(async tx => {
        await tx.insert(users).values([
          { id: reporterId, email: `${reporterId}@example.invalid`, name: "Pelapor uji", role: "pelapor" },
          { id: technicianId, email: `${technicianId}@example.invalid`, name: "Teknisi uji", role: "teknisi" },
          { id: satpamId, email: `${satpamId}@example.invalid`, name: "Satpam uji", role: "satpam" },
        ])
        const statuses = ["baru", "diverifikasi", "diproses"] as const
        const base = { reporterId, category: "fasilitas" as const, handlerRole: "teknisi" as const, title: "Fasilitas uji", description: "Kerusakan fixture", incidentDate: "2026-10-01", incidentTime: "09:00", locationText: "Lokasi uji" }
        const rows = statuses.map(status => ({ ...base, id: randomUUID(), ticketNumber: `LJ-2097-${randomInt(100000000000, 999999999999)}`, submissionKey: randomUUID(), status }))
        const rejected = { ...base, id: randomUUID(), ticketNumber: `LJ-2097-${randomInt(100000000000, 999999999999)}`, submissionKey: randomUUID(), status: "diverifikasi" as const }
        await tx.insert(reports).values([...rows, rejected])
        await tx.insert(reportStatusHistory).values(rows.slice(1).map(row => ({ reportId: row.id, actorId: technicianId, actorName: "Teknisi uji", fromStatus: "baru" as const, toStatus: row.status, note: "Status lama" })))
        const repository = new DrizzleTechnicianRepository(tx as unknown as ConstructorParameters<typeof DrizzleTechnicianRepository>[0])
        const service = new TechnicianService(repository, {} as ConstructorParameters<typeof TechnicianService>[1])
        const technician = { id: technicianId, role: "teknisi" }, satpam = { id: satpamId, role: "satpam" }
        await assert.rejects(service.execute(satpam, { ticket: rows[0].ticketNumber, status: "selesai", note: "Selesai" }), /Teknisi/)
        await assert.rejects(service.execute(technician, { ticket: rows[0].ticketNumber, status: "diproses" }), /status tidak valid/i)
        await assert.rejects(service.execute(technician, { ticket: rows[0].ticketNumber, status: "selesai", note: " " }), /Catatan/)
        for (const row of rows) {
          assert.equal(reportLifecycleForStatus("fasilitas", row.status)[0], row.status)
          await service.execute(technician, { ticket: row.ticketNumber, status: "selesai", note: "Lampu diperbaiki dan diuji." })
          const detail = await repository.detail(row.ticketNumber)
          assert.equal(detail?.report.status, "Selesai")
          assert.ok(detail?.report.completedAt)
          assert.equal(detail?.history.at(-1)?.note, "Lampu diperbaiki dan diuji.")
          if (row.status !== "baru") assert.ok(detail?.history.some(entry => entry.note === "Status lama"))
          await assert.rejects(service.execute(technician, { ticket: row.ticketNumber, status: "selesai", note: "Ulang" }), /berubah/)
        }
        await service.execute(technician, { ticket: rejected.ticketNumber, status: "ditolak", note: "Laporan duplikat." })
        assert.equal((await repository.detail(rejected.ticketNumber))?.report.status, "Ditolak")
        const sent = await tx.select().from(notifications).where(and(eq(notifications.recipientId, reporterId), inArray(notifications.reportId, [...rows, rejected].map(row => row.id))))
        assert.equal(sent.length, 4)
        assert.ok(sent.every(entry => entry.description.includes("diperbaiki") || entry.description.includes("duplikat")))
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
  } finally { await pool.end() }
})
