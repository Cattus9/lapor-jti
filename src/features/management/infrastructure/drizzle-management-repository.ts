import "server-only"
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNotNull, lt, notInArray, or, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { users, reports, reportAttachments, reportStatusHistory, reportFacilityObjects, reportServiceDetails, reportOtherDetails, reportLostFoundDetails } from "@/db/schema"
import { notifications } from "@/db/reports-schema"
import { assertTransition, isUuid, ReportError, statusLabels, type ReportActor } from "../../reports/domain/report"
import { defaultReportFilters, reportDateBounds } from "../../reports/domain/report-list-filters"
import { DrizzleReportRepository } from "../../reports/infrastructure/drizzle-report-repository"
import { categoryLabels, handlerLabels, managementCategories, managementExpectedStatus, type ManagementCommand } from "../domain/management"
import type { ManagementRepository } from "../application/ports"
import type { ManagementDetail, ManagementFilter, ManagementPage, ManagementReport, ManagementStatisticsData, MonitoringReportStatus } from "../types"

const pageSize = 20
const scope = and(eq(reports.handlerRole, "manajemen"), inArray(reports.category, [...managementCategories]))!
const active = notInArray(reports.status, ["selesai", "ditolak"])
const dateLabel = (value: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(value)
const dayLabel = (value: Date) => new Date(value.getTime() + 7 * 3600000).toISOString().slice(0, 10)
const escaped = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`
const cursorFor = (date: Date, id: string) => Buffer.from(`${date.toISOString()}|${id}`).toString("base64url")
function cursorValue(value?: string) {
  if (!value) return null
  if (!/^[A-Za-z0-9_-]+$/.test(value) || value.length > 160) throw new ReportError("Pagination tidak valid.")
  const parts = Buffer.from(value, "base64url").toString("utf8").split("|")
  const [date, id] = parts
  if (parts.length !== 2 || !isUuid(id) || !date || !Number.isFinite(Date.parse(date))) throw new ReportError("Pagination tidak valid.")
  return { date: new Date(date), id }
}
type Database = ReturnType<typeof getDb>
type Row = { report: typeof reports.$inferSelect; reporter: string; unit: string | null }
function criteria(filter: ManagementFilter, operational: boolean, withDates = true) {
  const bounds = reportDateBounds({ ...defaultReportFilters, period: filter.period, from: filter.from, to: filter.to })
  const q = escaped(filter.query)
  const date = filter.dateBasis === "completed" ? reports.completedAt : reports.submittedAt
  return and(operational ? scope : undefined,
    filter.category !== "semua" ? eq(reports.category, filter.category) : undefined,
    filter.status === "belum-selesai" ? active : filter.status === "dalam-penanganan" ? and(active, sql`${reports.status} <> 'baru'`) : filter.status !== "semua" ? eq(reports.status, filter.status) : undefined,
    withDates && bounds.from ? gte(date, bounds.from) : undefined, withDates && bounds.until ? lt(date, bounds.until) : undefined,
    filter.query ? or(ilike(reports.title, q), ilike(reports.ticketNumber, q), ilike(reports.locationText, q),
      sql`exists (select 1 from ${users} where ${users.id} = ${reports.reporterId} and ${users.name} ilike ${q})`,
      sql`exists (select 1 from ${reportServiceDetails} where ${reportServiceDetails.reportId} = ${reports.id} and ${reportServiceDetails.serviceName} ilike ${q})`,
      sql`exists (select 1 from ${reportOtherDetails} where ${reportOtherDetails.reportId} = ${reports.id} and ${reportOtherDetails.categoryText} ilike ${q})`) : undefined,
  )
}

export class DrizzleManagementRepository implements ManagementRepository {
  constructor(private readonly db: Database = getDb()) {}
  private async hydrate(rows: Row[]): Promise<ManagementReport[]> {
    if (!rows.length) return []
    const ids = rows.map((r) => r.report.id)
    // One bounded batch per relation. Never join the object/file collections onto paginated reports.
    const [services, others, lostFound, facilities, attachments] = await Promise.all([
      this.db.select().from(reportServiceDetails).where(inArray(reportServiceDetails.reportId, ids)),
      this.db.select().from(reportOtherDetails).where(inArray(reportOtherDetails.reportId, ids)),
      this.db.select().from(reportLostFoundDetails).where(inArray(reportLostFoundDetails.reportId, ids)),
      this.db.select().from(reportFacilityObjects).where(inArray(reportFacilityObjects.reportId, ids)).orderBy(asc(reportFacilityObjects.objectText)),
      this.db.select({ reportId: reportAttachments.reportId, count: sql<number>`count(*)::integer` }).from(reportAttachments).where(inArray(reportAttachments.reportId, ids)).groupBy(reportAttachments.reportId),
    ])
    const serviceMap = new Map(services.map((r) => [r.reportId, r])), otherMap = new Map(others.map((r) => [r.reportId, r.categoryText]))
    const lostMap = new Map(lostFound.map((r) => [r.reportId, r.kind === "kehilangan" ? "Kehilangan" : "Temuan"])), countMap = new Map(attachments.map((r) => [r.reportId, r.count]))
    const objects = new Map<string, string[]>()
    for (const object of facilities) objects.set(object.reportId, [...(objects.get(object.reportId) ?? []), object.objectText])
    return rows.map(({ report: r, reporter, unit }) => {
      const service = serviceMap.get(r.id)
      const context = service?.serviceName ?? otherMap.get(r.id) ?? lostMap.get(r.id) ?? objects.get(r.id)?.join(", ") ?? categoryLabels[r.category]
      return { id: r.id, ticket: r.ticketNumber, title: r.title, category: categoryLabels[r.category], categoryKey: r.category,
        status: statusLabels[r.status] as MonitoringReportStatus, statusKey: r.status, handler: handlerLabels[r.handlerRole], reporter, reporterUnit: unit ?? "Belum diisi",
        service: context, context, program: service?.program, location: r.locationText, submittedAt: dateLabel(r.submittedAt), submittedAtIso: r.submittedAt.toISOString(), reportedOn: dayLabel(r.submittedAt),
        updatedAt: dateLabel(r.updatedAt), completedOn: r.completedAt ? dayLabel(r.completedAt) : undefined, completedAt: r.completedAt ? dateLabel(r.completedAt) : undefined, description: r.description, attachments: countMap.get(r.id) ?? 0,
        eventDate: new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${r.incidentDate}T00:00:00+07:00`)), eventTime: r.incidentTime.slice(0, 5).replace(":", ".") }
    })
  }
  async list(filter: ManagementFilter, operational: boolean): Promise<ManagementPage> {
    const after = cursorValue(filter.cursor), where = criteria(filter, operational)
    const date = filter.dateBasis === "completed" ? reports.completedAt : reports.submittedAt
    const compare = filter.sort === "terlama" ? gt : lt, order = filter.sort === "terlama" ? asc : desc
    const [rows, totals] = await Promise.all([
      this.db.select({ report: reports, reporter: users.name, unit: users.unit }).from(reports).innerJoin(users, eq(users.id, reports.reporterId))
        .where(and(where, after ? or(compare(date, after.date), and(eq(date, after.date), compare(reports.id, after.id))) : undefined))
        .orderBy(order(date), order(reports.id)).limit(pageSize + 1),
      this.db.select({ count: sql<number>`count(*)::integer`,
        lostFound: sql<number>`count(*) filter (where ${reports.category} = 'kehilangan-temuan')::integer`, facilities: sql<number>`count(*) filter (where ${reports.category} = 'fasilitas')::integer`,
        services: sql<number>`count(*) filter (where ${reports.category} = 'layanan')::integer`, others: sql<number>`count(*) filter (where ${reports.category} = 'lainnya')::integer`,
        satpam: sql<number>`count(*) filter (where ${reports.handlerRole} = 'satpam' and ${filter.category === "semua" ? sql`true` : eq(reports.category, filter.category)})::integer`,
        teknisi: sql<number>`count(*) filter (where ${reports.handlerRole} = 'teknisi' and ${filter.category === "semua" ? sql`true` : eq(reports.category, filter.category)})::integer`,
        manajemen: sql<number>`count(*) filter (where ${reports.handlerRole} = 'manajemen' and ${filter.category === "semua" ? sql`true` : eq(reports.category, filter.category)})::integer`,
      }).from(reports).where(criteria({ ...filter, category: "semua" }, operational)),
    ])
    const page = rows.slice(0, pageSize), last = page.at(-1)
    const categoryCounts = { semua: totals[0].count, "kehilangan-temuan": totals[0].lostFound, fasilitas: totals[0].facilities, layanan: totals[0].services, lainnya: totals[0].others }
    return { items: await this.hydrate(page), total: categoryCounts[filter.category], categoryCounts, handlerCounts: { satpam: totals[0].satpam, teknisi: totals[0].teknisi, manajemen: totals[0].manajemen }, nextCursor: rows.length > pageSize && last ? cursorFor(filter.dateBasis === "completed" ? last.report.completedAt! : last.report.submittedAt, last.report.id) : null }
  }
  async detail(ticket: string, operational: boolean): Promise<ManagementDetail | null> {
    const rows = await this.db.select({ report: reports, reporter: users.name, unit: users.unit }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(and(operational ? scope : undefined, eq(reports.ticketNumber, ticket))).limit(1)
    if (!rows.length) return null
    const id = rows[0].report.id
    const [[report], history, files] = await Promise.all([
      this.hydrate(rows),
      this.db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, id)).orderBy(asc(reportStatusHistory.createdAt), asc(reportStatusHistory.id)),
      this.db.select().from(reportAttachments).where(eq(reportAttachments.reportId, id)).orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)),
    ])
    return { report, history: history.map((entry) => ({ status: statusLabels[entry.toStatus] as MonitoringReportStatus, actor: entry.actorName, timestamp: dateLabel(entry.createdAt), note: entry.note })),
      files: files.map((file) => ({ id: file.id, name: file.name, mimeType: file.mimeType, url: `/api/manajemen/attachments/${file.id}`, previewUrl: file.mimeType.startsWith("image/") ? `/api/manajemen/attachments/${file.id}?preview=1` : undefined })) }
  }
  async dashboard() {
    const month = reportDateBounds({ ...defaultReportFilters, period: "bulan-ini" })
    const [totals, queue] = await Promise.all([
      this.db.select({ newReports: sql<number>`count(*) filter (where ${reports.status} = 'baru')::integer`, inProgress: sql<number>`count(*) filter (where ${reports.status} = 'diproses')::integer`,
        completedThisMonth: sql<number>`count(*) filter (where ${reports.completedAt} >= ${month.from} and ${reports.completedAt} < ${month.until})::integer`,
        activeServiceReports: sql<number>`count(*) filter (where ${reports.category} = 'layanan' and ${active})::integer`,
      }).from(reports).where(scope),
      this.db.select({ report: reports, reporter: users.name, unit: users.unit }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(and(scope, active)).orderBy(asc(reports.submittedAt), asc(reports.id)).limit(5),
    ])
    return { ...totals[0], queue: await this.hydrate(queue), updatedAt: dateLabel(new Date()) }
  }
  async statistics(filter: ManagementFilter): Promise<ManagementStatisticsData> {
    const where = criteria(filter, false), withoutDates = criteria(filter, false, false)
    const bounds = reportDateBounds({ ...defaultReportFilters, period: filter.period, from: filter.from, to: filter.to })
    // Bounds come from the database and WIB calendar, not hard-coded sample dates.
    const [span] = await this.db.select({ first: sql<Date | null>`min(${reports.submittedAt})` }).from(reports).where(withoutDates)
    const from = bounds.from ?? (span.first ? new Date(span.first) : new Date()), until = bounds.until ?? new Date()
    const days = Math.max(1, (until.getTime() - from.getTime()) / 86400000)
    const granularity = days <= 92 ? "day" : days <= 3660 ? "month" : "year"
    // This literal is selected solely from the closed union above, never user input.
    const bucketUnit = sql.raw(`'${granularity}'`)
    const dateBucket = (column: typeof reports.submittedAt | typeof reports.completedAt) => sql<string>`to_char(date_trunc(${bucketUnit}, ${column} at time zone 'Asia/Jakarta'), 'YYYY-MM-DD')`
    const roomKey = sql<string>`coalesce(${reports.locationId}, 'text:' || ${reports.locationText})`
    const [totals, categories, handlers, incoming, completed, rooms, objects, unclassified] = await Promise.all([
      this.db.select({ total: sql<number>`count(*)::integer`, newReports: sql<number>`count(*) filter (where ${reports.status} = 'baru')::integer`,
        inProgress: sql<number>`count(*) filter (where ${active} and ${reports.status} <> 'baru')::integer`, completed: sql<number>`count(*) filter (where ${reports.status} = 'selesai')::integer`, rejected: sql<number>`count(*) filter (where ${reports.status} = 'ditolak')::integer` }).from(reports).where(where),
      this.db.select({ category: reports.category, total: sql<number>`count(*)::integer` }).from(reports).where(where).groupBy(reports.category),
      this.db.select({ handler: reports.handlerRole, total: sql<number>`count(*)::integer`, active: sql<number>`count(*) filter (where ${active})::integer` }).from(reports).where(where).groupBy(reports.handlerRole),
      this.db.select({ date: dateBucket(reports.submittedAt), value: sql<number>`count(*)::integer` }).from(reports).where(and(withoutDates, gte(reports.submittedAt, from), lt(reports.submittedAt, until))).groupBy(dateBucket(reports.submittedAt)),
      this.db.select({ date: dateBucket(reports.completedAt), value: sql<number>`count(*)::integer` }).from(reports).where(and(withoutDates, isNotNull(reports.completedAt), gte(reports.completedAt, from), lt(reports.completedAt, until))).groupBy(dateBucket(reports.completedAt)),
      this.db.select({ id: roomKey, room: reports.locationText, totalReports: sql<number>`count(*)::integer`, activeReports: sql<number>`count(*) filter (where ${active})::integer`, completedReports: sql<number>`count(*) filter (where ${reports.status} = 'selesai')::integer` }).from(reports)
        .where(and(where, eq(reports.category, "fasilitas"))).groupBy(roomKey, reports.locationText).orderBy(sql`count(*) desc`, asc(reports.locationText), asc(roomKey)),
      // Historical composition includes closed reports; active remains a separate operational count.
      this.db.select({ roomId: roomKey, facility: reportFacilityObjects.objectText, totalReports: sql<number>`count(distinct ${reports.id})::integer`, activeReports: sql<number>`count(distinct ${reports.id}) filter (where ${active})::integer` }).from(reports).innerJoin(reportFacilityObjects, eq(reportFacilityObjects.reportId, reports.id))
        .where(and(where, eq(reports.category, "fasilitas"))).groupBy(roomKey, reportFacilityObjects.objectText).orderBy(sql`count(distinct ${reports.id}) desc`, asc(reportFacilityObjects.objectText)),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(reports).where(and(where, eq(reports.category, "fasilitas"), active, or(sql`${reports.locationId} is null`, sql`not exists (select 1 from ${reportFacilityObjects} where ${reportFacilityObjects.reportId} = ${reports.id} and ${reportFacilityObjects.objectId} is not null)`))),
    ])
    const incomingMap = new Map(incoming.map((r) => [r.date, r.value])), completedMap = new Map(completed.map((r) => [r.date, r.value]))
    const trend: ManagementStatisticsData["trend"] = []
    const point = new Date(`${dayLabel(from)}T00:00:00Z`), end = dayLabel(new Date(until.getTime() - 1))
    if (granularity !== "day") point.setUTCDate(1)
    if (granularity === "year") point.setUTCMonth(0)
    while (point.toISOString().slice(0, 10) <= end) {
      const date = point.toISOString().slice(0, 10)
      trend.push({ date, incoming: incomingMap.get(date) ?? 0, completed: completedMap.get(date) ?? 0 })
      if (granularity === "day") point.setUTCDate(point.getUTCDate() + 1)
      else if (granularity === "month") point.setUTCMonth(point.getUTCMonth() + 1)
      else point.setUTCFullYear(point.getUTCFullYear() + 1)
    }
    return { ...totals[0], from: dayLabel(from), to: end, granularity, categories, handlers, trend,
      rooms: rooms.map((room) => ({ ...room, location: room.room, facilities: objects.filter((object) => object.roomId === room.id).map(({ facility, totalReports, activeReports }) => ({ facility, totalReports, activeReports })) })), unclassifiedActive: unclassified[0].count }
  }
  async export(filter: ManagementFilter) {
    const order = filter.sort === "terlama" ? asc : desc
    const date = filter.dateBasis === "completed" ? reports.completedAt : reports.submittedAt
    // Export all matching rows, not just the loaded UI page; explicitly cap resource consumption.
    const rows = await this.db.select({ report: reports, reporter: users.name, unit: users.unit }).from(reports).innerJoin(users, eq(users.id, reports.reporterId)).where(criteria(filter, true)).orderBy(order(date), order(reports.id)).limit(5001)
    if (rows.length > 5000) throw new ReportError("Ekspor maksimal 5.000 laporan. Persempit periode atau filter.", 422)
    return this.hydrate(rows)
  }
  async execute(actor: ReportActor, command: ManagementCommand) {
    await this.db.transaction(async (tx) => {
      // [AUTH-ROLE] Revalidate the live account and lock the report in the same transaction.
      const [account] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "manajemen"), eq(users.isActive, true))).for("share")
      if (!account) throw new ReportError("Akun tidak memiliki akses Manajemen.", 403)
      const [report] = await tx.select().from(reports).where(and(scope, eq(reports.ticketNumber, command.ticket))).for("update")
      if (!report) throw new ReportError("Laporan Manajemen tidak ditemukan.", 404)
      if (report.status !== managementExpectedStatus(command.status)) throw new ReportError("Status laporan telah berubah. Muat ulang sebelum melanjutkan.", 409)
      assertTransition(report.category, report.status, command.status)
      const now = new Date(), note = command.note || "Penanganan laporan oleh Manajemen dimulai."
      await tx.update(reports).set({ status: command.status, updatedAt: now, completedAt: command.status === "selesai" ? now : null }).where(eq(reports.id, report.id))
      await tx.insert(reportStatusHistory).values({ reportId: report.id, actorId: actor.id, actorName: account.name, fromStatus: report.status, toStatus: command.status, note, createdAt: now })
      await tx.insert(notifications).values({ recipientId: report.reporterId, reportId: report.id, kind: "status", title: `Laporan ${statusLabels[command.status].toLowerCase()}`, description: `${report.ticketNumber}: ${note}`, createdAt: now })
    })
  }
  async attachment(id: string) {
    // Management monitoring may read submitted cross-role reports, never anyone's draft attachments.
    const [row] = await this.db.select({ file: reportAttachments }).from(reportAttachments).innerJoin(reports, eq(reports.id, reportAttachments.reportId)).where(eq(reportAttachments.id, id)).limit(1)
    return row?.file ?? null
  }
  notifications(actorId: string, cursor?: string) { return new DrizzleReportRepository(this.db).notifications(actorId, cursor) }
  markRead(actorId: string, id?: string) { return new DrizzleReportRepository(this.db).markRead(actorId, id) }
}
