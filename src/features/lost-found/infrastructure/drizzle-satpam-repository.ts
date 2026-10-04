import "server-only"
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getDb } from "@/db"
import { users, reports, reportLostFoundDetails, reportAttachments, reportStatusHistory, notifications, securityOfficers, lostFoundMatches, reportHandovers } from "@/db/schema"
import { assertTransition, isUuid, ReportError, statusLabels, type ReportActor, type ReportStatus } from "../../reports/domain/report"
import { DrizzleReportRepository } from "../../reports/infrastructure/drizzle-report-repository"
import { defaultReportFilters, reportDateBounds } from "../../reports/domain/report-list-filters"
import { expectedStatus, type SatpamCommand } from "../domain/satpam"
import type { SatpamRepository } from "../application/ports"
import type { SatpamHandoverHistoryItem, SatpamHistoryFilter, SatpamListFilter, SatpamLostFoundReport, SatpamPage, SatpamPendingHandover, SatpamReportStatus } from "../types"

type Database = ReturnType<typeof getDb>
type Transaction = Parameters<Parameters<Database["transaction"]>[0]>[0]
const pageSize = 20
const scope = and(eq(reports.category, "kehilangan-temuan"), eq(reports.handlerRole, "satpam"))!
const dateLabel = (date: Date) => new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(date)
const cursorFor = (date: Date, id: string) => Buffer.from(`${date.toISOString()}|${id}`).toString("base64url")
function cursorValue(value?: string) {
  if (!value) return null
  if (value.length > 160) throw new ReportError("Pagination tidak valid.")
  const [date, id] = Buffer.from(value, "base64url").toString("utf8").split("|")
  if (!isUuid(id) || !date || !Number.isFinite(Date.parse(date))) throw new ReportError("Pagination tidak valid.")
  return { date: new Date(date), id }
}
const escaped = (value: string) => `%${value.replace(/[\\%_]/g, "\\$&")}%`
const lost = alias(reports, "lost"), found = alias(reports, "found")

export class DrizzleSatpamRepository implements SatpamRepository {
  constructor(private readonly db: Database = getDb()) {}

