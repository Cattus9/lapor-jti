import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, reportDrafts, reportAttachments, reports } from "../src/db/schema"
import { reportCategories, emptyReportPayload } from "../src/features/reports/domain/report"
import { DrizzleReportRepository } from "../src/features/reports/infrastructure/drizzle-report-repository"
import { ReportService } from "../src/features/reports/application/report-service"
import type { AttachmentStorage } from "../src/features/reports/application/ports"

test("Category resume is bounded, owner scoped, ignores submitted/unsupported drafts, restores files/area, and keeps revision conflicts atomic", { skip: process.env.NODE_ENV !== "development" ? "Local development PostgreSQL required" : false }, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl()).hostname))
  const { db, pool } = createDatabaseClient(), owner = randomUUID(), foreign = randomUUID(), rollback = Symbol("category-drafts-rollback")
  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values([owner, foreign].map((id) => ({ id, name: "Category draft fixture", email: `${id}@example.invalid`, role: "pelapor" as const })))
        const repository = new DrizzleReportRepository(tx as unknown as ConstructorParameters<typeof DrizzleReportRepository>[0])
        const removedIds: string[] = []
        const storage: AttachmentStorage = {
          store: async (files) => files.map((file) => ({ id: randomUUID(), name: file.name, mimeType: file.mimeType, size: file.bytes.length, storageKey: randomUUID() })),
          remove: async (files) => { removedIds.push(...files.map((file) => file.id)) }, read: async () => new Uint8Array(),
        }
        const service = new ReportService(repository, storage), actor = { id: owner, role: "pelapor" }
        const originals = new Map<string, string>()
        for (const category of reportCategories) {
          const id = randomUUID(); originals.set(category, id)
          const payload = { ...emptyReportPayload, category, title: `Draft ${category}`, facilityAreaId: category === "fasilitas" ? "area-partial-only" : "", incidentTimeMode: "automatic" as const }
          await tx.insert(reportDrafts).values({ id: randomUUID(), reporterId: owner, payload: { ...payload, title: "Older" }, updatedAt: new Date("2020-01-01") })
          const saved = await service.write(actor, { id, revision: 0, payload }, category === "fasilitas" ? [{ name: "fixture.pdf", mimeType: "application/pdf", bytes: new TextEncoder().encode("%PDF-fixture") }] : [], false)
          assert.equal(saved.draft?.revision, 1)
        }
        const facilityId = originals.get("fasilitas")!
        await tx.insert(reportDrafts).values({ id: randomUUID(), reporterId: foreign, payload: { ...emptyReportPayload, category: "fasilitas", title: "Private" }, updatedAt: new Date("2099-01-01") })
        await tx.insert(reportDrafts).values({ id: randomUUID(), reporterId: owner, schemaVersion: 2, payload: { ...emptyReportPayload, title: "Unsupported" }, updatedAt: new Date("2099-01-01") })
        const [submitted] = await tx.insert(reports).values({ submissionKey: randomUUID(), ticketNumber: `DRAFT-${owner}`, reporterId: owner, category: "lainnya", handlerRole: "manajemen", title: "Submitted", description: "Fixture", locationText: "Fixture", incidentDate: "2026-10-25", incidentTime: "09:00" }).returning()
        await tx.insert(reportDrafts).values({ id: randomUUID(), reporterId: owner, submittedReportId: submitted.id, payload: { ...emptyReportPayload, title: "Submitted draft" }, updatedAt: new Date("2099-01-01") })
        const resumed = await service.categoryDrafts(actor)
        assert.equal(resumed.length, 4)
        for (const draft of resumed) assert.equal(draft.id, originals.get(draft.payload.category))
        const facility = resumed.find((draft) => draft.id === facilityId)!
        assert.equal(facility.payload.facilityAreaId, "area-partial-only")
        assert.equal(facility.attachments.length, 1)
        assert.equal(facility.attachments[0].name, "fixture.pdf")
        assert.equal((await tx.select().from(reportAttachments).where(eq(reportAttachments.draftId, facility.id))).length, 1)
        assert.equal((await service.draft(actor, facility.id)).attachments[0].id, facility.attachments[0].id)
        await assert.rejects(service.draft({ id: foreign, role: "pelapor" }, facility.id))
        await assert.rejects(service.write(actor, { id: facility.id, revision: 0, payload: facility.payload, retainedAttachmentIds: [] }, [], false), /Draft telah berubah/)
        assert.equal((await repository.draft(owner, facility.id))?.attachments.length, 1, "Conflicting update must not remove saved attachments")
        const updated = await service.write(actor, { id: facility.id, revision: 1, payload: { ...facility.payload, title: "Updated" }, retainedAttachmentIds: facility.attachments.map((file) => file.id) }, [], false)
        assert.equal(updated.draft?.revision, 2)
        assert.equal((await service.categoryDrafts(actor)).find((draft) => draft.id === facility.id)?.payload.title, "Updated")
        assert.equal((await service.categoryDrafts(actor)).find((draft) => draft.payload.category === "lainnya")?.payload.title, "Draft lainnya")
        await assert.rejects(service.write({ id: foreign, role: "pelapor" }, { id: facility.id, revision: 2, payload: { ...emptyReportPayload, category: "fasilitas" } }, [], false))
        await assert.rejects(service.write(actor, { id: facility.id, revision: 1, payload: { ...emptyReportPayload, category: "fasilitas" } }, [], false), /Draft telah berubah/)
        assert.ok(await repository.draft(owner, facility.id), "Unauthorized/stale clear must retain the draft")
        const cleared = await service.write(actor, { id: facility.id, revision: 2, payload: { ...emptyReportPayload, category: "fasilitas" } }, [], false)
        assert.equal(cleared.clearedDraftId, facility.id)
        assert.equal(await repository.draft(owner, facility.id), null)
        assert.deepEqual(await tx.select().from(reportAttachments).where(eq(reportAttachments.draftId, facility.id)), [])
        assert.ok(removedIds.includes(facility.attachments[0].id), "Private file cleanup follows successful draft deletion")
        const emptyId = randomUUID()
        assert.equal((await service.write(actor, { id: emptyId, revision: 0, payload: emptyReportPayload }, [], false)).clearedDraftId, emptyId)
        assert.equal(await repository.draft(owner, emptyId), null, "Blank requests must not leave empty draft records")
        assert.ok(await repository.draft(owner, originals.get("lainnya")!), "Clearing one draft must preserve other drafts")
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.deepEqual(await db.select({ id: users.id }).from(users).where(eq(users.id, owner)), [])
  } finally { await pool.end() }
})
