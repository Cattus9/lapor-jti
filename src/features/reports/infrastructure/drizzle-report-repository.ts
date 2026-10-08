import "server-only"
import { and, desc, eq, gte, ilike, inArray, isNull, lt, notInArray, or, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { users } from "@/db/schema"
import { facilityObjects, locationAreas, locationFacilityObjects, locations, notifications, reportAttachments, reportDrafts, reportFacilityObjects, reportLostFoundDetails, reportOtherDetails, reports, reportServiceDetails, reportStatusHistory, reportTicketCounters, services } from "@/db/reports-schema"
import { handlerByCategory, isUuid, ReportError, type ReportActor, type StoredAttachment } from "../domain/report"
import type { DraftView, ReportRepository, ReportWrite } from "../application/ports"
import type { ReportListItem, ReportSummary } from "../types"
import { defaultReportFilters, reportDateBounds, type ReportListFilters } from "../domain/report-list-filters"

const pageSize = 20
const reportDateFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
const dateLabel = (date: Date) => reportDateFormatter.format(date)
type ReportRow = typeof reports.$inferSelect
type DraftRow = typeof reportDrafts.$inferSelect
const listColumns = { id: reports.id, ticketNumber: reports.ticketNumber, title: reports.title, category: reports.category, status: reports.status, updatedAt: reports.updatedAt, submittedAt: reports.submittedAt }
type ListRow = Pick<ReportRow, keyof typeof listColumns>
const listItem = (row: ListRow): ReportListItem => ({ id: row.id, ticketNumber: row.ticketNumber, title: row.title, category: row.category, status: row.status, updatedAt: dateLabel(row.updatedAt), submittedAt: dateLabel(row.submittedAt), submittedAtIso: row.submittedAt.toISOString() })
function cursorValue(value?: string) {
  if (!value) return null
  if (value.length > 160) throw new ReportError("Pagination tidak valid.")
  const [date, id] = Buffer.from(value, "base64url").toString("utf8").split("|")
  if (!isUuid(id) || !date || !Number.isFinite(Date.parse(date))) throw new ReportError("Pagination tidak valid.")
  return { date: new Date(date), id }
}
const nextCursor = (date: Date, id: string) => Buffer.from(`${date.toISOString()}|${id}`).toString("base64url")
const publicAttachment = ({ id, name, mimeType, size }: StoredAttachment) => ({ id, name, mimeType, size })
const draftView = (row: DraftRow, attachments: StoredAttachment[]): DraftView => ({ id: row.id, revision: row.revision, payload: row.payload, updatedAt: row.updatedAt.toISOString(), attachments: attachments.map(publicAttachment) })

export class DrizzleReportRepository implements ReportRepository {
  constructor(private readonly db = getDb()) {}
  async write(actor: ReportActor, input: ReportWrite, files: StoredAttachment[], submit: boolean) {
    return this.db.transaction(async (tx) => {
      // Recheck current permissions inside the transaction, not just at the HTTP boundary.
      const [user] = await tx.select({ id: users.id, name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "pelapor"), eq(users.isActive, true))).for("share")
      if (!user) throw new ReportError("Akun tidak memiliki akses.", 403)
      await tx.insert(reportDrafts).values({ id: input.id, reporterId: actor.id, payload: input.payload }).onConflictDoNothing()
      const [draft] = await tx.select().from(reportDrafts).where(eq(reportDrafts.id, input.id)).for("update")
      if (!draft || draft.reporterId !== actor.id) throw new ReportError("Draft tidak ditemukan.", 404)
      if (draft.schemaVersion !== 1) throw new ReportError("Versi draft belum didukung. Hubungi pengelola.", 409)
      if (draft.submittedReportId) {
        if (!submit) throw new ReportError("Draft sudah dikirim dan tidak dapat diubah.", 409)
        const [existing] = await tx.select({ id: reports.id, ticketNumber: reports.ticketNumber }).from(reports).where(and(eq(reports.id, draft.submittedReportId), eq(reports.reporterId, actor.id)))
        return { created: false, report: existing, removed: [] }
      }
      if (draft.revision !== input.revision) throw new ReportError("Draft telah berubah. Muat ulang sebelum menyimpan lagi.", 409)
      const existingFiles = await tx.select().from(reportAttachments).where(and(eq(reportAttachments.draftId, draft.id), eq(reportAttachments.ownerId, actor.id)))
      const kept = existingFiles.filter((file) => input.retainedAttachmentIds.includes(file.id))
      if (kept.length !== input.retainedAttachmentIds.length) throw new ReportError("Lampiran bukan milik draft ini.", 400)
      const removed = existingFiles.filter((file) => !input.retainedAttachmentIds.includes(file.id))
      const payload = input.payload
      let location: typeof locations.$inferSelect | undefined
      let service: typeof services.$inferSelect | undefined
      // Serialize catalog validation with configuration writes. Old drafts remain editable;
      // only a NEW submission must conform to the current active room/facility mapping.
      if (submit) await tx.execute(sql`select pg_advisory_xact_lock_shared(748193)`)
      const objectRows = submit && payload.category === "fasilitas" && payload.facilities.filter((name) => name !== "Lainnya").length
        ? await tx.select().from(facilityObjects).where(and(inArray(facilityObjects.name, payload.facilities.filter((name) => name !== "Lainnya")), eq(facilityObjects.isActive, true))) : []
      if (submit && payload.category === "fasilitas") {
        if (payload.location && payload.location !== "Lainnya") {
          ;[location] = await tx.select().from(locations).where(and(eq(locations.name, payload.location), eq(locations.isActive, true))).limit(1)
          if (!location) throw new ReportError("Lokasi tidak tersedia.")
          const [area] = await tx.select({ id: locationAreas.id }).from(locationAreas).where(and(eq(locationAreas.id, location.areaId), eq(locationAreas.isActive, true)))
          if (!area) throw new ReportError("Area/lantai tidak tersedia. Pilih lokasi lain.")
        }
        if (objectRows.length !== payload.facilities.filter((name) => name !== "Lainnya").length) throw new ReportError("Objek fasilitas tidak tersedia.")
        if (location && objectRows.length) {
          const mapping = await tx.select().from(locationFacilityObjects).where(and(eq(locationFacilityObjects.locationId, location.id), inArray(locationFacilityObjects.objectId, objectRows.map((row) => row.id))))
          if (mapping.length !== objectRows.length) throw new ReportError("Objek fasilitas tidak terdaftar di lokasi ini. Periksa pilihan atau gunakan Lainnya.")
        }
      }
      if (submit && payload.category === "layanan" && payload.service) {
        ;[service] = await tx.select().from(services).where(and(eq(services.name, payload.service), eq(services.isActive, true))).limit(1)
        if (!service) throw new ReportError("Layanan tidak tersedia.")
      }
      if (removed.length) await tx.delete(reportAttachments).where(inArray(reportAttachments.id, removed.map((file) => file.id)))
      const now = new Date()
      if (!submit) {
        if (files.length) await tx.insert(reportAttachments).values(files.map((file) => ({ ...file, ownerId: actor.id, draftId: draft.id })))
        const [saved] = await tx.update(reportDrafts).set({ payload, revision: draft.revision + 1, updatedAt: now }).where(eq(reportDrafts.id, draft.id)).returning()
        return { created: true, draft: draftView(saved, [...kept, ...files]), removed }
      }
      const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Jakarta" }).format(now))
      const [counter] = await tx.insert(reportTicketCounters).values({ year, value: 1 }).onConflictDoUpdate({ target: reportTicketCounters.year, set: { value: sql`${reportTicketCounters.value} + 1` } }).returning()
      const [report] = await tx.insert(reports).values({
        ticketNumber: `LJ-${year}-${String(counter.value).padStart(5, "0")}`, submissionKey: input.id, reporterId: actor.id,
        category: payload.category, title: payload.title, description: payload.description, incidentDate: payload.incidentDate, incidentTime: payload.incidentTime,
        locationId: location?.id, locationText: payload.location === "Lainnya" ? payload.otherLocation : payload.location,
        handlerRole: handlerByCategory[payload.category], status: "baru", submittedAt: now,
      }).returning({ id: reports.id, ticketNumber: reports.ticketNumber })
      if (payload.category === "kehilangan-temuan") await tx.insert(reportLostFoundDetails).values({ reportId: report.id, kind: payload.reportType.toLowerCase(), itemName: payload.itemName, itemDetails: payload.itemDetails })
      if (payload.category === "fasilitas") await tx.insert(reportFacilityObjects).values(payload.facilities.map((name) => ({ reportId: report.id, objectId: objectRows.find((object) => object.name === name)?.id, objectText: name === "Lainnya" ? payload.otherFacility : name })))
      if (payload.category === "layanan") {
        if (!service) throw new ReportError("Layanan tidak tersedia.")
        await tx.insert(reportServiceDetails).values({ reportId: report.id, serviceId: service.id, serviceName: service.name, program: payload.program })
      }
      if (payload.category === "lainnya") await tx.insert(reportOtherDetails).values({ reportId: report.id, categoryText: payload.otherCategory })
      if (kept.length) await tx.update(reportAttachments).set({ reportId: report.id, draftId: null }).where(inArray(reportAttachments.id, kept.map((file) => file.id)))
      if (files.length) await tx.insert(reportAttachments).values(files.map((file) => ({ ...file, ownerId: actor.id, reportId: report.id })))
      await tx.insert(reportStatusHistory).values({ reportId: report.id, actorId: actor.id, actorName: user.name, toStatus: "baru", note: "Laporan dikirim oleh Pelapor.", createdAt: now })
      await tx.insert(notifications).values({ recipientId: actor.id, reportId: report.id, kind: "status", title: "Laporan berhasil dikirim", description: `${report.ticketNumber} telah diteruskan ke pengelola sesuai kategorinya.`, createdAt: now })
      {
        const recipients = await tx.select({ id: users.id }).from(users).where(and(eq(users.role, handlerByCategory[payload.category]), eq(users.isActive, true)))
        const title = payload.category === "fasilitas" ? "Laporan fasilitas baru" : payload.category === "kehilangan-temuan" ? "Laporan kehilangan/temuan baru" : payload.category === "layanan" ? "Laporan layanan baru" : "Laporan lainnya baru"
        if (recipients.length) await tx.insert(notifications).values(recipients.map((user) => ({ recipientId: user.id, reportId: report.id, kind: "status", title, description: `${report.ticketNumber}: ${payload.title}`, createdAt: now })))
      }
      await tx.update(reportDrafts).set({ payload, submittedReportId: report.id, revision: draft.revision + 1, updatedAt: now }).where(eq(reportDrafts.id, draft.id))
      return { created: true, report, removed }
    })
  }
  async list(ownerId: string, cursor?: string, ticket?: string, draftCursor?: string, filters: ReportListFilters = defaultReportFilters) {
    const after = cursorValue(cursor)
    const draftAfter = cursorValue(draftCursor)
    const bounds = reportDateBounds(filters)
    // Parameterized literal search: '%' and '_' in user input must not become SQL wildcards.
    const search = `%${filters.q.replace(/[\\%_]/g, (character) => `\\${character}`)}%`
    const conditions = and(
      eq(reports.reporterId, ownerId),
      filters.q ? or(ilike(reports.title, search), ilike(reports.ticketNumber, search)) : undefined,
      filters.category !== "semua" ? eq(reports.category, filters.category) : undefined,
      filters.status === "belum-selesai" ? notInArray(reports.status, ["selesai", "ditolak"]) : filters.status !== "semua" ? eq(reports.status, filters.status) : undefined,
      bounds.from ? gte(reports.submittedAt, bounds.from) : undefined,
      bounds.until ? lt(reports.submittedAt, bounds.until) : undefined,
      after ? or(lt(reports.submittedAt, after.date), and(eq(reports.submittedAt, after.date), lt(reports.id, after.id))) : undefined,
    )
    const [rows, drafts, selected] = await Promise.all([
      this.db.select(listColumns).from(reports).where(conditions).orderBy(desc(reports.submittedAt), desc(reports.id)).limit(pageSize + 1),
      this.db.select({ id: reportDrafts.id, payload: reportDrafts.payload, updatedAt: reportDrafts.updatedAt }).from(reportDrafts).where(and(eq(reportDrafts.reporterId, ownerId), isNull(reportDrafts.submittedReportId), draftAfter ? or(lt(reportDrafts.updatedAt, draftAfter.date), and(eq(reportDrafts.updatedAt, draftAfter.date), lt(reportDrafts.id, draftAfter.id))) : undefined)).orderBy(desc(reportDrafts.updatedAt), desc(reportDrafts.id)).limit(pageSize + 1),
      ticket ? this.db.select(listColumns).from(reports).where(and(eq(reports.reporterId, ownerId), eq(reports.ticketNumber, ticket))).limit(1) : Promise.resolve([]),
    ])
    const items = rows.slice(0, pageSize)
    const last = items.at(-1)
    const draftItems = drafts.slice(0, pageSize); const lastDraft = draftItems.at(-1)
    return { items: items.map(listItem), selected: selected[0] ? listItem(selected[0]) : undefined, nextCursor: rows.length > pageSize && last ? nextCursor(last.submittedAt, last.id) : null, nextDraftCursor: drafts.length > pageSize && lastDraft ? nextCursor(lastDraft.updatedAt, lastDraft.id) : null, drafts: draftItems.map((draft) => ({ ...draft, updatedAt: draft.updatedAt.toISOString() })) }
  }
  async draft(ownerId: string, id: string) {
    const [row] = await this.db.select().from(reportDrafts).where(and(eq(reportDrafts.id, id), eq(reportDrafts.reporterId, ownerId), isNull(reportDrafts.submittedReportId))).limit(1)
    if (!row) return null
    const files = await this.db.select().from(reportAttachments).where(and(eq(reportAttachments.draftId, row.id), eq(reportAttachments.ownerId, ownerId)))
    return draftView(row, files)
  }
  async detail(ownerId: string, id: string): Promise<ReportSummary | null> {
    const [row] = await this.db.select().from(reports).where(and(eq(reports.id, id), eq(reports.reporterId, ownerId))).limit(1)
    if (!row) return null
    const [files, history] = await Promise.all([
      this.db.select({ id: reportAttachments.id, name: reportAttachments.name, mimeType: reportAttachments.mimeType }).from(reportAttachments).where(eq(reportAttachments.reportId, id)),
      this.db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, id)).orderBy(desc(reportStatusHistory.createdAt)),
    ])
    let fields: Array<{ label: string; value: string }> = []
    if (row.category === "kehilangan-temuan") {
      const [detail] = await this.db.select().from(reportLostFoundDetails).where(eq(reportLostFoundDetails.reportId, id))
      if (detail) fields = [{ label: "Jenis laporan", value: detail.kind === "kehilangan" ? "Kehilangan" : "Temuan" }, { label: "Nama barang", value: detail.itemName }, { label: "Ciri-ciri barang", value: detail.itemDetails }]
    } else if (row.category === "fasilitas") {
      const objects = await this.db.select({ name: reportFacilityObjects.objectText }).from(reportFacilityObjects).where(eq(reportFacilityObjects.reportId, id))
      fields = [{ label: "Objek fasilitas", value: objects.map((object) => object.name).join(", ") }]
    } else if (row.category === "layanan") {
      const [detail] = await this.db.select().from(reportServiceDetails).where(eq(reportServiceDetails.reportId, id))
      if (detail) fields = [{ label: "Jenis layanan", value: detail.serviceName }, { label: "Unit atau program studi", value: detail.program }]
    } else {
      const [detail] = await this.db.select().from(reportOtherDetails).where(eq(reportOtherDetails.reportId, id))
      if (detail) fields = [{ label: "Kategori umum", value: detail.categoryText }]
    }
    return { ...listItem(row), detail: {
      incidentDate: new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(row.incidentDate + "T00:00:00+07:00")),
      incidentTime: row.incidentTime.slice(0, 5).replace(":", "."), location: row.locationText, description: row.description, fields,
      attachments: files.map((file) => ({ id: file.id, name: file.name, type: file.mimeType.startsWith("image/") ? "image" : "document", downloadUrl: `/api/pelapor/attachments/${file.id}`, previewUrl: file.mimeType.startsWith("image/") ? `/api/pelapor/attachments/${file.id}?preview=1` : undefined })),
    }, history: history.map((item) => ({ status: item.toStatus, actor: item.actorName, note: item.note, createdAt: dateLabel(item.createdAt) })) }
  }
  async dashboard(ownerId: string) {
    const [totals, rows] = await Promise.all([
      this.db.select({ total: sql<number>`count(*)::integer`, active: sql<number>`count(*) filter (where ${reports.status} not in ('selesai', 'ditolak'))::integer`, completed: sql<number>`count(*) filter (where ${reports.status} = 'selesai')::integer` }).from(reports).where(eq(reports.reporterId, ownerId)),
      this.db.select(listColumns).from(reports).where(eq(reports.reporterId, ownerId)).orderBy(desc(reports.updatedAt), desc(reports.id)).limit(5),
    ])
    return { ...totals[0], recent: rows.map(listItem) }
  }
  async attachment(ownerId: string, id: string) {
    const [file] = await this.db.select().from(reportAttachments).where(and(eq(reportAttachments.id, id), eq(reportAttachments.ownerId, ownerId))).limit(1)
    return file ?? null
  }
  async notifications(ownerId: string, cursor?: string) {
    const after = cursorValue(cursor)
    const [rows, counts] = await Promise.all([
      this.db.select({ id: notifications.id, kind: notifications.kind, title: notifications.title, description: notifications.description, createdAt: notifications.createdAt, readAt: notifications.readAt, ticket: reports.ticketNumber, reportTitle: reports.title }).from(notifications).innerJoin(reports, eq(reports.id, notifications.reportId)).where(and(eq(notifications.recipientId, ownerId), after ? or(lt(notifications.createdAt, after.date), and(eq(notifications.createdAt, after.date), lt(notifications.id, after.id))) : undefined)).orderBy(desc(notifications.createdAt), desc(notifications.id)).limit(pageSize + 1),
      this.db.select({ value: sql<number>`count(*)::integer` }).from(notifications).where(and(eq(notifications.recipientId, ownerId), isNull(notifications.readAt))),
    ])
    const items = rows.slice(0, pageSize)
    const last = items.at(-1)
    const day = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(date)
    const today = day(new Date()); const yesterday = day(new Date(Date.now() - 86400000))
    return { items: items.map((row) => ({ id: row.id, kind: row.kind === "response" ? "response" as const : "status" as const, title: row.title, description: row.description, ticketNumber: row.ticket, reportTitle: row.reportTitle, createdAt: dateLabel(row.createdAt), group: day(row.createdAt) === today ? "Hari ini" as const : day(row.createdAt) === yesterday ? "Kemarin" as const : "Sebelumnya" as const, read: row.readAt !== null })), unread: counts[0].value, nextCursor: rows.length > pageSize && last ? nextCursor(last.createdAt, last.id) : null }
  }
  async markRead(ownerId: string, id?: string) {
    await this.db.update(notifications).set({ readAt: new Date() }).where(and(eq(notifications.recipientId, ownerId), isNull(notifications.readAt), id ? eq(notifications.id, id) : undefined))
  }
}