  async list(filter: SatpamListFilter, exactTicket?: string): Promise<SatpamPage<SatpamLostFoundReport>> {
    const after = cursorValue(filter.cursor)
    const bounds = reportDateBounds({ ...defaultReportFilters, period: filter.period })
    // A UUID tie-breaker keeps both directions stable when timestamps are equal.
    const compare = filter.sort === "terlama" ? gt : lt
    const order = filter.sort === "terlama" ? asc : desc
    const criteria = and(scope,
      exactTicket ? eq(reports.ticketNumber, exactTicket) : undefined,
      filter.kind !== "semua" ? eq(reportLostFoundDetails.kind, filter.kind) : undefined,
      filter.matching ? inArray(reports.status, ["baru", "diverifikasi", "diproses"]) : filter.status !== "semua" ? eq(reports.status, filter.status) : undefined,
      bounds.from ? gte(reports.submittedAt, bounds.from) : undefined,
      bounds.until ? lt(reports.submittedAt, bounds.until) : undefined,
      filter.query ? or(ilike(reports.title, escaped(filter.query)), ilike(reports.ticketNumber, escaped(filter.query)), ilike(reports.locationText, escaped(filter.query)), ilike(reportLostFoundDetails.itemDetails, escaped(filter.query))) : undefined,
    )!
    const [rows, totals] = await Promise.all([
      this.db.select({ report: reports, kind: reportLostFoundDetails.kind, characteristics: reportLostFoundDetails.itemDetails, reporter: users.name }).from(reports)
        .innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).innerJoin(users, eq(users.id, reports.reporterId))
        .where(and(criteria, after ? or(compare(reports.submittedAt, after.date), and(eq(reports.submittedAt, after.date), compare(reports.id, after.id))) : undefined))
        .orderBy(order(reports.submittedAt), order(reports.id)).limit(pageSize + 1),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).where(criteria),
    ])
    const page = rows.slice(0, pageSize), ids = page.map((r) => r.report.id)
    // One batch for this page, not one attachment query per card.
    const files = ids.length ? await this.db.select({ id: reportAttachments.id, reportId: reportAttachments.reportId, mime: reportAttachments.mimeType }).from(reportAttachments).where(inArray(reportAttachments.reportId, ids)).orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)) : []
    const items = page.map(({ report: r, kind, characteristics, reporter }): SatpamLostFoundReport => {
      const attached = files.filter((file) => file.reportId === r.id), photo = attached.find((file) => file.mime.startsWith("image/"))
      return { id: r.id, ticket: r.ticketNumber, kind: kind as "kehilangan" | "temuan", title: r.title, reporter, location: r.locationText,
        eventDate: new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${r.incidentDate}T00:00:00+07:00`)),
        eventTime: r.incidentTime.slice(0, 5).replace(":", "."), submittedAt: dateLabel(r.submittedAt), updatedAt: dateLabel(r.updatedAt), status: statusLabels[r.status] as SatpamReportStatus,
        description: r.description, characteristics, attachments: attached.length, photoUrl: photo ? `/api/satpam/attachments/${photo.id}?preview=1` : undefined }
    })
    const last = page.at(-1)
    return { items, total: totals[0].count, nextCursor: rows.length > pageSize && last ? cursorFor(last.report.submittedAt, last.report.id) : null }
  }

  async detail(ticket: string) {
    // Reuse the list projection with an exact unique ticket, then fetch private detail only on demand.
    const page = await this.list({ kind: "semua", status: "semua", matching: false, query: "", period: "semua", sort: "terbaru" }, ticket)
    const report = page.items.find((item) => item.ticket === ticket)
    if (!report) return null
    const [history, files] = await Promise.all([
      this.db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, report.id)).orderBy(asc(reportStatusHistory.createdAt), asc(reportStatusHistory.id)),
      this.db.select({ id: reportAttachments.id, name: reportAttachments.name }).from(reportAttachments).where(eq(reportAttachments.reportId, report.id)).orderBy(asc(reportAttachments.createdAt)),
    ])
    return { report, history: history.map((h) => ({ status: statusLabels[h.toStatus] as SatpamReportStatus, actor: h.actorName, timestamp: dateLabel(h.createdAt), note: h.note })), files: files.map((f) => ({ ...f, url: `/api/satpam/attachments/${f.id}` })) }
  }

  async pending(cursor?: string): Promise<SatpamPage<SatpamPendingHandover>> {
    const after = cursorValue(cursor)
    const criteria = and(isNull(reportHandovers.id), isNull(lostFoundMatches.completedAt))!
    const [rows, totals] = await Promise.all([
      this.db.select({ id: lostFoundMatches.id, lossTicket: lost.ticketNumber, foundTicket: found.ticketNumber, title: lost.title, reporter: users.name, matchedAt: lostFoundMatches.matchedAt }).from(lostFoundMatches)
        .innerJoin(lost, eq(lost.id, lostFoundMatches.lossReportId)).innerJoin(found, eq(found.id, lostFoundMatches.foundReportId)).innerJoin(users, eq(users.id, lost.reporterId))
        .leftJoin(reportHandovers, eq(reportHandovers.matchId, lostFoundMatches.id))
        .where(and(criteria, after ? or(lt(lostFoundMatches.matchedAt, after.date), and(eq(lostFoundMatches.matchedAt, after.date), lt(lostFoundMatches.id, after.id))) : undefined))
        .orderBy(desc(lostFoundMatches.matchedAt), desc(lostFoundMatches.id)).limit(pageSize + 1),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(lostFoundMatches).leftJoin(reportHandovers, eq(reportHandovers.matchId, lostFoundMatches.id)).where(criteria),
    ])
    const page = rows.slice(0, pageSize), last = page.at(-1)
    return { items: page.map((r) => ({ ...r, matchedAt: dateLabel(r.matchedAt) })), total: totals[0].count, nextCursor: rows.length > pageSize && last ? cursorFor(last.matchedAt, last.id) : null }
  }
  async workspace() {
    const [officers, pending, totals] = await Promise.all([
      this.db.select().from(securityOfficers).orderBy(asc(securityOfficers.name)),
      this.pending(),
      this.db.select({ lostReports: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'kehilangan' and ${reports.status} not in ('selesai', 'ditolak'))::integer`, foundReports: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'temuan' and ${reports.status} not in ('selesai', 'ditolak'))::integer`, newFindings: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'temuan' and ${reports.status} = 'baru')::integer` }).from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).where(scope),
    ])
    return { officers: officers.filter((o) => o.isActive).map(({ id, name }) => ({ id, name })), historyOfficers: officers.map(({ id, name }) => ({ id, name })), pending, counts: { ...totals[0], readyForHandover: pending.total } }
  }
  async dashboard() {
    const [workspace, page] = await Promise.all([this.workspace(), this.list({ kind: "semua", status: "semua", matching: true, query: "", period: "semua", sort: "terbaru" })])
    return { ...workspace.counts, queue: page.items.slice(0, 5), updatedAt: dateLabel(new Date()) }
  }

  async execute(actor: ReportActor, command: SatpamCommand) {
    await this.db.transaction(async (tx) => {
      const [account] = await tx.select({ name: users.name }).from(users).where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true))).for("share")
      if (!account) throw new ReportError("Akun tidak memiliki akses Satpam.", 403)
      const now = new Date()
      const update = async (rows: Array<typeof reports.$inferSelect>, target: ReportStatus, note: string) => {
        for (const r of rows) {
          assertTransition("kehilangan-temuan", r.status, target)
          await tx.update(reports).set({ status: target, updatedAt: now, completedAt: target === "selesai" ? now : null }).where(eq(reports.id, r.id))
          await tx.insert(reportStatusHistory).values({ reportId: r.id, actorId: actor.id, actorName: account.name, fromStatus: r.status, toStatus: target, note, createdAt: now })
          await tx.insert(notifications).values({ recipientId: r.reporterId, reportId: r.id, kind: "status", title: `Laporan ${statusLabels[target].toLowerCase()}`, description: `${r.ticketNumber}: ${note || statusLabels[target]}`, createdAt: now })
        }
      }
      if (command.type === "match") {
        // All workflows lock report UUIDs in the same order to avoid crossed-pair deadlocks.
        const rows = await tx.select().from(reports).where(and(scope, inArray(reports.ticketNumber, [command.lossTicket, command.foundTicket]))).orderBy(asc(reports.id)).for("update")
        const loss = rows.find((r) => r.ticketNumber === command.lossTicket), foundReport = rows.find((r) => r.ticketNumber === command.foundTicket)
        if (!loss || !foundReport) throw new ReportError("Laporan tidak ditemukan.", 404)
        const details = await tx.select().from(reportLostFoundDetails).where(inArray(reportLostFoundDetails.reportId, [loss.id, foundReport.id]))
        if (details.find((d) => d.reportId === loss.id)?.kind !== "kehilangan" || details.find((d) => d.reportId === foundReport.id)?.kind !== "temuan") throw new ReportError("Pasangan harus berupa laporan kehilangan dan temuan.")
        if (rows.some((r) => r.status !== "diproses")) throw new ReportError("Kedua laporan harus berstatus Diproses. Muat ulang data.", 409)
        const occupied = await tx.select({ id: lostFoundMatches.id }).from(lostFoundMatches).where(or(inArray(lostFoundMatches.lossReportId, [loss.id, foundReport.id]), inArray(lostFoundMatches.foundReportId, [loss.id, foundReport.id]))).limit(1)
        if (occupied.length) throw new ReportError("Laporan sudah memiliki pasangan.", 409)
        await tx.insert(lostFoundMatches).values({ lossReportId: loss.id, foundReportId: foundReport.id, matchedBy: actor.id, matchedAt: now })
        await update([loss], "barang_teridentifikasi", `Dicocokkan dengan tiket ${foundReport.ticketNumber}.`)
        await update([foundReport], "barang_teridentifikasi", `Dicocokkan dengan tiket ${loss.ticketNumber}.`)
      } else if (command.type === "handover") {
        const [pair] = await tx.select().from(lostFoundMatches).where(eq(lostFoundMatches.id, command.matchId))
        if (!pair) throw new ReportError("Pasangan laporan tidak ditemukan.", 404)
        const rows = await this.lockPair(tx, pair)
        const [officer] = await tx.select().from(securityOfficers).where(and(eq(securityOfficers.id, command.officerId), eq(securityOfficers.isActive, true))).for("share")
        if (!officer) throw new ReportError("Petugas tidak tersedia atau sudah nonaktif.")
        if (rows.some((r) => r.status !== "barang_teridentifikasi") || pair.completedAt) throw new ReportError("Pasangan sudah berubah atau telah diserahkan. Muat ulang data.", 409)
        await tx.insert(reportHandovers).values({ matchId: pair.id, officerId: officer.id, officerName: officer.name, actorId: actor.id, actorName: account.name, recipient: command.recipient, location: command.location, note: command.note, handedOverAt: now })
        await update(rows, "diserahkan", `Barang diterima oleh ${command.recipient}. Petugas penyerahan: ${officer.name}. Lokasi: ${command.location}.${command.note ? ` ${command.note}` : ""}`)
      } else {
        if (command.status === "selesai") {
          const [report] = await tx.select({ id: reports.id }).from(reports).where(and(scope, eq(reports.ticketNumber, command.ticket)))
          if (!report) throw new ReportError("Laporan tidak ditemukan.", 404)
          const [pair] = await tx.select().from(lostFoundMatches).where(or(eq(lostFoundMatches.lossReportId, report.id), eq(lostFoundMatches.foundReportId, report.id)))
          if (!pair) throw new ReportError("Laporan belum memiliki catatan pencocokan.", 409)
          const rows = await this.lockPair(tx, pair)
          if (rows.some((r) => r.status !== "diserahkan")) throw new ReportError("Kedua tiket harus sudah diserahkan. Muat ulang data.", 409)
          const [handover] = await tx.select({ id: reportHandovers.id }).from(reportHandovers).where(eq(reportHandovers.matchId, pair.id))
          if (!handover) throw new ReportError("Catatan penyerahan belum tersedia.", 409)
          await update(rows, "selesai", command.note || "Pasangan laporan ditutup setelah penyerahan barang.")
          await tx.update(lostFoundMatches).set({ completedAt: now }).where(eq(lostFoundMatches.id, pair.id))
        } else {
          const [report] = await tx.select().from(reports).where(and(scope, eq(reports.ticketNumber, command.ticket))).for("update")
          if (!report) throw new ReportError("Laporan tidak ditemukan.", 404)
          if (report.status !== expectedStatus(command.status)) throw new ReportError("Status laporan sudah berubah. Muat ulang data.", 409)
          await update([report], command.status, command.note || statusLabels[command.status])
        }
      }
    })
  }
  private async lockPair(tx: Transaction, pair: typeof lostFoundMatches.$inferSelect) {
    const rows = await tx.select().from(reports).where(and(scope, inArray(reports.id, [pair.lossReportId, pair.foundReportId]))).orderBy(asc(reports.id)).for("update")
    if (rows.length !== 2) throw new ReportError("Pasangan laporan tidak valid.", 409)
    return rows
  }

  async history(filter: SatpamHistoryFilter): Promise<SatpamPage<SatpamHandoverHistoryItem>> {
    const after = cursorValue(filter.cursor)
    const criteria = and(
      filter.officerId ? eq(reportHandovers.officerId, filter.officerId) : undefined,
      filter.from ? gte(reportHandovers.handedOverAt, new Date(`${filter.from}T00:00:00+07:00`)) : undefined,
      filter.to ? lt(reportHandovers.handedOverAt, new Date(Date.parse(`${filter.to}T00:00:00+07:00`) + 86400000)) : undefined,
      filter.query ? or(ilike(lost.title, escaped(filter.query)), ilike(lost.ticketNumber, escaped(filter.query)), ilike(found.ticketNumber, escaped(filter.query)), ilike(reportHandovers.recipient, escaped(filter.query)), ilike(reportHandovers.officerName, escaped(filter.query))) : undefined,
    )
    const base = () => this.db.select({ handover: reportHandovers, pair: lostFoundMatches, title: lost.title, lostTicket: lost.ticketNumber, foundTicket: found.ticketNumber, description: reportLostFoundDetails.itemDetails, itemName: reportLostFoundDetails.itemName }).from(reportHandovers)
      .innerJoin(lostFoundMatches, eq(lostFoundMatches.id, reportHandovers.matchId)).innerJoin(lost, eq(lost.id, lostFoundMatches.lossReportId)).innerJoin(found, eq(found.id, lostFoundMatches.foundReportId)).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, lost.id))
    const rows = await base().where(and(criteria, after ? or(lt(reportHandovers.handedOverAt, after.date), and(eq(reportHandovers.handedOverAt, after.date), lt(reportHandovers.id, after.id))) : undefined)).orderBy(desc(reportHandovers.handedOverAt), desc(reportHandovers.id)).limit(pageSize + 1)
    const [total] = await this.db.select({ count: sql<number>`count(*)::integer` }).from(reportHandovers).innerJoin(lostFoundMatches, eq(lostFoundMatches.id, reportHandovers.matchId)).innerJoin(lost, eq(lost.id, lostFoundMatches.lossReportId)).innerJoin(found, eq(found.id, lostFoundMatches.foundReportId)).where(criteria)
    const page = rows.slice(0, pageSize), last = page.at(-1)
    const reportIds = page.flatMap(({ pair }) => [pair.lossReportId, pair.foundReportId])
    const photos = reportIds.length ? await this.db.select({ id: reportAttachments.id, reportId: reportAttachments.reportId }).from(reportAttachments)
      .where(and(inArray(reportAttachments.reportId, reportIds), ilike(reportAttachments.mimeType, "image/%"))).orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)) : []
    const photoUrl = (reportId: string) => { const photo = photos.find((file) => file.reportId === reportId); return photo ? `/api/satpam/attachments/${photo.id}?preview=1` : undefined }
    return { items: page.map(({ handover: h, pair, title, description, itemName, lostTicket, foundTicket }) => ({ id: h.id, title, itemCategory: itemName, itemDescription: description, lostTicket, foundTicket, lostPhotoUrl: photoUrl(pair.lossReportId), foundPhotoUrl: photoUrl(pair.foundReportId), recipient: h.recipient, handler: h.officerName, actor: h.actorName, location: h.location, matchedAt: dateLabel(pair.matchedAt), handedOverAt: dateLabel(h.handedOverAt), handedOverAtIso: h.handedOverAt.toISOString(), completedAt: pair.completedAt ? dateLabel(pair.completedAt) : "Belum ditutup", handoverNote: h.note, status: pair.completedAt ? "Selesai" : "Diserahkan" })), total: total.count, nextCursor: rows.length > pageSize && last ? cursorFor(last.handover.handedOverAt, last.handover.id) : null }
  }
  async attachment(id: string) {
    const [row] = await this.db.select({ file: reportAttachments }).from(reportAttachments).innerJoin(reports, eq(reports.id, reportAttachments.reportId)).where(and(scope, eq(reportAttachments.id, id))).limit(1)
    return row?.file ?? null // Drafts have no submitted report and are never exposed to Satpam.
  }
  notifications(actorId: string, cursor?: string) { return new DrizzleReportRepository(this.db).notifications(actorId, cursor) }
  markRead(actorId: string, id?: string) { return new DrizzleReportRepository(this.db).markRead(actorId, id) }
}
