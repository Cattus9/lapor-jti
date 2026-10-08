import { sql } from "drizzle-orm"
import { pgTable, pgEnum, uuid, text, timestamp, date, time, boolean, integer, jsonb, bigint, index, uniqueIndex, check } from "drizzle-orm/pg-core"
import { users } from "./schema"
import { reportCategories, reportStatuses, type ReportPayload } from "../features/reports/domain/report"

export const reportCategory = pgEnum("report_category", reportCategories)
export const reportStatus = pgEnum("report_status", reportStatuses)
export const reportHandler = pgEnum("report_handler", ["satpam", "teknisi", "manajemen"])
const auditDates = () => ({ createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(), updatedAt: timestamp("updated_at", { withTimezone: true, precision: 3 }).notNull().defaultNow().$onUpdate(() => new Date()) })
export const locations = pgTable("locations", { id: text("id").primaryKey(), name: text("name").notNull().unique(), group: text("group_name").notNull(), isActive: boolean("is_active").notNull().default(true) })
export const facilityObjects = pgTable("facility_objects", { id: text("id").primaryKey(), name: text("name").notNull().unique(), group: text("group_name").notNull(), isActive: boolean("is_active").notNull().default(true) })
export const services = pgTable("services", { id: text("id").primaryKey(), name: text("name").notNull().unique(), isActive: boolean("is_active").notNull().default(true) })
export const reports = pgTable("reports", {
  id: uuid("id").defaultRandom().primaryKey(), ticketNumber: text("ticket_number").notNull().unique(),
  submissionKey: uuid("submission_key").notNull().unique(), reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  category: reportCategory("category").notNull(), title: text("title").notNull(), description: text("description").notNull(),
  incidentDate: date("incident_date").notNull(), incidentTime: time("incident_time").notNull(),
  locationId: text("location_id").references(() => locations.id, { onDelete: "restrict" }), locationText: text("location_text").notNull(),
  handlerRole: reportHandler("handler_role").notNull(), status: reportStatus("status").notNull().default("baru"),
  submittedAt: timestamp("submitted_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(), completedAt: timestamp("completed_at", { withTimezone: true, precision: 3 }),
  ...auditDates(),
}, (t) => [
  index("reports_reporter_date_idx").on(t.reporterId, t.submittedAt.desc(), t.id.desc()),
  index("reports_reporter_updated_idx").on(t.reporterId, t.updatedAt.desc(), t.id.desc()),
  index("reports_handler_status_date_idx").on(t.handlerRole, t.status, t.submittedAt.desc(), t.id.desc()),
  index("reports_handler_date_idx").on(t.handlerRole, t.submittedAt.desc(), t.id.desc()),
  index("reports_date_idx").on(t.submittedAt.desc(), t.id.desc()),
  index("reports_status_date_idx").on(t.status, t.submittedAt.desc(), t.id.desc()),
  index("reports_category_date_idx").on(t.category, t.submittedAt),
  index("reports_location_active_idx").on(t.locationId, t.status).where(sql`${t.status} not in ('selesai', 'ditolak')`),
  index("reports_completed_at_idx").on(t.completedAt).where(sql`${t.completedAt} is not null`),
  index("reports_handler_completed_idx").on(t.handlerRole, t.completedAt.desc(), t.id.desc()).where(sql`${t.completedAt} is not null`),
  check("reports_completion_status_check", sql`(${t.status} = 'selesai') = (${t.completedAt} is not null)`),
  check("reports_title_check", sql`length(trim(${t.title})) between 1 and 200`),
  check("reports_description_check", sql`length(trim(${t.description})) between 1 and 5000`),
  check("reports_handler_category_check", sql`(${t.category} = 'kehilangan-temuan' and ${t.handlerRole} = 'satpam') or (${t.category} = 'fasilitas' and ${t.handlerRole} = 'teknisi') or (${t.category} in ('layanan', 'lainnya') and ${t.handlerRole} = 'manajemen')`),
  check("reports_status_category_check", sql`${t.status} in ('baru', 'diproses', 'selesai', 'ditolak') or (${t.category} in ('kehilangan-temuan', 'fasilitas') and ${t.status} = 'diverifikasi') or (${t.category} = 'kehilangan-temuan' and ${t.status} in ('barang_teridentifikasi', 'diserahkan'))`),
])
// Atomic per-year counter, not MAX(ticket)+1. Incremented in the submission transaction.
export const reportTicketCounters = pgTable("report_ticket_counters", { year: integer("year").primaryKey(), value: bigint("value", { mode: "number" }).notNull() })
export const reportLostFoundDetails = pgTable("report_lost_found_details", { reportId: uuid("report_id").primaryKey().references(() => reports.id, { onDelete: "cascade" }), kind: text("kind").notNull(), itemName: text("item_name").notNull(), itemDetails: text("item_details").notNull() }, (t) => [check("lost_found_kind_check", sql`${t.kind} in ('kehilangan', 'temuan')`)])
export const reportFacilityObjects = pgTable("report_facility_objects", { id: uuid("id").defaultRandom().primaryKey(), reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }), objectId: text("object_id").references(() => facilityObjects.id, { onDelete: "restrict" }), objectText: text("object_text").notNull() }, (t) => [uniqueIndex("report_object_unique").on(t.reportId, t.objectText), index("report_facility_object_idx").on(t.objectId)])
export const reportServiceDetails = pgTable("report_service_details", { reportId: uuid("report_id").primaryKey().references(() => reports.id, { onDelete: "cascade" }), serviceId: text("service_id").notNull().references(() => services.id, { onDelete: "restrict" }), serviceName: text("service_name").notNull(), program: text("program").notNull() })
export const reportOtherDetails = pgTable("report_other_details", { reportId: uuid("report_id").primaryKey().references(() => reports.id, { onDelete: "cascade" }), categoryText: text("category_text").notNull() })
export const reportDrafts = pgTable("report_drafts", {
  id: uuid("id").primaryKey(), reporterId: uuid("reporter_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  payload: jsonb("payload").$type<ReportPayload>().notNull(), schemaVersion: integer("schema_version").notNull().default(1), revision: integer("revision").notNull().default(0),
  submittedReportId: uuid("submitted_report_id").references(() => reports.id, { onDelete: "restrict" }), ...auditDates(),
}, (t) => [index("drafts_reporter_updated_idx").on(t.reporterId, t.updatedAt.desc(), t.id.desc()).where(sql`${t.submittedReportId} is null`), check("draft_revision_check", sql`${t.revision} >= 0 and ${t.schemaVersion} > 0`)])
export const reportAttachments = pgTable("report_attachments", {
  id: uuid("id").primaryKey(), ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reportId: uuid("report_id").references(() => reports.id, { onDelete: "cascade" }), draftId: uuid("draft_id").references(() => reportDrafts.id, { onDelete: "cascade" }),
  name: text("name").notNull(), mimeType: text("mime_type").notNull(), size: integer("size").notNull(), storageKey: text("storage_key").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (t) => [index("attachments_report_idx").on(t.reportId), index("attachments_draft_idx").on(t.draftId), check("attachment_parent_check", sql`(${t.reportId} is not null)::integer + (${t.draftId} is not null)::integer = 1`), check("attachment_size_check", sql`${t.size} > 0 and ${t.size} <= 5242880`)])
export const reportStatusHistory = pgTable("report_status_history", {
  id: uuid("id").defaultRandom().primaryKey(), reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }),
  actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }), actorName: text("actor_name").notNull(),
  fromStatus: reportStatus("from_status"), toStatus: reportStatus("to_status").notNull(), note: text("note").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(),
}, (t) => [index("history_report_date_idx").on(t.reportId, t.createdAt)])
export const notifications = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(), recipientId: uuid("recipient_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  reportId: uuid("report_id").notNull().references(() => reports.id, { onDelete: "cascade" }), kind: text("kind").notNull(), title: text("title").notNull(), description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true, precision: 3 }).notNull().defaultNow(), readAt: timestamp("read_at", { withTimezone: true, precision: 3 }),
}, (t) => [index("notifications_recipient_date_idx").on(t.recipientId, t.createdAt.desc(), t.id.desc()), index("notifications_unread_idx").on(t.recipientId).where(sql`${t.readAt} is null`), index("notifications_report_idx").on(t.reportId)])
