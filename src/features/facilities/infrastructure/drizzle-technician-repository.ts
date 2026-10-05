import "server-only"
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNotNull, lt, notInArray, or, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { users, reports, locations, facilityObjects, reportFacilityObjects, reportAttachments, reportStatusHistory, notifications } from "@/db/schema"
import { assertTransition, isUuid, ReportError, statusLabels, type ReportActor } from "../../reports/domain/report"
import { defaultReportFilters, reportDateBounds } from "../../reports/domain/report-list-filters"
import { DrizzleReportRepository } from "../../reports/infrastructure/drizzle-report-repository"
import { technicianExpectedStatus, type TechnicianCommand } from "../domain/technician"
import type { TechnicianRepository } from "../application/ports"
import type { TechnicianFacilityReport, TechnicianFilter, TechnicianPage, TechnicianReportStatus, TechnicianRoomPriority } from "../types"

const pageSize = 20
const scope = and(eq(reports.category, "fasilitas"), eq(reports.handlerRole, "teknisi"))!
const active = notInArray(reports.status, ["selesai", "ditolak"])
const dateLabel = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date)
const escaped = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`
const cursorFor = (date: Date, id: string) => Buffer.from(`${date.toISOString()}|${id}`).toString("base64url")
function cursorValue(value?: string) {
  if (!value) return null
  if (value.length > 160) throw new ReportError("Pagination tidak valid.")
  const [date, id] = Buffer.from(value, "base64url").toString("utf8").split("|")
  if (!isUuid(id) || !date || !Number.isFinite(Date.parse(date))) throw new ReportError("Pagination tidak valid.")
  return { date: new Date(date), id }
}
type Database = ReturnType<typeof getDb>
type Row = { report: typeof reports.$inferSelect; reporter: string }

export class DrizzleTechnicianRepository implements TechnicianRepository {
  constructor(private readonly db: Database = getDb()) {}

  private async hydrate(rows: Row[]): Promise<TechnicianFacilityReport[]> {
    if (!rows.length) return []
    const ids = rows.map((row) => row.report.id)
    // Bounded page batches, never one query per report or a join that multiplies report rows.
    const [objects, files, completions] = await Promise.all([
      this.db.select().from(reportFacilityObjects).where(inArray(reportFacilityObjects.reportId, ids)).orderBy(asc(reportFacilityObjects.objectText)),
      this.db.select({ reportId: reportAttachments.reportId }).from(reportAttachments).where(inArray(reportAttachments.reportId, ids)),
      rows.some((row) => row.report.status === "selesai") ? this.db.select({ reportId: reportStatusHistory.reportId, note: reportStatusHistory.note }).from(reportStatusHistory).where(and(inArray(reportStatusHistory.reportId, ids), eq(reportStatusHistory.toStatus, "selesai"))) : Promise.resolve([]),
    ])
    const names = new Map<string, string[]>(), counts = new Map<string, number>(), notes = new Map(completions.map((entry) => [entry.reportId, entry.note]))
    for (const object of objects) names.set(object.reportId, [...(names.get(object.reportId) ?? []), object.objectText])
    for (const file of files) if (file.reportId) counts.set(file.reportId, (counts.get(file.reportId) ?? 0) + 1)
    return rows.map(({ report: r, reporter }) => ({
      id: r.id, ticket: r.ticketNumber, title: r.title, facility: (names.get(r.id) ?? []).join(", "), facilities: names.get(r.id) ?? [],
      locationId: r.locationId, room: r.locationText, location: r.locationText, reporter, description: r.description,
      status: statusLabels[r.status] as TechnicianReportStatus, submittedAt: dateLabel(r.submittedAt), updatedAt: dateLabel(r.updatedAt),
      eventDate: new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${r.incidentDate}T00:00:00+07:00`)),
      eventTime: r.incidentTime.slice(0, 5).replace(":", "."), completedAt: r.completedAt ? dateLabel(r.completedAt) : undefined,
      completionNote: notes.get(r.id), attachments: counts.get(r.id) ?? 0,
    }))
  }
  async list(filter: TechnicianFilter, history = false): Promise<TechnicianPage<TechnicianFacilityReport>> {
    const after = cursorValue(filter.cursor), bounds = reportDateBounds({ ...defaultReportFilters, period: filter.period, from: filter.from, to: filter.to })
    const date = history ? reports.completedAt : reports.submittedAt
    const compare = filter.sort === "terlama" ? gt : lt, order = filter.sort === "terlama" ? asc : desc
    const criteria = and(scope,
      history ? eq(reports.status, "selesai") : filter.status !== "semua" ? eq(reports.status, filter.status) : undefined,
      history ? isNotNull(reports.completedAt) : undefined,
      filter.activeOnly ? active : undefined,
      filter.classifiedOnly ? and(isNotNull(reports.locationId), sql`exists (select 1 from ${reportFacilityObjects} where ${reportFacilityObjects.reportId} = ${reports.id} and ${reportFacilityObjects.objectId} is not null)`) : undefined,
      filter.locationId ? eq(reports.locationId, filter.locationId) : undefined,
      bounds.from ? gte(date, bounds.from) : undefined, bounds.until ? lt(date, bounds.until) : undefined,
      filter.query ? or(ilike(reports.title, escaped(filter.query)), ilike(reports.ticketNumber, escaped(filter.query)), ilike(reports.locationText, escaped(filter.query)),
        sql`exists (select 1 from ${reportFacilityObjects} where ${reportFacilityObjects.reportId} = ${reports.id} and ${reportFacilityObjects.objectText} ilike ${escaped(filter.query)})`) : undefined,
    )!
    const [rows, totals] = await Promise.all([
      this.db.select({ report: reports, reporter: users.name }).from(reports).innerJoin(users, eq(users.id, reports.reporterId))
        .where(and(criteria, after ? or(compare(date, after.date), and(eq(date, after.date), compare(reports.id, after.id))) : undefined))
        .orderBy(order(date), order(reports.id)).limit(pageSize + 1),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(reports).where(criteria),
    ])
    const page = rows.slice(0, pageSize), last = page.at(-1)
    return { items: await this.hydrate(page), total: totals[0].count, nextCursor: rows.length > pageSize && last ? cursorFor(history ? last.report.completedAt! : last.report.submittedAt, last.report.id) : null }
  }
  async detail(ticket: string) {
    const rows = await this.db.select({ report: reports, reporter: users.name }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(and(scope, eq(reports.ticketNumber, ticket))).limit(1)
    if (!rows.length) return null
    const id = rows[0].report.id
    const [[report], history, files] = await Promise.all([
      this.hydrate(rows),
      this.db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, id)).orderBy(asc(reportStatusHistory.createdAt), asc(reportStatusHistory.id)),
      this.db.select().from(reportAttachments).where(eq(reportAttachments.reportId, id)).orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)),
    ])
    return { report, history: history.map((entry) => ({ status: statusLabels[entry.toStatus] as TechnicianReportStatus, actor: entry.actorName, timestamp: dateLabel(entry.createdAt), note: entry.note })),
      files: files.map((file) => ({ id: file.id, name: file.name, mimeType: file.mimeType, url: `/api/teknisi/attachments/${file.id}`, previewUrl: file.mimeType.startsWith("image/") ? `/api/teknisi/attachments/${file.id}?preview=1` : undefined })) }
  }
  async priorities(status: TechnicianFilter["status"] = "semua"): Promise<TechnicianRoomPriority[]> {
    if (status === "selesai" || status === "ditolak") return []
    const criteria = and(scope, active, status !== "semua" ? eq(reports.status, status) : undefined,
      sql`exists (select 1 from ${reportFacilityObjects} where ${reportFacilityObjects.reportId} = ${reports.id} and ${reportFacilityObjects.objectId} is not null)`)
    const [rooms, objects] = await Promise.all([
      this.db.select({ id: locations.id, room: locations.name, activeReports: sql<number>`count(*)::integer` }).from(reports)
        .innerJoin(locations, eq(locations.id, reports.locationId)).where(criteria).groupBy(locations.id, locations.name)
        .orderBy(sql`count(*) desc`, asc(locations.name)),
      this.db.select({ locationId: reports.locationId, facility: facilityObjects.name, count: sql<number>`count(distinct ${reports.id})::integer` }).from(reports)
        .innerJoin(reportFacilityObjects, eq(reportFacilityObjects.reportId, reports.id)).innerJoin(facilityObjects, eq(facilityObjects.id, reportFacilityObjects.objectId))
        .where(criteria).groupBy(reports.locationId, facilityObjects.id, facilityObjects.name).orderBy(sql`count(distinct ${reports.id}) desc`, asc(facilityObjects.name)),
    ])
    return rooms.map((room) => ({ ...room, location: room.room, totalReports: room.activeReports, facilities: objects.filter((object) => object.locationId === room.id).map((object) => ({ facility: object.facility, activeReports: object.count })) }))
  }
  async dashboard() {
    const today = reportDateBounds({ ...defaultReportFilters, period: "hari-ini" })
    const [totals, priorities, rows] = await Promise.all([
      this.db.select({ newReports: sql<number>`count(*) filter (where ${reports.status} = 'baru')::integer`,
        verifiedReports: sql<number>`count(*) filter (where ${reports.status} = 'diverifikasi')::integer`, processingReports: sql<number>`count(*) filter (where ${reports.status} = 'diproses')::integer`,
        completedToday: sql<number>`count(*) filter (where ${reports.completedAt} >= ${today.from} and ${reports.completedAt} < ${today.until})::integer`,
        affectedRooms: sql<number>`count(distinct coalesce(${reports.locationId}, ${reports.locationText})) filter (where ${reports.status} not in ('selesai', 'ditolak'))::integer`,
        unclassifiedReports: sql<number>`count(*) filter (where ${reports.status} not in ('selesai', 'ditolak') and (${reports.locationId} is null or not exists (select 1 from ${reportFacilityObjects} where ${reportFacilityObjects.reportId} = ${reports.id} and ${reportFacilityObjects.objectId} is not null)))::integer`,
      }).from(reports).where(scope),
      this.priorities(),
      this.db.select({ report: reports, reporter: users.name }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(and(scope, active)).orderBy(desc(reports.submittedAt), desc(reports.id)).limit(5),
    ])
    return { ...totals[0], inProgress: totals[0].verifiedReports + totals[0].processingReports, priorityRoom: priorities[0]?.room ?? "Tidak ada", priorities, queue: await this.hydrate(rows), updatedAt: dateLabel(new Date()) }
  }
  async execute(actor: ReportActor, command: TechnicianCommand) {
    await this.db.transaction(async (tx) => {
      // [AUTH-ROLE] Recheck the live database account and scope inside the write transaction.
      const [account] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "teknisi"), eq(users.isActive, true))).for("share")
      if (!account) throw new ReportError("Akun tidak memiliki akses Teknisi.", 403)
      const [report] = await tx.select().from(reports).where(and(scope, eq(reports.ticketNumber, command.ticket))).for("update")
      if (!report) throw new ReportError("Laporan fasilitas tidak ditemukan.", 404)
      if (report.status !== technicianExpectedStatus(command.status)) throw new ReportError("Status laporan telah berubah. Muat ulang sebelum melanjutkan.", 409)
      assertTransition("fasilitas", report.status, command.status)
      const now = new Date(), note = command.note || (command.status === "diverifikasi" ? "Detail kerusakan dan lokasi telah diverifikasi." : "Penanganan fasilitas dimulai.")
      await tx.update(reports).set({ status: command.status, updatedAt: now, completedAt: command.status === "selesai" ? now : null }).where(eq(reports.id, report.id))
      await tx.insert(reportStatusHistory).values({ reportId: report.id, actorId: actor.id, actorName: account.name, fromStatus: report.status, toStatus: command.status, note, createdAt: now })
      await tx.insert(notifications).values({ recipientId: report.reporterId, reportId: report.id, kind: "status", title: `Laporan fasilitas ${statusLabels[command.status].toLowerCase()}`, description: `${report.ticketNumber}: ${note}`, createdAt: now })
    })
  }
  async attachment(id: string) {
    const [row] = await this.db.select({ file: reportAttachments }).from(reportAttachments).innerJoin(reports, eq(reports.id, reportAttachments.reportId)).where(and(scope, eq(reportAttachments.id, id))).limit(1)
    return row?.file ?? null
  }
  notifications(actorId: string, cursor?: string) { return new DrizzleReportRepository(this.db).notifications(actorId, cursor) }
  markRead(actorId: string, id?: string) { return new DrizzleReportRepository(this.db).markRead(actorId, id) }
}
