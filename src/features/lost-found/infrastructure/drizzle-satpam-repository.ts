import "server-only"
import { randomUUID } from "node:crypto"
import { and, asc, desc, eq, gt, gte, ilike, inArray, isNull, lt, notExists, notInArray, or, sql } from "drizzle-orm"
import { alias } from "drizzle-orm/pg-core"
import { getDb } from "@/db"
import { sequentialQueries } from "@/db/sequential"
import { DrizzleInventoryRepository, type InventoryPhoto } from "./drizzle-inventory-repository"
import { users, reports, reportLostFoundDetails, reportAttachments, reportStatusHistory, notifications, securityOfficers, lostFoundMatches, reportHandovers, satpamInventory, satpamLossReports, reportTicketCounters } from "@/db/schema"
import { assertTransition, isUuid, ReportError, statusLabels, type ReportActor, type ReportStatus } from "../../reports/domain/report"
import { getIncidentDateTimeInWib } from "../../reports/domain/report-date"
import { DrizzleReportRepository } from "../../reports/infrastructure/drizzle-report-repository"
import { defaultReportFilters, reportDateBounds } from "../../reports/domain/report-list-filters"
import { expectedStatus, type SatpamCommand } from "../domain/satpam"
import { type InventoryFilter } from "../domain/inventory"
import { validateCreateLossReport, type CreateLossReportInput, type LossReport } from "../domain/loss-report"
import { validateCreateFoundReport, type CreateFoundReportInput, type FoundReport } from "../domain/found-report"
import type { SatpamRepository } from "../application/ports"

