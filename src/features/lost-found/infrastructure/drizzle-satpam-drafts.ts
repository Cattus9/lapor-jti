import "server-only"
import { createHash } from "node:crypto"
import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { users, reportDrafts, reportAttachments } from "@/db/schema"
import { isUuid, ReportError, type ReportActor, type StoredAttachment } from "../../reports/domain/report"
import { hasSatpamDraftContent, parseSatpamDraft, toStoredSatpamPayload, type SatpamDraftPhoto, type SatpamDraftView, type parseSatpamDraftWrite } from "../domain/satpam-draft"

type Database = ReturnType<typeof getDb>
type Write = ReturnType<typeof parseSatpamDraftWrite>
const photoView = (file: StoredAttachment): SatpamDraftPhoto => ({ id: file.id, name: file.name, mimeType: file.mimeType, size: file.size })

export class DrizzleSatpamDrafts {
  constructor(private readonly db: Database = getDb()) {}

  async list(ownerId: string): Promise<SatpamDraftView[]> {
    const kind = sql<string>`${reportDrafts.payload}->>'kind'`
    const rows = await this.db.selectDistinctOn([kind]).from(reportDrafts)
      .where(and(eq(reportDrafts.reporterId, ownerId), eq(reportDrafts.schemaVersion, 2), isNull(reportDrafts.submittedReportId), inArray(kind, ["kehilangan", "temuan"])))
      .orderBy(kind, desc(reportDrafts.updatedAt), desc(reportDrafts.id)).limit(2)
    const photos = rows.length ? await this.db.select().from(reportAttachments).where(and(eq(reportAttachments.ownerId, ownerId), inArray(reportAttachments.draftId, rows.map((row) => row.id)))) : []
    return rows.map((row) => ({ id: row.id, revision: row.revision, fields: parseSatpamDraft(row.payload), photo: photos.find((photo) => photo.draftId === row.id) ? photoView(photos.find((photo) => photo.draftId === row.id)!) : null }))
  }

  async photo(ownerId: string, draftId: string, photoId: string): Promise<StoredAttachment | null> {
    if (!isUuid(draftId) || !isUuid(photoId)) return null
    const [file] = await this.db.select({ file: reportAttachments }).from(reportAttachments).innerJoin(reportDrafts, eq(reportDrafts.id, reportAttachments.draftId))
      .where(and(eq(reportDrafts.id, draftId), eq(reportDrafts.reporterId, ownerId), eq(reportDrafts.schemaVersion, 2), isNull(reportDrafts.submittedReportId), eq(reportAttachments.ownerId, ownerId), eq(reportAttachments.id, photoId))).limit(1)
    return file?.file ?? null
  }

  async write(actor: ReportActor, input: Write, staged?: StoredAttachment) {
    const signature = createHash("sha256").update(JSON.stringify({ fields: input.fields, retainedPhotoId: input.retainedPhotoId, photo: staged ? { name: staged.name, mimeType: staged.mimeType, size: staged.size, digest: staged.digest ?? null } : null })).digest("hex")
    return this.db.transaction(async (tx) => {
      const [user] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true))).for("share")
      if (!user || actor.role !== "satpam") throw new ReportError("Akun tidak memiliki akses Satpam.", 403)
      if (staged && input.retainedPhotoId) throw new ReportError("Pilih satu foto draft.")
      let [draft] = await tx.select().from(reportDrafts).where(eq(reportDrafts.id, input.id)).for("update")
      // Retrying a confirmed deletion after a lost response must not recreate an empty draft.
      if (!draft && input.revision > 0 && !input.retainedPhotoId && !hasSatpamDraftContent(input.fields, Boolean(staged))) return { clearedDraftId: input.id, removed: [] }
      if (!draft && input.revision !== 0) throw new ReportError("Draft telah berubah. Muat ulang untuk menghindari data tertimpa.", 409)
      if (!draft) {
        await tx.insert(reportDrafts).values({ id: input.id, reporterId: actor.id, payload: toStoredSatpamPayload(input.fields), schemaVersion: 2 }).onConflictDoNothing()
        ;[draft] = await tx.select().from(reportDrafts).where(eq(reportDrafts.id, input.id)).for("update")
      }
      if (!draft) throw new ReportError("Draft jenis ini sudah dibuat di sesi lain. Periksa kedua sesi sebelum memuat ulang.", 409)
      if (draft.reporterId !== actor.id || draft.schemaVersion !== 2) throw new ReportError("Draft tidak ditemukan.", 404)
      if (draft.submittedReportId) throw new ReportError("Draft sudah disimpan sebagai laporan.", 409)
      if (draft.revision !== input.revision) {
        const previous = draft.payload as unknown as Record<string, unknown>
        if (input.writeId && draft.revision === input.revision + 1 && previous.satpamWriteId === input.writeId && previous.satpamWriteSignature === signature) {
          const [file] = await tx.select().from(reportAttachments).where(and(eq(reportAttachments.draftId, draft.id), eq(reportAttachments.ownerId, actor.id))).limit(1)
          return { draft: { id: draft.id, revision: draft.revision, fields: parseSatpamDraft(draft.payload), photo: file ? photoView(file) : null }, removed: [], reused: true }
        }
        throw new ReportError("Draft telah berubah. Muat ulang untuk menghindari data tertimpa.", 409)
      }
      if (parseSatpamDraft(draft.payload).kind !== input.fields.kind) throw new ReportError("Jenis draft tidak dapat diubah.", 409)
      const existing = await tx.select().from(reportAttachments).where(and(eq(reportAttachments.draftId, draft.id), eq(reportAttachments.ownerId, actor.id)))
      const retained = input.retainedPhotoId ? existing.find((file) => file.id === input.retainedPhotoId) : undefined
      if (input.retainedPhotoId && !retained) throw new ReportError("Foto bukan milik draft ini.")
      const removed = existing.filter((file) => file.id !== retained?.id)
      if (!hasSatpamDraftContent(input.fields, Boolean(retained || staged))) {
        await tx.delete(reportDrafts).where(eq(reportDrafts.id, draft.id))
        return { clearedDraftId: draft.id, removed }
      }
      if (removed.length) await tx.delete(reportAttachments).where(inArray(reportAttachments.id, removed.map((file) => file.id)))
      if (staged) await tx.insert(reportAttachments).values({ ...staged, ownerId: actor.id, draftId: draft.id })
      const [saved] = await tx.update(reportDrafts).set({ payload: toStoredSatpamPayload(input.fields, input.writeId, signature), revision: draft.revision + 1, updatedAt: new Date() }).where(eq(reportDrafts.id, draft.id)).returning()
      return { draft: { id: saved.id, revision: saved.revision, fields: input.fields, photo: staged ? photoView(staged) : retained ? photoView(retained) : null }, removed }
    })
  }
}
