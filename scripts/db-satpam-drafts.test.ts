import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { and, eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reportDrafts, reportAttachments, reports, satpamLossReports } from "../src/db/schema"
import { emptySatpamDraft } from "../src/features/lost-found/domain/satpam-draft"
import { DrizzleSatpamDrafts } from "../src/features/lost-found/infrastructure/drizzle-satpam-drafts"
import { DrizzleSatpamRepository } from "../src/features/lost-found/infrastructure/drizzle-satpam-repository"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"

test("Satpam drafts isolate owners, preserve photos and submit a loss only once", { skip: process.env.NODE_ENV !== "development" }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient("migration"), rollback = Symbol("rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        const ownerId = randomUUID(), otherId = randomUUID(), draftId = randomUUID(), photoId = randomUUID()
        await tx.insert(users).values([{ id: ownerId, email: `${ownerId}@example.invalid`, name: "Satpam", role: "satpam" }, { id: otherId, email: `${otherId}@example.invalid`, name: "Satpam lain", role: "satpam" }])
        const actor = { id: ownerId, role: "satpam" }, other = { id: otherId, role: "satpam" }
        const repository = new DrizzleSatpamDrafts(tx as unknown as ConstructorParameters<typeof DrizzleSatpamDrafts>[0])
        const lost = new DrizzleSatpamRepository(tx as unknown as ConstructorParameters<typeof DrizzleSatpamRepository>[0])
        const fields = { ...emptySatpamDraft("kehilangan"), ownerName: "Pemilik", ownerContact: "081234", title: "Dompet hilang", itemName: "Dompet", location: "Ruang kelas", description: "Dompet warna hitam." }
        const photo = { id: photoId, storageKey: randomUUID(), name: "dompet.png", mimeType: "image/png", size: 8 }
        const first = await repository.write(actor, { id: draftId, revision: 0, fields, retainedPhotoId: null }, photo)
        assert.equal(first.draft?.revision, 1)
        assert.equal((await repository.list(ownerId))[0].photo?.id, photoId)
        assert.equal((await repository.list(otherId)).length, 0)
        const reporterRepository = new DrizzleReportRepository(tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0])
        assert.equal(await reporterRepository.draft(ownerId, draftId), null)
        assert.equal((await reporterRepository.categoryDrafts(ownerId)).length, 0)
        assert.equal((await reporterRepository.list(ownerId)).drafts.length, 0)
        assert.equal(await repository.photo(otherId, draftId, photoId), null)
        await assert.rejects(repository.write(other, { id: draftId, revision: 1, fields, retainedPhotoId: photoId }), /tidak ditemukan/i)
        await assert.rejects(repository.write(actor, { id: randomUUID(), revision: 0, fields, retainedPhotoId: null }), /sesi lain/i)
        await assert.rejects(repository.write(actor, { id: draftId, revision: 0, fields, retainedPhotoId: photoId }), /berubah/i)
        const saved = await repository.write(actor, { id: draftId, revision: 1, fields, retainedPhotoId: photoId })
        assert.equal(saved.draft?.revision, 2)
        assert.equal(saved.draft?.photo?.id, photoId)
        const command = { ownerName: fields.ownerName, ownerContact: fields.ownerContact, title: fields.title, itemName: fields.itemName, location: fields.location, description: fields.description, characteristics: fields.description, incidentDate: "", incidentTime: "", submissionKey: draftId, draftRevision: "2" }
        await assert.rejects(lost.createLossReport(actor, { ...command, description: "Berbeda" }), /berbeda dari draft/i)
        const created = await lost.createLossReport(actor, command)
        const retried = await lost.createLossReport(actor, command)
        assert.equal(retried.id, created.id)
        const [draft] = await tx.select().from(reportDrafts).where(eq(reportDrafts.id, draftId))
        assert.equal(draft.submittedReportId, created.id)
        assert.equal((await repository.list(ownerId)).length, 0)
        const [attachment] = await tx.select().from(reportAttachments).where(eq(reportAttachments.id, photoId))
        assert.equal(attachment.draftId, null)
        assert.equal(attachment.reportId, created.id)
        const [report] = await tx.select().from(reports).where(eq(reports.id, created.id))
        assert.equal(report.status, "baru")
        assert.equal(report.submissionKey, draftId)
        assert.equal((await tx.select().from(satpamLossReports).where(and(eq(satpamLossReports.id, created.id), eq(satpamLossReports.ownerName, "Pemilik")))).length, 1)
        await assert.rejects(repository.write(actor, { id: draftId, revision: 2, fields, retainedPhotoId: null }), /sudah disimpan/i)
        const emptyId = randomUUID(), found = { ...emptySatpamDraft("temuan"), itemName: "Kunci" }
        await repository.write(actor, { id: emptyId, revision: 0, fields: found, retainedPhotoId: null })
        const clear = { id: emptyId, revision: 1, fields: emptySatpamDraft("temuan"), retainedPhotoId: null }
        assert.equal((await repository.write(actor, clear)).clearedDraftId, emptyId)
        assert.equal((await repository.write(actor, clear)).clearedDraftId, emptyId)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
  } finally { await pool.end() }
})
