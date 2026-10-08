import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync, readdirSync } from "node:fs"
import { join } from "node:path"
const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
test("Management runtime components no longer import sample data", () => {
  for (const name of readdirSync("src/features/management/components")) assert.doesNotMatch(read(`src/features/management/components/${name}`), /\/mock\//)
  assert.doesNotMatch(read("src/features/notifications/components/manajemen-notification-list.tsx"), /\/mock\//)
})
test("API routes require session guards; monitoring exposes no mutations", () => {
  for (const route of ["reports", "monitoring", "dashboard", "statistics", "export", "notifications", "reports/[ticket]", "monitoring/[ticket]", "attachments/[id]"]) assert.match(read(`src/app/api/manajemen/${route}/route.ts`), /await managementRequest\(request/)
  assert.doesNotMatch(read("src/app/api/manajemen/monitoring/route.ts"), /function (POST|PATCH|DELETE)/)
  assert.match(read("src/features/management/infrastructure/http.ts"), /request.headers.get\("origin"\)/)
  assert.match(read("src/features/management/infrastructure/http.ts"), /size > 12000/)
})
test("Operational mutations are scoped, locked and atomically audited", () => {
  const source = read("src/features/management/infrastructure/drizzle-management-repository.ts")
  assert.match(source, /eq\(reports.handlerRole, "manajemen"\)/)
  assert.match(source, /this.db.transaction/); assert.match(source, /\.for\("update"\)/); assert.match(source, /\.for\("share"\)/)
  assert.match(source, /managementExpectedStatus/); assert.match(source, /tx.insert\(reportStatusHistory\)/); assert.match(source, /tx.insert\(notifications\)/)
  assert.match(source, /actorName: account.name/)
})
test("Aggregation counts distinct multi-object reports, and excludes rejected reports from active", () => {
  const source = read("src/features/management/infrastructure/drizzle-management-repository.ts")
  assert.match(source, /count\(distinct \$\{reports.id\}\)/)
  assert.match(source, /notInArray\(reports.status, \["selesai", "ditolak"\]\)/)
  assert.match(source, /gte\(reports.completedAt, from\)/)
  assert.match(source, /limit\(pageSize \+ 1\)/); assert.match(source, /limit\(5001\)/)
})
test("Historical facility aggregation retains closed rooms and counts objects across the same submitted-period scope", () => {
  const source = read("src/features/management/infrastructure/drizzle-management-repository.ts")
  const roomQuery = source.slice(source.indexOf("this.db.select({ id: roomKey"), source.indexOf("this.db.select({ roomId: roomKey"))
  const objectQuery = source.slice(source.indexOf("this.db.select({ roomId: roomKey"), source.indexOf("this.db.select({ count:", source.indexOf("this.db.select({ roomId: roomKey")))
  assert.match(roomQuery, /totalReports: sql<number>`count\(\*\)::integer`/)
  assert.match(roomQuery, /\.orderBy\(sql`count\(\*\) desc`/)
  assert.doesNotMatch(roomQuery, /\.having\(/)
  assert.match(objectQuery, /totalReports: sql<number>`count\(distinct \$\{reports.id\}\)::integer`/)
  assert.match(objectQuery, /activeReports: sql<number>`count\(distinct \$\{reports.id\}\) filter \(where \$\{active\}\)::integer`/)
  for (const query of [roomQuery, objectQuery]) {
    assert.match(query, /\.where\(and\(where, eq\(reports.category, "fasilitas"\)\)\)/)
    assert.doesNotMatch(query, /eq\(reports.category, "fasilitas"\), active/)
  }
})
test("Detail shell and attachments remain shared; dialog stays outside refreshable rows", () => {
  const source = read("src/features/management/components/management-report-detail-dialog.tsx")
  assert.match(source, /OperationalReportDialog/); assert.match(source, /ReportAttachmentsEmptyState/); assert.match(source, /FieldDescription/)
  assert.ok(source.indexOf("<ReportStepper") < source.indexOf('aria-label="Aksi penanganan"'))
  assert.ok(source.indexOf("Detail laporan</h3>") < source.indexOf("Lampiran</h3>")); assert.ok(source.indexOf("Lampiran</h3>") < source.indexOf("Riwayat status</h3>"))
  assert.match(read("src/features/management/components/management-report-session.tsx"), /Keep the modal outside filtered\/paginated rows/)
})