import type { SatpamDashboardData, SatpamHandoverHistoryItem, SatpamHistoryFilter, SatpamListFilter, SatpamLostFoundReport, SatpamPage, SatpamPendingHandover, SatpamReportStatus } from "../types"


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
      filter.matching ? notExists(this.db.select({ id: satpamInventory.id }).from(satpamInventory).where(eq(satpamInventory.sourceFoundReportId, reports.id))) : undefined,
      exactTicket ? eq(reports.ticketNumber, exactTicket) : undefined,
      filter.kind !== "semua" ? eq(reportLostFoundDetails.kind, filter.kind) : undefined,
      filter.matching
        ? and(inArray(reports.status, ["baru", "diproses"]), filter.status !== "semua" && filter.status !== "aktif" ? eq(reports.status, filter.status) : undefined)
        : filter.status === "aktif"
          ? notInArray(reports.status, ["selesai", "ditolak"])
          : filter.status !== "semua"
            ? eq(reports.status, filter.status)
            : undefined,
      bounds.from ? gte(reports.submittedAt, bounds.from) : undefined,
      bounds.until ? lt(reports.submittedAt, bounds.until) : undefined,
      filter.query ? or(ilike(reports.title, escaped(filter.query)), ilike(reports.ticketNumber, escaped(filter.query)), ilike(reports.locationText, escaped(filter.query)), ilike(reports.description, escaped(filter.query)), ilike(reportLostFoundDetails.itemName, escaped(filter.query)), ilike(reportLostFoundDetails.itemDetails, escaped(filter.query))) : undefined,
    )!
    const [rows, totals] = await Promise.all([
      this.db.select({ report: reports, kind: reportLostFoundDetails.kind, characteristics: reportLostFoundDetails.itemDetails, reporter: sql<string>`case when ${satpamLossReports.id} is not null then coalesce(${satpamLossReports.ownerName}, 'Pelapor langsung') else ${users.name} end`, reporterContact: satpamLossReports.ownerContact, recordedBy: users.name, inventoryId: satpamInventory.id }).from(reports)
        .innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).innerJoin(users, eq(users.id, reports.reporterId)).leftJoin(satpamInventory, eq(satpamInventory.sourceFoundReportId, reports.id)).leftJoin(satpamLossReports, eq(satpamLossReports.id, reports.id))
        .where(and(criteria, after ? or(compare(reports.submittedAt, after.date), and(eq(reports.submittedAt, after.date), compare(reports.id, after.id))) : undefined))
        .orderBy(order(reports.submittedAt), order(reports.id)).limit(pageSize + 1),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).where(criteria),
    ])
    const page = rows.slice(0, pageSize), ids = page.map((r) => r.report.id)
    // One batch for this page, not one attachment query per card.
    const files = ids.length ? await this.db.select({ id: reportAttachments.id, reportId: reportAttachments.reportId, mime: reportAttachments.mimeType }).from(reportAttachments).where(inArray(reportAttachments.reportId, ids)).orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)) : []
    const items = page.map(({ report: r, kind, characteristics, reporter, reporterContact, recordedBy, inventoryId }): SatpamLostFoundReport => {
      const attached = files.filter((file) => file.reportId === r.id), photo = attached.find((file) => file.mime.startsWith("image/"))
      return { id: r.id, inventoryId: inventoryId ?? undefined, reporterContact: reporterContact ?? undefined, recordedBy, ticket: r.ticketNumber, kind: kind as "kehilangan" | "temuan", title: r.title, reporter, location: r.locationText,
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
      this.db.select({ id: lostFoundMatches.id, lossTicket: lost.ticketNumber, foundTicket: found.ticketNumber, title: lost.title, reporter: users.name, matchedAt: lostFoundMatches.matchedAt, lossSubmittedAt: lost.submittedAt, foundSubmittedAt: found.submittedAt }).from(lostFoundMatches)
        .innerJoin(lost, eq(lost.id, lostFoundMatches.lossReportId)).innerJoin(found, eq(found.id, lostFoundMatches.foundReportId)).innerJoin(users, eq(users.id, lost.reporterId))
        .leftJoin(reportHandovers, eq(reportHandovers.matchId, lostFoundMatches.id))
        .where(and(criteria, after ? or(lt(lostFoundMatches.matchedAt, after.date), and(eq(lostFoundMatches.matchedAt, after.date), lt(lostFoundMatches.id, after.id))) : undefined))
        .orderBy(desc(lostFoundMatches.matchedAt), desc(lostFoundMatches.id)).limit(pageSize + 1),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(lostFoundMatches).leftJoin(reportHandovers, eq(reportHandovers.matchId, lostFoundMatches.id)).where(criteria),
    ])
    const page = rows.slice(0, pageSize), last = page.at(-1)
    return { items: page.map((r) => ({ ...r, matchedAt: dateLabel(r.matchedAt), lossSubmittedAt: dateLabel(r.lossSubmittedAt), foundSubmittedAt: dateLabel(r.foundSubmittedAt) })), total: totals[0].count, nextCursor: rows.length > pageSize && last ? cursorFor(last.matchedAt, last.id) : null }
  }
  async workspace() {
    const [officers, pending, totals] = await Promise.all([
      this.db.select().from(securityOfficers).orderBy(asc(securityOfficers.name)),
      this.pending(),
      this.db.select({ lostReports: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'kehilangan' and ${reports.status} not in ('selesai', 'ditolak'))::integer`, foundReports: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'temuan' and ${reports.status} not in ('selesai', 'ditolak'))::integer`, newFindings: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'temuan' and ${reports.status} = 'baru')::integer` }).from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).where(scope),
    ])
    return { officers: officers.filter((o) => o.isActive).map(({ id, name }) => ({ id, name })), historyOfficers: officers.map(({ id, name }) => ({ id, name })), pending, counts: { ...totals[0], readyForHandover: pending.total } }
  }
  async dashboard(): Promise<SatpamDashboardData> {
    // Operational priority is FIFO across active reports, including handover.
    // Bound and project in SQL; the dashboard needs no photos, officers or list totals.
    return this.db.transaction(async (tx) => {
      const [totals, handovers, queue, inventory] = await sequentialQueries([
        tx.select({ lostReports: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'kehilangan' and ${reports.status} not in ('selesai', 'ditolak'))::integer`, foundReports: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'temuan' and ${reports.status} not in ('selesai', 'ditolak'))::integer`, newFindings: sql<number>`count(*) filter (where ${reportLostFoundDetails.kind} = 'temuan' and ${reports.status} = 'baru')::integer` })
          .from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id)).where(scope),
        tx.select({ count: sql<number>`count(*)::integer` }).from(lostFoundMatches)
          .innerJoin(lost, eq(lost.id, lostFoundMatches.lossReportId)).innerJoin(found, eq(found.id, lostFoundMatches.foundReportId))
          .leftJoin(reportHandovers, eq(reportHandovers.matchId, lostFoundMatches.id))
          .where(and(isNull(reportHandovers.id), isNull(lostFoundMatches.completedAt), eq(lost.category, "kehilangan-temuan"), eq(found.category, "kehilangan-temuan"), eq(lost.handlerRole, "satpam"), eq(found.handlerRole, "satpam"))),
        tx.select({ id: reports.id, ticket: reports.ticketNumber, kind: reportLostFoundDetails.kind, title: reports.title, location: reports.locationText, status: reports.status, submittedAt: reports.submittedAt })
          .from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id))
          .where(and(scope, notInArray(reports.status, ["selesai", "ditolak"])))
          .orderBy(asc(reports.submittedAt), asc(reports.id)).limit(5),
        tx.select({ count: sql<number>`count(*)::integer` }).from(satpamInventory).where(eq(satpamInventory.status, "tersimpan")),
      ])
      return { ...totals[0], storedItems: inventory[0].count, readyForHandover: handovers[0].count, queue: queue.map((row) => ({ ...row, kind: row.kind as "kehilangan" | "temuan", status: statusLabels[row.status] as SatpamReportStatus, submittedAt: dateLabel(row.submittedAt) })), updatedAt: dateLabel(new Date()) }
    }, { isolationLevel: "repeatable read", accessMode: "read only" })
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
        const [inInventory] = await tx.select({ id: satpamInventory.id }).from(satpamInventory).where(eq(satpamInventory.sourceFoundReportId, foundReport.id))
        if (inInventory) throw new ReportError("Temuan sudah diterima di Inventaris. Lanjutkan penyerahan melalui barang tersebut.", 409)
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
          await update([report], command.status, command.note || (command.status === "diproses" ? "Laporan diterima dan siap untuk pencocokan barang." : statusLabels[command.status]))
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
      or(sql`${reportHandovers.inventoryId} is not null`, and(eq(lost.category, "kehilangan-temuan"), eq(lost.handlerRole, "satpam"), eq(found.category, "kehilangan-temuan"), eq(found.handlerRole, "satpam"))),
      filter.officerId ? eq(reportHandovers.officerId, filter.officerId) : undefined,
      filter.from ? gte(reportHandovers.handedOverAt, new Date(`${filter.from}T00:00:00+07:00`)) : undefined,
      filter.to ? lt(reportHandovers.handedOverAt, new Date(Date.parse(`${filter.to}T00:00:00+07:00`) + 86400000)) : undefined,
      filter.query ? or(ilike(lost.title, escaped(filter.query)), ilike(satpamInventory.itemName, escaped(filter.query)), ilike(reportHandovers.recipient, escaped(filter.query)), ilike(reportHandovers.officerName, escaped(filter.query))) : undefined,
    )
    return this.db.transaction(async tx => {
      const base = () => tx.select({ handover: reportHandovers, pair: lostFoundMatches, title: lost.title, lostTicket: lost.ticketNumber, foundTicket: found.ticketNumber, description: lost.description, characteristics: reportLostFoundDetails.itemDetails, itemName: reportLostFoundDetails.itemName, lostId: lost.id, foundId: found.id, lostSubmittedAt: lost.submittedAt, foundSubmittedAt: found.submittedAt, inventory: satpamInventory }).from(reportHandovers)
        .leftJoin(lostFoundMatches, eq(lostFoundMatches.id, reportHandovers.matchId))
        .leftJoin(satpamInventory, eq(satpamInventory.id, reportHandovers.inventoryId))
        .leftJoin(lost, eq(lost.id, sql`coalesce(${lostFoundMatches.lossReportId}, ${reportHandovers.lossReportId})`))
        .leftJoin(found, eq(found.id, sql`coalesce(${lostFoundMatches.foundReportId}, ${satpamInventory.sourceFoundReportId})`))
        .leftJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, lost.id))
      const rows = await base().where(and(criteria, after ? or(lt(reportHandovers.handedOverAt, after.date), and(eq(reportHandovers.handedOverAt, after.date), lt(reportHandovers.id, after.id))) : undefined)).orderBy(desc(reportHandovers.handedOverAt), desc(reportHandovers.id)).limit(pageSize + 1)
      const [total] = await tx.select({ count: sql<number>`count(*)::integer` }).from(reportHandovers)
        .leftJoin(lostFoundMatches, eq(lostFoundMatches.id, reportHandovers.matchId))
        .leftJoin(satpamInventory, eq(satpamInventory.id, reportHandovers.inventoryId))
        .leftJoin(lost, eq(lost.id, sql`coalesce(${lostFoundMatches.lossReportId}, ${reportHandovers.lossReportId})`))
        .leftJoin(found, eq(found.id, sql`coalesce(${lostFoundMatches.foundReportId}, ${satpamInventory.sourceFoundReportId})`)).where(criteria)
      const page = rows.slice(0, pageSize), last = page.at(-1)
      const reportIds = page.flatMap(r => [r.lostId, r.foundId]).filter((id): id is string => Boolean(id))
      const photos = reportIds.length ? await tx.select({ id: reportAttachments.id, reportId: reportAttachments.reportId }).from(reportAttachments)
        .where(and(inArray(reportAttachments.reportId, reportIds), ilike(reportAttachments.mimeType, "image/%"))).orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)) : []
      const photoUrl = (id: string | null) => { const photo = photos.find(file => file.reportId === id); return photo ? `/api/satpam/attachments/${photo.id}?preview=1` : undefined }
      return { items: page.map(r => ({
        id: r.handover.id, source: r.inventory ? "inventaris" as const : "laporan" as const, legacy: r.handover.legacy,
        inventoryId: r.inventory?.id, title: r.inventory?.itemName ?? r.title ?? "Barang",
        itemCategory: r.inventory?.itemName ?? r.itemName ?? "Barang", itemDescription: r.inventory?.description ?? [r.description, r.characteristics].filter(Boolean).join("\n\n"),
        lostTicket: r.lostTicket ?? "", foundTicket: r.foundTicket ?? "", lostSubmittedAt: r.lostSubmittedAt ? dateLabel(r.lostSubmittedAt) : "", foundSubmittedAt: r.foundSubmittedAt ? dateLabel(r.foundSubmittedAt) : "",
        lostPhotoUrl: photoUrl(r.lostId), foundPhotoUrl: r.inventory?.photoStorageKey ? `/api/satpam/inventory/${r.inventory.id}/photo?preview=1` : photoUrl(r.foundId),
        recipient: r.handover.recipient, handler: r.handover.officerName, actor: r.handover.actorName, location: r.handover.location,
        matchedAt: r.pair ? dateLabel(r.pair.matchedAt) : "", receivedAt: r.inventory ? dateLabel(r.inventory.createdAt) : undefined,
        handedOverAt: dateLabel(r.handover.handedOverAt), handedOverAtIso: r.handover.handedOverAt.toISOString(),
        completedAt: r.inventory ? dateLabel(r.handover.handedOverAt) : r.pair?.completedAt ? dateLabel(r.pair.completedAt) : "Belum ditutup",
        handoverNote: r.handover.note, ownershipEvidence: r.handover.ownershipEvidence, status: r.inventory || r.pair?.completedAt ? "Selesai" as const : "Diserahkan" as const,
      })), total: total.count, nextCursor: rows.length > pageSize && last ? cursorFor(last.handover.handedOverAt, last.handover.id) : null }
    }, { isolationLevel: "repeatable read", accessMode: "read only" })
  }
  async attachment(id: string) {
    const [row] = await this.db.select({ file: reportAttachments }).from(reportAttachments).innerJoin(reports, eq(reports.id, reportAttachments.reportId)).where(and(scope, eq(reportAttachments.id, id))).limit(1)
    return row?.file ?? null // Drafts have no submitted report and are never exposed to Satpam.
  }
  notifications(actorId: string, cursor?: string) { return new DrizzleReportRepository(this.db).notifications(actorId, cursor) }
  markRead(actorId: string, id?: string) { return new DrizzleReportRepository(this.db).markRead(actorId, id) }

  listInventory(filter: InventoryFilter) { return new DrizzleInventoryRepository(this.db).list(filter) }
  getInventoryItem(id: string) { return new DrizzleInventoryRepository(this.db).detail(id) }
  createInventory(actor: ReportActor, raw: unknown, photo?: InventoryPhoto) { return new DrizzleInventoryRepository(this.db).create(actor, raw, photo) }
  handoverInventory(actor: ReportActor, raw: unknown) { return new DrizzleInventoryRepository(this.db).handover(actor, raw) }

  async getInventoryPhoto(id: string): Promise<{ mimeType: string; storageKey: string; name: string } | null> {
    const [row] = await this.db
      .select({
        photoStorageKey: satpamInventory.photoStorageKey,
        photoMimeType: satpamInventory.photoMimeType,
        photoName: satpamInventory.photoName,
        sourceFoundReportId: satpamInventory.sourceFoundReportId,
      })
      .from(satpamInventory)
      .where(eq(satpamInventory.id, id))
      .limit(1)
    if (!row) return null
    if (!row.photoStorageKey || !row.photoMimeType) {
      if (!row.sourceFoundReportId) return null
      const [photo] = await this.db.select({ storageKey: reportAttachments.storageKey, mimeType: reportAttachments.mimeType, name: reportAttachments.name }).from(reportAttachments)
        .innerJoin(reports, eq(reports.id, reportAttachments.reportId)).where(and(eq(reports.id, row.sourceFoundReportId), scope, ilike(reportAttachments.mimeType, "image/%")))
        .orderBy(asc(reportAttachments.createdAt), asc(reportAttachments.id)).limit(1)
      return photo ?? null
    }
    return {
      storageKey: row.photoStorageKey,
      mimeType: row.photoMimeType,
      name: row.photoName || "foto-inventaris",
    }
  }

  private lossReportView(r: typeof satpamLossReports.$inferSelect): LossReport {
    return {
      id: r.id,
      title: r.title ?? undefined,
      itemName: r.itemName,
      location: r.location ?? undefined,
      incidentDate: r.incidentDate ?? undefined,
      incidentTime: r.incidentTime ?? undefined,
      characteristics: r.characteristics,
      description: r.description,
      photoUrl: r.photoStorageKey ? `/api/satpam/loss-reports/${r.id}/photo?preview=1` : undefined,
      registeredByName: r.registeredByName,
      createdAt: dateLabel(r.createdAt),
    }
  }

  async listLossReports(): Promise<{ items: LossReport[]; total: number }> {
    const [rows, [totals]] = await Promise.all([
      this.db.select().from(satpamLossReports).orderBy(desc(satpamLossReports.createdAt), desc(satpamLossReports.id)).limit(pageSize),
      this.db.select({ count: sql<number>`count(*)::integer` }).from(satpamLossReports),
    ])
    return { items: rows.map((r) => this.lossReportView(r)), total: totals.count }
  }

  async createLossReport(actor: ReportActor, raw: unknown, storedPhoto?: { storageKey: string; mimeType: string; name: string; size?: number }): Promise<LossReport> {
    const input = validateCreateLossReport(raw as CreateLossReportInput)
    const [account] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true)))
      .limit(1)
    if (!account) throw new ReportError("Akun tidak memiliki akses Satpam.", 403)

    const now = new Date()
    const currentWib = getIncidentDateTimeInWib(now)
    const incidentDate = input.incidentDate || currentWib.incidentDate
    const rawTime = input.incidentTime || currentWib.incidentTime
    const incidentTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime
    const title = input.title?.trim() || `Kehilangan ${input.itemName}`
    const locationText = input.location?.trim() || "Lingkungan Kampus JTI"

    return await this.db.transaction(async (tx) => {
      // 1. Generate unique sequential ticket code LJ-YYYY-XXXXX
      const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Jakarta" }).format(now))
      const [counter] = await tx
        .insert(reportTicketCounters)
        .values({ year, value: 1 })
        .onConflictDoUpdate({ target: reportTicketCounters.year, set: { value: sql`${reportTicketCounters.value} + 1` } })
        .returning()
      const ticketNumber = `LJ-${year}-${String(counter.value).padStart(5, "0")}`

      // 2. Insert into core reports table so it appears in /satpam/kehilangan-temuan and participates in lost-found lifecycle
      const [reportRow] = await tx
        .insert(reports)
        .values({
          ticketNumber,
          submissionKey: randomUUID(),
          reporterId: actor.id,
          category: "kehilangan-temuan",
          title,
          description: input.description,
          incidentDate,
          incidentTime,
          locationId: null,
          locationText,
          handlerRole: "satpam",
          status: "baru",
          submittedAt: now,
        })
        .returning()

      // 3. Link lost-found item details
      await tx.insert(reportLostFoundDetails).values({
        reportId: reportRow.id,
        kind: "kehilangan",
        itemName: input.itemName,
        itemDetails: input.characteristics || input.description,
      })

      const photoId = storedPhoto ? randomUUID() : undefined
      // 4. Attach photo if available
      if (storedPhoto) {
        await tx.insert(reportAttachments).values({
          id: photoId!,
          ownerId: actor.id,
          reportId: reportRow.id,
          name: storedPhoto.name,
          mimeType: storedPhoto.mimeType,
          size: storedPhoto.size || 1024,
          storageKey: storedPhoto.storageKey,
          createdAt: now,
        })
      }

      // 5. Create initial status history entry
      await tx.insert(reportStatusHistory).values({
        reportId: reportRow.id,
        actorId: actor.id,
        actorName: account.name,
        fromStatus: null,
        toStatus: "baru",
        note: "Laporan kehilangan dicatat oleh Satpam di Pos.",
        createdAt: now,
      })

      // 6. Record in satpamLossReports for audit
      const [inserted] = await tx
        .insert(satpamLossReports)
        .values({
          id: reportRow.id,
          ownerName: input.ownerName,
          ownerContact: input.ownerContact,
          title: input.title,
          itemName: input.itemName,
          location: input.location,
          incidentDate: input.incidentDate,
          incidentTime: input.incidentTime,
          characteristics: input.characteristics || input.description,
          description: input.description,
          photoUrl: input.photoUrl,
          photoStorageKey: storedPhoto?.storageKey,
          photoMimeType: storedPhoto?.mimeType,
          photoName: storedPhoto?.name,
          registeredBy: actor.id,
          registeredByName: account.name,
          createdAt: now,
        })
        .returning()

      return {
        ...this.lossReportView(inserted),
        ticket: ticketNumber,
        ticketNumber,
      }
    })
  }

  async getLossReportPhoto(id: string): Promise<{ mimeType: string; storageKey: string; name: string } | null> {
    const [row] = await this.db
      .select({ photoStorageKey: satpamLossReports.photoStorageKey, photoMimeType: satpamLossReports.photoMimeType, photoName: satpamLossReports.photoName })
      .from(satpamLossReports)
      .where(eq(satpamLossReports.id, id))
      .limit(1)
    if (!row || !row.photoStorageKey || !row.photoMimeType) return null
    return { storageKey: row.photoStorageKey, mimeType: row.photoMimeType, name: row.photoName || "foto-kehilangan" }
  }

  async createFoundReport(
    actor: ReportActor,
    raw: unknown,
    storedPhoto?: { storageKey: string; mimeType: string; name: string; size?: number }
  ): Promise<FoundReport> {
    const input = validateCreateFoundReport(raw as CreateFoundReportInput)
    const [account] = await this.db
      .select({ name: users.name })
      .from(users)
      .where(and(eq(users.id, actor.id), eq(users.role, "satpam"), eq(users.isActive, true)))
      .limit(1)
    if (!account) throw new ReportError("Akun tidak memiliki akses Satpam.", 403)

    const now = new Date()
    const currentWib = getIncidentDateTimeInWib(now)
    const incidentDate = input.incidentDate || currentWib.incidentDate
    const rawTime = input.incidentTime || currentWib.incidentTime
    const incidentTime = rawTime.length === 5 ? `${rawTime}:00` : rawTime
    const title = input.title?.trim() || `Temuan ${input.itemName}`
    const locationText = input.location?.trim() || "Lingkungan Kampus JTI"
    const targetStatus = input.status === "baru" ? "baru" : "diproses"

    return await this.db.transaction(async (tx) => {
      // 1. Generate unique sequential ticket code LJ-YYYY-XXXXX
      const year = Number(new Intl.DateTimeFormat("en", { year: "numeric", timeZone: "Asia/Jakarta" }).format(now))
      const [counter] = await tx
        .insert(reportTicketCounters)
        .values({ year, value: 1 })
        .onConflictDoUpdate({ target: reportTicketCounters.year, set: { value: sql`${reportTicketCounters.value} + 1` } })
        .returning()
      const ticketNumber = `LJ-${year}-${String(counter.value).padStart(5, "0")}`

      // 2. Insert into core reports table
      const [reportRow] = await tx
        .insert(reports)
        .values({
          ticketNumber,
          submissionKey: randomUUID(),
          reporterId: actor.id,
          category: "kehilangan-temuan",
          title,
          description: input.description,
          incidentDate,
          incidentTime,
          locationId: null,
          locationText,
          handlerRole: "satpam",
          status: targetStatus,
          submittedAt: now,
        })
        .returning()

      // 3. Link lost-found item details
      await tx.insert(reportLostFoundDetails).values({
        reportId: reportRow.id,
        kind: "temuan",
        itemName: input.itemName,
        itemDetails: [
          input.founderName ? `Penemu: ${input.founderName}` : null,
          input.characteristics || input.description,
        ]
          .filter(Boolean)
          .join("\n\n"),
      })

      const photoId = storedPhoto ? randomUUID() : undefined
      // 4. Attach photo if available
      if (storedPhoto) {
        await tx.insert(reportAttachments).values({
          id: photoId!,
          ownerId: actor.id,
          reportId: reportRow.id,
          name: storedPhoto.name,
          mimeType: storedPhoto.mimeType,
          size: storedPhoto.size || 1024,
          storageKey: storedPhoto.storageKey,
          createdAt: now,
        })
      }

      // 5. Create initial status history entry
      await tx.insert(reportStatusHistory).values({
        reportId: reportRow.id,
        actorId: actor.id,
        actorName: account.name,
        fromStatus: null,
        toStatus: targetStatus,
        note:
          targetStatus === "diproses"
            ? "Laporan temuan barang dicatat oleh Satpam dan siap dicocokkan."
            : "Laporan temuan baru dicatat oleh Satpam.",
        createdAt: now,
      })

      return {
        id: reportRow.id,
        ticket: ticketNumber,
        ticketNumber,
        title,
        itemName: input.itemName,
        location: locationText,
        incidentDate,
        incidentTime,
        founderName: input.founderName,
        characteristics: input.characteristics || input.description,
        description: input.description,
        status: targetStatus,
        photoUrl: storedPhoto ? `/api/satpam/attachments/${photoId}?preview=1` : undefined,
        registeredByName: account.name,
        createdAt: dateLabel(now),
      }
    })
  }
}

