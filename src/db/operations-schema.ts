import { index, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core"
import { users } from "./schema"

// Operational changes only; never store credentials, tokens, or password hashes here.
export const operationalAudit = pgTable("operational_audit", {
  id: uuid("id").defaultRandom().primaryKey(), actorId: uuid("actor_id").notNull().references(() => users.id, { onDelete: "restrict" }),
  actorName: text("actor_name").notNull(), entity: text("entity").notNull(), entityId: text("entity_id").notNull(), action: text("action").notNull(),
  before: jsonb("before"), after: jsonb("after"), createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [index("operational_audit_entity_date_idx").on(t.entity, t.entityId, t.createdAt.desc()), index("operational_audit_actor_date_idx").on(t.actorId, t.createdAt.desc())])
