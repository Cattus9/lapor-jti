import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { managementCategoryScope, resolveManagementCategoryPreview, type ManagementCategoryPreview } from "../src/features/management/components/management-category-preview"
import type { ManagementPage, ManagementReport } from "../src/features/management/types"
import { navigationByRole } from "../src/components/navigation/nav-config"
import { ChartColumnIncreasing, ChartNoAxesCombined } from "lucide-react"

const read = (path: string) => readFileSync(join(process.cwd(), path), "utf8")
const report = (id: string, categoryKey: "layanan" | "lainnya") => ({ id, categoryKey }) as ManagementReport
const data = (items: ManagementReport[], services = 1, others = 1, nextCursor: string | null = null): ManagementPage => ({
  items, total: services + others, nextCursor,
  categoryCounts: { semua: services + others, layanan: services, lainnya: others, fasilitas: 0, "kehilangan-temuan": 0 },
  handlerCounts: { satpam: 0, teknisi: 0, manajemen: services + others },
})
const scope = managementCategoryScope("/api/manajemen/reports?category=semua&status=semua&q=&period=semua", 0).scope

test("Management overview and statistics have distinct semantic navigation icons", () => {
  const overview = navigationByRole.manajemen.find((item) => item.title === "Ringkasan")!
  const statistics = navigationByRole.manajemen.find((item) => item.title === "Statistik")!
  assert.equal(overview.icon, ChartNoAxesCombined)
  assert.equal(statistics.icon, ChartColumnIncreasing)
  assert.notEqual(overview.icon, statistics.icon)
  assert.equal(overview.url, "/manajemen/dashboard")
  assert.equal(statistics.url, "/manajemen/statistik")
})

