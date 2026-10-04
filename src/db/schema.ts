import { sql } from "drizzle-orm"
// [AUTH-SCHEMA] users menyimpan identitas, role, dan status aktif yang tetap dibutuhkan untuk Google Workspace.
// accounts/sessions/verifications adalah schema engine Better Auth; provider Google tidak berarti schema ini dibuang.
// Jika engine diganti, buat migrasi baru dan rencanakan pemetaan identitas/session; jangan mengubah SQL migrasi yang sudah diterapkan.
import { boolean, index, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from "drizzle-orm/pg-core"
import { appRoles } from "../lib/auth/roles"

export const userRole = pgEnum("user_role", appRoles)

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  identifier: text("identifier").unique(),
  username: text("username"),
  unit: text("unit"),
  studyProgram: text("study_program"),
  role: userRole("role").notNull().default("pelapor"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [uniqueIndex("users_email_lower_unique").on(sql`lower(${table.email})`)])

export const sessions = pgTable("sessions", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  token: text("token").notNull().unique(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("sessions_user_id_idx").on(table.userId)])

export const accounts = pgTable("accounts", {
  id: uuid("id").defaultRandom().primaryKey(),
  userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  password: text("password"),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
  refreshTokenExpiresAt: timestamp("refresh_token_expires_at", { withTimezone: true }),
  scope: text("scope"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("accounts_user_id_idx").on(table.userId), uniqueIndex("accounts_provider_identity_unique").on(table.providerId, table.accountId)])

export const verifications = pgTable("verifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (table) => [index("verifications_identifier_idx").on(table.identifier)])

export type DatabaseUser = typeof users.$inferSelect
export type NewDatabaseUser = typeof users.$inferInsert

export * from "./reports-schema"
export * from "./lost-found-schema"
