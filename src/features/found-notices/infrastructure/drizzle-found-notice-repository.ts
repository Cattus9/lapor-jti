import "server-only"
import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm"
import { unionAll } from "drizzle-orm/pg-core"
import { getDb } from "@/db"
import { foundNoticeReads, satpamInventory } from "@/db/lost-found-schema"
import { reportLostFoundDetails, reports } from "@/db/reports-schema"
import { users } from "@/db/schema"
import { ReportError } from "@/features/reports/domain/report"
import type { FoundNoticeQuery, FoundNoticeRepository } from "../application/found-notice-service"
import { parseFoundNoticeCursor, presentFoundNotice, type FoundNoticeRef, type FoundNoticeSource, type FoundNoticeState } from "../domain/found-notice"

type Database = ReturnType<typeof getDb>
export class DrizzleFoundNoticeRepository implements FoundNoticeRepository {
  constructor(private readonly db: Database = getDb()) {}

  private feed() {
    // Linking a report to inventory updates this projection; it does not publish twice.
    const reported = this.db.select({
      source: sql<FoundNoticeSource>`'report'`.as("source"), id: reports.id,
      itemName: reportLostFoundDetails.itemName,
      foundLocation: sql<string>`${reports.locationText}`.as("found_location"),
      storageLocation: sql<string | null>`${satpamInventory.storageLocation}`.as("storage_location"),
      publishedAt: sql<Date>`${reports.submittedAt}`.mapWith(reports.submittedAt).as("published_at"),
      state: sql<FoundNoticeState>`case
        when ${satpamInventory.status} = 'diserahkan' then 'returned'
        when ${satpamInventory.status} = 'tersimpan' then 'stored'
        when ${reports.status} in ('selesai', 'diserahkan') then 'closed'
        else 'reported' end`.as("state"),
    }).from(reports).innerJoin(reportLostFoundDetails, eq(reportLostFoundDetails.reportId, reports.id))
      .leftJoin(satpamInventory, eq(satpamInventory.sourceFoundReportId, reports.id))
      .where(and(eq(reports.category, "kehilangan-temuan"), eq(reports.handlerRole, "satpam"), eq(reportLostFoundDetails.kind, "temuan"), sql`${reports.status} <> 'ditolak'`))
    const received = this.db.select({
      source: sql<FoundNoticeSource>`'inventory'`.as("source"), id: satpamInventory.id,
      itemName: satpamInventory.itemName,
      foundLocation: sql<string>`coalesce(${satpamInventory.foundLocation}, 'Lokasi temuan belum dicatat')`.as("found_location"),
      storageLocation: sql<string | null>`${satpamInventory.storageLocation}`.as("storage_location"),
      publishedAt: sql<Date>`${satpamInventory.createdAt}`.mapWith(satpamInventory.createdAt).as("published_at"),
      state: sql<FoundNoticeState>`case when ${satpamInventory.status} = 'tersimpan' then 'stored' else 'returned' end`.as("state"),
    }).from(satpamInventory).where(isNull(satpamInventory.sourceFoundReportId))
    return this.db.$with("found_notice_feed").as(unionAll(reported, received))
  }

  private receipt(userId: string, feed: ReturnType<DrizzleFoundNoticeRepository["feed"]>) {
    return and(eq(foundNoticeReads.userId, userId), or(
      and(eq(feed.source, "report"), eq(foundNoticeReads.reportId, feed.id)),
      and(eq(feed.source, "inventory"), eq(foundNoticeReads.inventoryId, feed.id)),
    ))
  }

  async list(userId: string, query: FoundNoticeQuery = {}) {
    const feed = this.feed(), after = parseFoundNoticeCursor(query.cursor), limit = query.limit ?? 20
    const active = query.activeOnly ? sql`${feed.state} in ('reported', 'stored')` : undefined
    const before = after ? or(lt(feed.publishedAt, after.publishedAt), and(eq(feed.publishedAt, after.publishedAt), lt(feed.id, after.id)), and(eq(feed.publishedAt, after.publishedAt), eq(feed.id, after.id), lt(feed.source, after.source))) : undefined
    const [rows, [count]] = await Promise.all([
      this.db.with(feed).select({ source: feed.source, id: feed.id, itemName: feed.itemName, foundLocation: feed.foundLocation, storageLocation: feed.storageLocation, publishedAt: feed.publishedAt, state: feed.state, readAt: foundNoticeReads.readAt })
        .from(feed).leftJoin(foundNoticeReads, this.receipt(userId, feed)).where(and(active, before))
        .orderBy(desc(feed.publishedAt), desc(feed.id), desc(feed.source)).limit(limit + 1),
      this.db.with(feed).select({ total: sql<number>`count(*)::integer`, unread: sql<number>`count(*) filter (where ${foundNoticeReads.id} is null)::integer` })
        .from(feed).leftJoin(foundNoticeReads, this.receipt(userId, feed)).where(active),
    ])
    const items = rows.slice(0, limit), last = items.at(-1)
    return { items: items.map(presentFoundNotice), total: count.total, unread: count.unread,
      nextCursor: rows.length > limit && last ? JSON.stringify({ publishedAt: last.publishedAt.toISOString(), source: last.source, id: last.id }) : null }
  }

  async detail(userId: string, ref: FoundNoticeRef) {
    const feed = this.feed()
    const [row] = await this.db.with(feed).select({ source: feed.source, id: feed.id, itemName: feed.itemName, foundLocation: feed.foundLocation, storageLocation: feed.storageLocation, publishedAt: feed.publishedAt, state: feed.state, readAt: foundNoticeReads.readAt })
      .from(feed).leftJoin(foundNoticeReads, this.receipt(userId, feed)).where(and(eq(feed.source, ref.source), eq(feed.id, ref.id))).limit(1)
    return row ? presentFoundNotice(row) : null
  }

  async markRead(userId: string, ref: FoundNoticeRef) {
    return this.db.transaction(async tx => {
      const [actor] = await tx.select({ id: users.id }).from(users).where(and(eq(users.id, userId), eq(users.role, "pelapor"), eq(users.isActive, true))).for("share")
      if (!actor) throw new ReportError("Akun tidak memiliki akses Pelapor.", 403)
      const repository = new DrizzleFoundNoticeRepository(tx as unknown as Database)
      if (!await repository.detail(userId, ref)) return false
      await tx.insert(foundNoticeReads).values({ userId, reportId: ref.source === "report" ? ref.id : null, inventoryId: ref.source === "inventory" ? ref.id : null }).onConflictDoNothing()
      return true
    })
  }
}
