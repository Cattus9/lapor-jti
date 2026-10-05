import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
test("Operational Teknisi components and pages no longer import mock data", () => {
  for (const path of ["src/features/facilities/components/teknisi-dashboard.tsx", "src/features/facilities/components/teknisi-facility-report-list.tsx", "src/features/facilities/components/teknisi-repair-history.tsx", "src/features/facilities/components/technician-priority-analysis.tsx", "src/features/notifications/components/teknisi-notification-list.tsx"]) assert.doesNotMatch(read(path), /from ["'][^"']*\/mock\//)
})
test("Teknisi owns one stable modal outside list rows and shares the canonical Satpam shell", () => {
  const workspace = read("src/features/facilities/components/teknisi-facility-report-list.tsx")
  assert.equal((workspace.match(/<TechnicianReportDetailDialog\b/g) ?? []).length, 1)
  assert.match(workspace, /key=\{`\$\{selectedReport\.id\}:\$\{openCycle\}`\}/)
  assert.doesNotMatch(workspace, /key=\{[^\n]*revision[^\n]*\}/)
  assert.match(workspace, /busy\.current = true/)
  assert.match(read("src/features/facilities/components/technician-report-detail-dialog.tsx"), /<OperationalReportDialog/)
  assert.match(read("src/features/lost-found/components/satpam-lost-found-workspace.tsx"), /<OperationalReportDialog/)
})
test("Domain and application are framework-independent and room analysis is not current-page aggregation", () => {
  assert.match(read("eslint.config.mjs"), /src\/features\/facilities\/domain\/\*\*/)
  assert.match(read("eslint.config.mjs"), /src\/features\/facilities\/application\/\*\*/)
  for (const path of ["domain/technician.ts", "application/ports.ts", "application/technician-service.ts"]) assert.doesNotMatch(read(`src/features/facilities/${path}`), /from ["'](?:next|react|drizzle-orm|@\/db)/)
  assert.match(read("src/features/facilities/components/teknisi-facility-report-list.tsx"), /\/api\/teknisi\/priorities/)
  const repository = read("src/features/facilities/infrastructure/drizzle-technician-repository.ts")
  assert.match(repository, /count\(distinct \$\{reports\.id\}\)/)
  assert.match(repository, /\.for\("update"\)/)
  assert.match(repository, /\.limit\(pageSize \+ 1\)/)
})
