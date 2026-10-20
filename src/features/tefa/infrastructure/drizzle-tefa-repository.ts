import "server-only"
import { and, asc, eq, isNotNull, or, sql } from "drizzle-orm"
import { getDb } from "@/db"
import { reports, reportServiceDetails, services } from "@/db/schema"
import { DrizzleManagementRepository } from "../../management/infrastructure/drizzle-management-repository"
import type { TefaServiceSummary } from "../types"

// Shared query/projection machinery, but every read/write is forcibly TEFA-scoped.
export class DrizzleTefaRepository extends DrizzleManagementRepository {
  constructor(db = getDb()) { super(db, "tefa") }
  async services(): Promise<TefaServiceSummary[]> {
    const rows = await this.db.select({ id: services.id, name: services.name, isActive: services.isActive, handler: services.handlerRole,
      activeReports: sql<number>`count(${reports.id}) filter (where ${reports.status} in ('baru', 'diproses'))::integer`,
    }).from(services).leftJoin(reportServiceDetails, eq(reportServiceDetails.serviceId, services.id))
      .leftJoin(reports, and(eq(reports.id, reportServiceDetails.reportId), eq(reports.handlerRole, "tefa"), eq(reports.category, "layanan")))
      .where(or(eq(services.handlerRole, "tefa"), isNotNull(reports.id))).groupBy(services.id).orderBy(asc(services.name), asc(services.id))
    return rows.map(({ isActive, handler, ...row }) => ({ ...row, available: isActive && handler === "tefa" }))
  }
}
