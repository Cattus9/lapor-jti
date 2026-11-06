import "server-only"
import { createHash } from "node:crypto"
import { and, asc, desc, eq, exists, ilike, inArray, lt, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getDb } from "@/db"
import { users, reports, reportAttachments, reportLostFoundDetails, reportStatusHistory, notifications, satpamInventory, securityOfficers, reportHandovers, lostFoundMatches, operationalAudit } from "@/db/schema"
import { isUuid, ReportError, type ReportActor } from "../../reports/domain/report"
import { assertInventoryReportCompletable, validateCreateInventory, validateHandoverInventory, validateInventoryCorrection, type InventoryFilter, type InventoryItem } from "../domain/inventory"
import type { SatpamPage } from "../types"

type Database = ReturnType<typeof getDb>
export type InventoryPhoto = { storageKey: string; mimeType: string; name: string; digest?: string }
const source = alias(reports, "inventory_source"), loss = alias(reports, "inventory_loss")
const dateLabel = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date)
const hash = (value: unknown) => createHash("sha256").update(JSON.stringify(value)).digest("hex")
const escaped = (v: string) => `%${v.replace(/[\\%_]/g, "\\$&")}%`

export class DrizzleInventoryRepository {
  constructor(private readonly db: Database = getDb()) {}
  private query() {
    return this.db.select({ item: satpamInventory, handover: reportHandovers, sourceTicket: source.ticketNumber, sourceTitle: source.title, sourceSubmittedAt: source.submittedAt, lossTicket: loss.ticketNumber,
      sourcePhotoId: sql<string | null>`(select ${reportAttachments.id} from ${reportAttachments} where ${reportAttachments.reportId} = ${satpamInventory.sourceFoundReportId} and ${reportAttachments.mimeType} like 'image/%' order by ${reportAttachments.createdAt}, ${reportAttachments.id} limit 1)` })
      .from(satpamInventory).leftJoin(reportHandovers, eq(reportHandovers.inventoryId, satpamInventory.id))
      .leftJoin(source, eq(source.id, satpamInventory.sourceFoundReportId)).leftJoin(loss, eq(loss.id, reportHandovers.lossReportId))
  }
  private view(row: Awaited<ReturnType<DrizzleInventoryRepository["query"]>>[number]): InventoryItem {
    const { item: r, handover: h } = row
    return {
      id: r.id, itemName: r.itemName, description: r.description, founderName: r.founderName ?? undefined,
      status: r.status as InventoryItem["status"], storageLocation: r.storageLocation, foundLocation: r.foundLocation ?? undefined,
      // Legacy external links remain in the DB for audit, but are never fetched by the UI.
      photoUrl: r.photoStorageKey || row.sourcePhotoId ? `/api/satpam/inventory/${r.id}/photo?preview=1` : undefined,
      hasStoredPhoto: Boolean(r.photoStorageKey || row.sourcePhotoId), handoverRecipient: r.handoverRecipient ?? undefined,
      handoverRecipientEmail: r.handoverRecipientEmail ?? h?.recipientEmail ?? undefined,
      handoverRecipientPhone: r.handoverRecipientPhone ?? h?.recipientPhone ?? undefined,
      handoverPhotoUrl: (h?.photoStorageKey || r.handoverPhotoStorageKey) && h?.id ? `/api/satpam/handovers/${h.id}/photo?preview=1` : undefined,
      handoverNote: r.handoverNote ?? undefined, handedOverAt: r.handedOverAt ? dateLabel(r.handedOverAt) : undefined,
      handoverOfficer: h?.officerName, handoverActor: h?.actorName, ownershipEvidence: h?.ownershipEvidence,
      sourceFoundSubmittedAt: row.sourceSubmittedAt ? dateLabel(row.sourceSubmittedAt) : undefined, matchingDateIso: (row.sourceSubmittedAt ?? r.createdAt).toISOString(),
      legacyHandover: h?.legacy, sourceFoundTicket: row.sourceTicket ?? undefined, sourceFoundTitle: row.sourceTitle ?? undefined,
      linkedLossTicket: row.lossTicket ?? undefined, registeredByName: r.registeredByName,
      createdAt: dateLabel(r.createdAt), updatedAt: dateLabel(r.updatedAt), version: r.updatedAt.toISOString(),
    }
  }
  async detail(id: string) {
    const [row] = await this.query().where(eq(satpamInventory.id, id)).limit(1)
    if (!row) return null
    const changes = await this.db.select().from(operationalAudit).where(and(eq(operationalAudit.entity, "satpam_inventory"), eq(operationalAudit.entityId, id))).orderBy(desc(operationalAudit.createdAt)).limit(50)
    return { ...this.view(row), corrections: changes.map(change => ({ actor: change.actorName, at: dateLabel(change.createdAt), reason: String((change.after as { reason?: string } | null)?.reason ?? "Koreksi informasi barang") })) }
  }
  async list(filter: InventoryFilter): Promise<SatpamPage<InventoryItem>> {
    let after: { date: Date; id: string } | undefined
    if (filter.cursor) {
      const [date, id] = Buffer.from(filter.cursor, "base64url").toString("utf8").split("|")
      if (!isUuid(id) || !date || !Number.isFinite(Date.parse(date))) throw new ReportError("Pagination tidak valid.")
      after = { date: new Date(date), id }
    }
    const criteria = and(filter.status && filter.status !== "semua" ? eq(satpamInventory.status, filter.status) : undefined,
      filter.query ? or(...[satpamInventory.itemName, satpamInventory.description, satpamInventory.founderName, satpamInventory.storageLocation, satpamInventory.foundLocation, satpamInventory.handoverRecipient].map((column) => ilike(column, escaped(filter.query!))),
        exists(this.db.select({ id: reports.id }).from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).where(and(
          eq(reports.id, satpamInventory.sourceFoundReportId), eq(reports.handlerRole, "satpam"), eq(reports.category, "kehilangan-temuan"),
          or(...[reports.title, reports.description, reports.locationText, reportLostFoundDetails.itemDetails].map(column => ilike(column, escaped(filter.query!))))
        )))) : undefined)
    return this.db.transaction(async tx => {
      const repo = new DrizzleInventoryRepository(tx as unknown as Database)
      const rows = await repo.query().where(and(criteria, after ? or(lt(satpamInventory.createdAt, after.date), and(eq(satpamInventory.createdAt, after.date), lt(satpamInventory.id, after.id))) : undefined))
        .orderBy(desc(satpamInventory.createdAt), desc(satpamInventory.id)).limit(21)
      const [total] = await tx.select({ count: sql<number>`count(*)::integer` }).from(satpamInventory).where(criteria)
      const page = rows.slice(0, 20), last = page.at(-1)?.item
      return { items: page.map(row => repo.view(row)), total: total.count, nextCursor: rows.length > 20 && last ? Buffer.from(`${last.createdAt.toISOString()}|${last.id}`).toString("base64url") : null }
    }, { isolationLevel: "repeatable read", accessMode: "read only" })
  }
  private async receiveSource(tx: Parameters<Parameters<Database["transaction"]>[0]>[0], actor: ReportActor, actorName: string, ticket: string) {

        const [report] = await tx.select({ report: reports, kind: reportLostFoundDetails.kind }).from(reports)
          .innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id))
          .where(and(eq(reports.ticketNumber, ticket), eq(reports.handlerRole, "satpam"), eq(reports.category, "kehilangan-temuan"))).for("update", { of: reports })
        if (!report || report.kind !== "temuan") throw new ReportError("Laporan temuan tidak ditemukan.", 404)
        const [occupied] = await tx.select({ id: satpamInventory.id }).from(satpamInventory).where(eq(satpamInventory.sourceFoundReportId, report.report.id))
        if (occupied) throw new ReportError("Laporan ini sudah tercatat di Inventaris. Buka barang yang sudah ada.", 409)
        const [pair] = await tx.select({ id: lostFoundMatches.id }).from(lostFoundMatches).where(eq(lostFoundMatches.foundReportId, report.report.id))
        if (pair || !["baru", "diproses"].includes(report.report.status)) throw new ReportError("Laporan sudah ditangani melalui jalur lain.", 409)
        const sourceId = report.report.id
        await tx.update(reports).set({ status: "diproses", updatedAt: new Date() }).where(eq(reports.id, sourceId))
        await tx.insert(reportStatusHistory).values({ reportId: sourceId, actorId: actor.id, actorName: actorName, fromStatus: report.report.status, toStatus: "diproses", note: "Barang fisik diterima dan dicatat di Inventaris Pos Satpam." })
        await tx.insert(notifications).values({ recipientId: report.report.reporterId, reportId: sourceId, kind: "status", title: "Barang diterima di pos", description: "Satpam telah menerima barang secara fisik dan mencatatnya di Inventaris." })
      return sourceId
  }
  async correct(actor: ReportActor, id: string, raw: unknown) {
    if (!isUuid(id)) throw new ReportError("Barang tidak ditemukan.", 404)
    const input = validateInventoryCorrection(raw)
    return this.db.transaction(async tx => {
      const [account] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true))).for("share")
      if (!account) throw new ReportError("Akun tidak memiliki akses Satpam.", 403)
      // Report locks precede the inventory lock, as in physical receipt and handover.
      const [seed] = await tx.select().from(satpamInventory).where(eq(satpamInventory.id, id))
      if (!seed) throw new ReportError("Barang tidak ditemukan.", 404)
      let sourceId = seed.sourceFoundReportId
      if (input.sourceFoundTicket) {
        if (sourceId) {
          const [sourceReport] = await tx.select({ ticket: reports.ticketNumber }).from(reports).where(eq(reports.id, sourceId))
          if (sourceReport?.ticket !== input.sourceFoundTicket) throw new ReportError("Laporan asal yang sudah terhubung tidak dapat diganti.", 409)
        } else sourceId = await this.receiveSource(tx, actor, account.name, input.sourceFoundTicket)
      }
      const [before] = await tx.select().from(satpamInventory).where(eq(satpamInventory.id, id)).for("update")
      if (before.status !== "tersimpan" || before.updatedAt.toISOString() !== input.version) throw new ReportError("Barang sudah berubah atau telah diserahkan. Muat ulang data.", 409)
      const fields = { itemName: input.itemName, description: input.description ?? "", founderName: input.founderName ?? null, foundLocation: input.foundLocation ?? null, storageLocation: input.storageLocation, sourceFoundReportId: sourceId }
      await tx.update(satpamInventory).set({ ...fields, updatedAt: sql`greatest(clock_timestamp(), ${satpamInventory.updatedAt} + interval '1 millisecond')` }).where(eq(satpamInventory.id, id))
      const previous = { itemName: before.itemName, description: before.description, founderName: before.founderName, foundLocation: before.foundLocation, storageLocation: before.storageLocation, sourceFoundReportId: before.sourceFoundReportId }
      await tx.insert(operationalAudit).values({ actorId: actor.id, actorName: account.name, entity: "satpam_inventory", entityId: id, action: "correct", before: previous, after: { ...fields, reason: input.reason } })
      return (await new DrizzleInventoryRepository(tx as unknown as Database).detail(id))!
    })
  }
  async create(actor: ReportActor, raw: unknown, photo?: InventoryPhoto) {
    const input = validateCreateInventory(raw)
    const fingerprint = hash({ actor: actor.id, ...input, photo: photo ? { name: photo.name, digest: photo.digest ?? photo.storageKey } : null })
    return this.db.transaction(async tx => {
      const repo = new DrizzleInventoryRepository(tx as unknown as Database)
      const [account] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true))).for("share")
      if (!account) throw new ReportError("Akun tidak memiliki akses Satpam.", 403)
      if (input.submissionKey) {
        await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.submissionKey}, 0))`)
        const [existing] = await tx.select().from(satpamInventory).where(eq(satpamInventory.submissionKey, input.submissionKey))
        if (existing) {
          if (existing.submissionFingerprint !== fingerprint) throw new ReportError("Kunci pengiriman telah digunakan untuk data berbeda.", 409)
          return (await repo.detail(existing.id))!
        }
      }
      const sourceId = input.sourceFoundTicket ? await this.receiveSource(tx, actor, account.name, input.sourceFoundTicket) : undefined
      const [created] = await tx.insert(satpamInventory).values({ itemName: input.itemName, description: input.description, founderName: input.founderName,
        foundLocation: input.foundLocation, sourceFoundReportId: sourceId, submissionKey: input.submissionKey, submissionFingerprint: fingerprint,
        photoStorageKey: photo?.storageKey, photoMimeType: photo?.mimeType, photoName: photo?.name, registeredBy: actor.id, registeredByName: account.name }).returning()
      return (await repo.detail(created.id))!
    })
  }
  async handover(actor: ReportActor, raw: unknown, photo?: InventoryPhoto) {
    const input = validateHandoverInventory(raw)
    const fingerprint = hash({ actor: actor.id, ...input })
    return this.db.transaction(async tx => {
      const repo = new DrizzleInventoryRepository(tx as unknown as Database)
      const [account] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true))).for("share")
      if (!account) throw new ReportError("Akun tidak memiliki akses Satpam.", 403)
      await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${input.submissionKey}, 0))`)
      const [retry] = await tx.select().from(reportHandovers).where(eq(reportHandovers.submissionKey, input.submissionKey))
      if (retry) {
        if (retry.submissionFingerprint !== fingerprint) throw new ReportError("Kunci penyerahan telah digunakan untuk data berbeda.", 409)
        return (await repo.detail(input.id))!
      }
      const [seed] = await tx.select().from(satpamInventory).where(eq(satpamInventory.id, input.id))
      if (!seed) throw new ReportError("Barang inventaris tidak ditemukan.", 404)
      // Lock every involved report first in UUID order, consistently with pair matching.
      const linked = await tx.select({ report: reports, kind: reportLostFoundDetails.kind }).from(reports)
        .innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id))
        .where(or(seed.sourceFoundReportId ? eq(reports.id, seed.sourceFoundReportId) : undefined, input.lossTicket ? eq(reports.ticketNumber, input.lossTicket) : undefined) ?? sql`false`)
        .orderBy(asc(reports.id)).for("update", { of: reports })
      const lossReport = input.lossTicket ? linked.find(r => r.report.ticketNumber === input.lossTicket) : undefined
      if (input.lossTicket && (!lossReport || lossReport.kind !== "kehilangan")) throw new ReportError("Laporan kehilangan tidak ditemukan.", 404)
      if (seed.sourceFoundReportId && !linked.some(r => r.report.id === seed.sourceFoundReportId && r.kind === "temuan")) throw new ReportError("Relasi temuan tidak valid.", 409)
      for (const r of linked) assertInventoryReportCompletable(r.report)
      const ids = linked.map(r => r.report.id)
      if (ids.length) {
        const [pair] = await tx.select({ id: lostFoundMatches.id }).from(lostFoundMatches).where(or(inArray(lostFoundMatches.lossReportId, ids), inArray(lostFoundMatches.foundReportId, ids))).limit(1)
        if (pair) throw new ReportError("Laporan sudah mempunyai pasangan. Gunakan penyerahan pasangan tersebut.", 409)
      }
      const [item] = await tx.select().from(satpamInventory).where(eq(satpamInventory.id, input.id)).for("update")
      if (item.sourceFoundReportId !== seed.sourceFoundReportId) throw new ReportError("Laporan asal barang berubah. Muat ulang sebelum menyerahkan.", 409)
      if (item.status !== "tersimpan") throw new ReportError("Barang sudah diserahkan. Muat ulang data.", 409)
      const [officer] = await tx.select().from(securityOfficers).where(and(eq(securityOfficers.id, input.officerId), eq(securityOfficers.isActive, true))).for("share")
      if (!officer) throw new ReportError("Petugas tidak tersedia atau sudah nonaktif.", 409)
      const now = new Date()
      await tx.insert(reportHandovers).values({ inventoryId: item.id, lossReportId: lossReport?.report.id, submissionKey: input.submissionKey,
        submissionFingerprint: fingerprint, ownershipEvidence: input.ownershipEvidence, officerId: officer.id, officerName: officer.name,
        actorId: actor.id, actorName: account.name, recipient: input.recipient, recipientEmail: input.recipientEmail ?? null, recipientPhone: input.recipientPhone ?? null,
        photoStorageKey: photo?.storageKey ?? null, photoMimeType: photo?.mimeType ?? null, photoName: photo?.name ?? null,
        location: item.storageLocation, note: input.note ?? "", handedOverAt: now })
      const [updated] = await tx.update(satpamInventory).set({ status: "diserahkan", handoverRecipient: input.recipient, handoverRecipientEmail: input.recipientEmail ?? null, handoverRecipientPhone: input.recipientPhone ?? null,
        handoverPhotoStorageKey: photo?.storageKey ?? null, handoverPhotoMimeType: photo?.mimeType ?? null, handoverPhotoName: photo?.name ?? null,
        handoverNote: input.note, handedOverAt: now, updatedAt: now })
        .where(and(eq(satpamInventory.id, item.id), eq(satpamInventory.status, "tersimpan"))).returning({ id: satpamInventory.id })
      if (!updated) throw new ReportError("Barang telah diproses petugas lain.", 409)
      for (const { report } of linked) {
        // A documented physical return is a terminal operation, not a fabricated pair of reports.
        await tx.update(reports).set({ status: "selesai", completedAt: now, updatedAt: now }).where(eq(reports.id, report.id))
        await tx.insert(reportStatusHistory).values({ reportId: report.id, actorId: actor.id, actorName: account.name, fromStatus: report.status, toStatus: "selesai", note: `Barang Inventaris diserahkan kepada ${input.recipient}. Petugas: ${officer.name}. Pemeriksaan: ${input.ownershipEvidence}`, createdAt: now })
        await tx.insert(notifications).values({ recipientId: report.reporterId, reportId: report.id, kind: "status", title: "Laporan selesai", description: "Barang telah diserahkan oleh Satpam. Lihat rincian penanganan pada laporan Anda.", createdAt: now })
      }
      return (await repo.detail(item.id))!
    })
  }
}
