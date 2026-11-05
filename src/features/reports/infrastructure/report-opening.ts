import "server-only"
import { and, eq, isNull, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { reports } from "@/db/schema"
import { isUuid, ReportError, type ReportActor } from "../domain/report"

type Database = ReturnType<typeof getDb>

// Opening is shared by the assigned team, not a status transition or a reporter update.
export async function markReportOpened(actor: ReportActor, id: string, db: Database = getDb()) {
  if (!isUuid(id)) throw new ReportError("Laporan tidak ditemukan.", 404)
  if (actor.role !== "satpam" && actor.role !== "teknisi" && actor.role !== "manajemen" && actor.role !== "tefa") throw new ReportError("Laporan tidak ditemukan.", 404)
  const scope = and(eq(reports.id, id), eq(reports.handlerRole, actor.role))
  const [changed] = await db.update(reports).set({ firstOpenedAt: new Date(), firstOpenedTracking: true, updatedAt: sql`${reports.updatedAt}` })
    .where(and(scope, isNull(reports.firstOpenedAt))).returning({ firstOpenedAt: reports.firstOpenedAt })
  if (changed) return { ok: true, firstOpenedAt: changed.firstOpenedAt!.toISOString() }
  const [existing] = await db.select({ firstOpenedAt: reports.firstOpenedAt }).from(reports).where(scope).limit(1)
  if (!existing?.firstOpenedAt) throw new ReportError("Laporan tidak ditemukan.", 404)
  return { ok: true, firstOpenedAt: existing.firstOpenedAt.toISOString() }
}
