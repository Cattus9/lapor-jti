import "server-only"
import { and, asc, eq, lt, notExists, notInArray, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { notifications, reportLostFoundDetails, reports, reportStatusHistory, users } from "@/db/schema"
import { isReportHandler, progressMessages, reportAttentionCutoffs } from "../domain/report-follow-up"
import { isUuid, ReportError, type ReportActor, type ReportHandler } from "../domain/report"

type Database = ReturnType<typeof getDb>
export const updateReminderKind = "report_update_reminder"
const active = notInArray(reports.status, ["selesai", "ditolak"])

export function reportAttentionOrder(cutoffs: ReturnType<typeof reportAttentionCutoffs>) {
  return sql`case
    when ${reports.submittedAt} < ${cutoffs.followUp.toISOString()} then 0
    when ${reports.submittedAt} < ${cutoffs.update.toISOString()} and ${reports.updatedAt} < ${cutoffs.update.toISOString()} then 1
    when ${reports.submittedAt} < ${cutoffs.review.toISOString()} and ${reports.firstOpenedTracking} and ${reports.firstOpenedAt} is null then 2
    else 3 end`
}

export function requiresReportFollowUp(cutoffs = reportAttentionCutoffs(new Date())) {
  return and(active, lt(reports.submittedAt, cutoffs.followUp))
}

export async function materializeReportReminders(db: Database, recipientId: string, handler: ReportHandler, now = new Date()) {
  const cutoff = reportAttentionCutoffs(now).update
  await db.insert(notifications).select(
    db.select({
      id: sql<string>`gen_random_uuid()`.as("id"),
      recipientId: users.id,
      reportId: reports.id,
      kind: sql<string>`'report_update_reminder'`.as("kind"),
      title: sql<string>`'Laporan perlu pembaruan'`.as("title"),
      description: sql<string>`'Sudah 7 hari kalender atau lebih tanpa pembaruan penanganan.'`.as("description"),
      createdAt: sql<Date>`now()`.as("created_at"),
      readAt: sql<Date | null>`null`.as("read_at"),
    }).from(reports)
      .innerJoin(users, and(eq(users.id, recipientId), eq(users.role, handler), eq(users.isActive, true)))
      .where(and(eq(reports.handlerRole, handler), active, lt(reports.submittedAt, cutoff), lt(reports.updatedAt, cutoff),
        notExists(db.select({ id: notifications.id }).from(notifications).where(and(
          eq(notifications.recipientId, recipientId), eq(notifications.reportId, reports.id), sql`${notifications.kind} = 'report_update_reminder'`,
        ))),
      ))
      .orderBy(asc(reports.submittedAt), asc(reports.id)).limit(50),
  ).onConflictDoNothing()
}

export async function recordReportProgress(actor: ReportActor, reportId: string, choice: unknown, db: Database = getDb()) {
  const { role } = actor
  if (!isReportHandler(role) || !isUuid(reportId)) throw new ReportError("Laporan tidak ditemukan.", 404)
  const options: Record<string, string> = progressMessages[role]
  if (typeof choice !== "string" || !Object.hasOwn(options, choice)) throw new ReportError("Pilih perkembangan yang sesuai.")
  const note = options[choice]

  return db.transaction(async (tx) => {
    const [account] = await tx.select({ name: users.name }).from(users)
      .where(and(eq(users.id, actor.id), eq(users.role, role), eq(users.isActive, true))).for("share")
    if (!account) throw new ReportError("Akun petugas tidak aktif atau akses telah berubah.", 403)
    const [report] = await tx.select().from(reports)
      .where(and(eq(reports.id, reportId), eq(reports.handlerRole, role))).for("update")
    if (!report) throw new ReportError("Laporan tidak ditemukan.", 404)
    if (report.status === "selesai" || report.status === "ditolak") throw new ReportError("Laporan sudah ditutup.", 409)
    if (role === "satpam" && choice === "searching") {
      const [loss] = await tx.select({ kind: reportLostFoundDetails.kind }).from(reportLostFoundDetails).where(eq(reportLostFoundDetails.reportId, reportId))
      if (loss?.kind !== "kehilangan") throw new ReportError("Pilih perkembangan yang sesuai untuk laporan temuan.")
    }

    const [last] = await tx.select().from(reportStatusHistory)
      .where(eq(reportStatusHistory.reportId, reportId))
      .orderBy(sql`${reportStatusHistory.createdAt} desc`, sql`${reportStatusHistory.id} desc`).limit(1)
    const now = new Date()
    // A retry or double click within a minute should not send the same update twice.
    if (last?.fromStatus === report.status && last.toStatus === report.status &&
        last.note === note && now.getTime() - last.createdAt.getTime() < 60_000) return { ok: true }

    await tx.update(reports).set({ updatedAt: now }).where(eq(reports.id, reportId))
    await tx.insert(reportStatusHistory).values({ reportId, actorId: actor.id, actorName: account.name, fromStatus: report.status, toStatus: report.status, note, createdAt: now })
    const [reporter] = await tx.select({ id: users.id }).from(users)
      .where(and(eq(users.id, report.reporterId), eq(users.role, "pelapor"), eq(users.isActive, true)))
    if (reporter) {
      await tx.insert(notifications).values({ recipientId: reporter.id, reportId, kind: "response", title: "Pembaruan penanganan laporan", description: note, createdAt: now })
    }
    return { ok: true }
  })
}