test("Management wrapper labels supply context without duplicate internal headings", () => {
  const workspace = read("src/features/management/components/management-report-workspace.tsx")
  const monitoring = read("src/features/management/components/management-monitoring.tsx")
  const recap = read("src/features/management/components/management-report-recap.tsx")
  assert.match(workspace, /<span>Daftar laporan<\/span>/)
  assert.doesNotMatch(workspace, />Kelola laporan</)
  assert.match(monitoring, /Pengawasan lintas pengelola<\/div>/)
  assert.doesNotMatch(monitoring, /CardTitle|Monitoring lintas pengelola/)
  assert.match(monitoring, /initialTicket=\{ticket\} readOnly/)
  assert.match(recap, /Data operasional dan ekspor<\/div>/)
  assert.doesNotMatch(recap, /CardTitle|>Rekap laporan</)
  assert.match(recap, /md:grid-cols-2 xl:grid-cols-/)
  assert.match(recap, /md:col-span-2 xl:col-span-1/)
  assert.equal((recap.match(/"Ekspor CSV"/g) ?? []).length, 1)
  assert.match(recap, /onClick=\{\(\) => void exportCsv\(\)\}/)
  for (const source of [monitoring, recap]) {
    assert.match(source, /aria-label="Filter kategori/)
    assert.match(source, /aria-label="Filter status/)
    assert.match(source, /aria-label="Filter periode/)
  }
})

test("Category changes share a snapshot scope, but other filters and mutations invalidate it", () => {
  const base = "/api/manajemen/reports?category=semua&status=semua&q=&period=semua"
  assert.equal(managementCategoryScope(base.replace("category=semua", "category=layanan"), 0).scope, scope)
  for (const changed of [base.replace("status=semua", "status=baru"), base.replace("q=", "q=AC"), base.replace("period=semua", "period=hari-ini"), `${base}&date=completed`, `${base}&sort=terlama`]) {
    assert.notEqual(managementCategoryScope(changed, 0).scope, scope)
  }
  assert.notEqual(managementCategoryScope(base, 1).scope, scope)
  assert.equal(managementCategoryScope(base.replace("category=semua", "category=fasilitas"), 0).category, undefined)
})

test("A known empty category retains its empty surface while being revalidated", () => {
  const page = data([report("service", "layanan")], 1, 0)
  const cache: ManagementCategoryPreview = { scope, pages: { layanan: page }, counts: page.categoryCounts }
  const preview = resolveManagementCategoryPreview(cache, scope, "lainnya")!
  assert.deepEqual(preview.items, [])
  assert.equal(preview.total, 0)
  assert.equal(preview.nextCursor, null)
  assert.equal(preview.categoryCounts.layanan, 1)
})

test("A complete subset of Semua can be reused without showing another category's report", () => {
  const page = data([report("service", "layanan"), report("other", "lainnya")])
  const cache: ManagementCategoryPreview = { scope, pages: { semua: page }, counts: page.categoryCounts }
  const preview = resolveManagementCategoryPreview(cache, scope, "layanan")!
  assert.deepEqual(preview.items.map((item) => item.id), ["service"])
  assert.equal(preview.total, 1)
  assert.equal(preview.handlerCounts.manajemen, 1)
  assert.equal(preview.nextCursor, null)
})

test("A category absent from page one is not falsely treated as empty or complete", () => {
  const page = data([report("service", "layanan")], 20, 4, "next-page")
  const cache: ManagementCategoryPreview = { scope, pages: { semua: page }, counts: page.categoryCounts }
  assert.equal(resolveManagementCategoryPreview(cache, scope, "lainnya"), undefined)
  assert.equal(resolveManagementCategoryPreview(cache, scope, "layanan"), undefined)
})

test("Exact category snapshots preserve the server cursor, and never survive a different scope", () => {
  const page = { ...data([report("service", "layanan")], 22, 1, "server-cursor"), total: 22 }
  const cache: ManagementCategoryPreview = { scope, pages: { layanan: page }, counts: page.categoryCounts }
  assert.equal(resolveManagementCategoryPreview(cache, scope, "layanan"), page)
  assert.equal(resolveManagementCategoryPreview(cache, `${scope}-changed`, "layanan"), undefined)
  assert.equal(resolveManagementCategoryPreview({ scope, pages: {} }, scope, "layanan"), undefined)
})

test("Selected Management tabs and count badges match the Satpam reference, without changing primitives", () => {
  const satpam = read("src/features/lost-found/components/satpam-lost-found-workspace.tsx")
  const workspace = read("src/features/management/components/management-report-workspace.tsx")
  const tabStyle = satpam.match(/const workspaceTabClassName = "([^"]+)"/)![1]
  assert.ok(workspace.includes(tabStyle))
  for (const token of ["group-data-active/workspace-tab:bg-primary/10", "group-data-active/workspace-tab:text-accent-foreground"]) assert.ok(workspace.includes(token))
  assert.match(workspace, /className=\{workspaceTabClassName\}/)
  assert.match(workspace, /min-w-4.*tabular-nums/)
  assert.doesNotMatch(workspace, /!page.loading && !page.error \? <span/)
})

test("Workspace refresh keeps confirmed content, disables stale actions, and respects reduced motion", () => {
  const workspace = read("src/features/management/components/management-report-workspace.tsx")
  const hook = read("src/features/management/components/use-management-page.ts")
  assert.match(workspace, /keepCategoryPreview: true/)
  assert.match(workspace, /loading=\{page.loading && !page.hasData\}/)
  assert.match(workspace, /page.hasData && !page.items.length && !page.error/)
  assert.match(workspace, /aria-busy=\{page.loading\}/)
  assert.match(workspace, /disabled=\{page.loading \|\| Boolean\(page.error\)\}/)
  assert.match(workspace, /motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150/)
  assert.match(workspace, /motion-reduce:transition-none/)
  assert.match(hook, /category && !value/)
  assert.match(hook, /cache.scope !== scope/)
  assert.match(hook, /visit: cursor.visit \+ 1/)
  assert.match(read("src/components/reports/use-operational-data.ts"), /return \(\) => controller.abort\(\)/)
})
