import { sql } from "drizzle-orm"
import { pgTable, uuid, text, boolean, timestamp, index, check, integer } from "drizzle-orm/pg-core"
import { users } from "./schema"
import { reports } from "./reports-schema"

// Officers are operational identities, not login accounts. A shared Satpam login remains valid.
export const securityOfficers = pgTable("security_officers", {
  id: uuid("id").defaultRandom().primaryKey(), name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  revision: integer("revision").notNull().default(0),
}, (t) => [check("security_officer_name_check", sql`length(trim(${t.name})) between 1 and 100`)])

export const lostFoundMatches = pgTable("lost_found_matches", {
  id: uuid("id").defaultRandom().primaryKey(),
  lossReportId: uuid("loss_report_id").notNull().unique().references(() => reports.id, { onDelete: "restrict" }),
  foundReportId: uuid("found_report_id").notNull().unique().references(() => reports.id, { onDelete: "restrict" }),
  matchedBy: uuid("matched_by").notNull().references(() => users.id, { onDelete: "restrict" }),
  matchedAt: timestamp("matched_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true, precision: 3 }),
}, (t) => [
  check("lost_found_distinct_reports_check", sql`${t.lossReportId} <> ${t.foundReportId}`),
  check("lost_found_completion_date_check", sql`${t.completedAt} is null or ${t.completedAt} >= ${t.matchedAt}`),
  index("matches_pending_date_idx").on(t.matchedAt.desc(), t.id.desc()).where(sql`${t.completedAt} is null`),
])

export const reportHandovers = pgTable("report_handovers", {
  id: uuid("id").defaultRandom().primaryKey(),
  matchId: uuid("match_id").notNull().unique().references(() => lostFoundMatches.id, { onDelete: "restrict" }),
  officerId: uuid("officer_id").notNull().references(() => securityOfficers.id, { onDelete: "restrict" }),
  officerName: text("officer_name").notNull(), // Snapshot survives later officer renames/deactivation.
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  actorName: text("actor_name").notNull(),
  recipient: text("recipient").notNull(), location: text("location").notNull(), note: text("note").notNull(),
  handedOverAt: timestamp("handed_over_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (t) => [
  index("handovers_date_idx").on(t.handedOverAt.desc(), t.id.desc()),
  index("handovers_officer_date_idx").on(t.officerId, t.handedOverAt.desc(), t.id.desc()),
  check("handover_recipient_check", sql`length(trim(${t.recipient})) between 1 and 150`),
  check("handover_location_check", sql`length(trim(${t.location})) between 1 and 200`),
  check("handover_note_check", sql`length(${t.note}) <= 2000`),
])
