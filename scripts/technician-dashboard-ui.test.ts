import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TechnicianEmptyState } from "../src/features/facilities/components/technician-empty-state"
import { TechnicianPriorityAnalysis } from "../src/features/facilities/components/technician-priority-analysis"
import { ReportAttachmentsEmptyState } from "../src/components/reports/report-attachments-empty-state"

const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")

test("Operational attachment empty states share the canonical Satpam icon wrapper and text hierarchy", () => {
  const html = renderToStaticMarkup(createElement(ReportAttachmentsEmptyState))
  assert.match(html, /data-slot="card"/)
  assert.match(html, /data-slot="card-content"/)
  assert.match(html, /border-dashed border-border bg-muted\/30/)
  assert.match(html, /size-10 shrink-0.*rounded-xl.*bg-card/)
  assert.match(html, /aria-hidden="true"/)
  assert.match(html, /text-sm font-medium text-foreground">Tidak ada lampiran/)
  assert.match(html, /text-xs leading-relaxed text-muted-foreground">Pelapor tidak menambahkan foto atau dokumen pendukung/)
  assert.doesNotMatch(html, /<button|<a\b/)

  const technician = read("src/features/facilities/components/technician-report-detail-dialog.tsx")
  const satpam = read("src/features/lost-found/components/satpam-lost-found-workspace.tsx")
  for (const modal of [technician, satpam]) {
    assert.match(modal, /from "@\/components\/reports\/report-attachments-empty-state"/)
    assert.match(modal, /<ReportAttachmentsEmptyState \/>/)
  }
  assert.match(technician, /detail\.data\.files\.length \? detail\.data\.files\.map/)
  assert.match(technician, /href=\{file\.url\}/)
  assert.match(technician, /src=\{file\.previewUrl\}/)
  assert.doesNotMatch(technician, /Pelapor tidak menambahkan lampiran\./)
  assert.match(satpam, /report\.photoUrl \|\| report\.attachments \?/)
})

test("Empty priorities retain their section identity without a misleading priority action", () => {
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [] }))
  assert.match(html, /Ruang prioritas untuk ditinjau/)
  assert.match(html, /Belum ada laporan fasilitas aktif/)
  assert.match(html, /Prioritas ruang akan muncul setelah laporan fasilitas diterima/)
  assert.doesNotMatch(html, /Buka prioritas|0 laporan aktif/)
})

test("Unclassified reports are not described as an empty active workload", () => {
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [], unclassifiedReports: 2 }))
  assert.match(html, /Belum ada laporan yang bisa dikelompokkan/)
  assert.match(html, /2 laporan aktif memakai lokasi atau objek di luar daftar/)
  assert.match(html, /Tinjau laporan/)
  assert.match(html, /href="\/teknisi\/laporan-fasilitas\?view=queue"/)
  assert.doesNotMatch(html, /Belum ada laporan fasilitas aktif|0 laporan aktif/)
})

test("Empty queue uses the inset surface and explains what will appear", () => {
  const html = renderToStaticMarkup(createElement(TechnicianEmptyState, { context: "queue" }))
  assert.match(html, /bg-empty-surface/)
  assert.match(html, /Belum ada laporan dalam antrean/)
  assert.match(html, /Laporan baru dan yang sedang ditangani akan tampil di sini/)
  assert.doesNotMatch(html, /Semua.*selesai|Tidak ada kerusakan/)
})

for (const context of ["reports", "history"] as const) {
  test(`${context} distinguishes the default empty scope from an unmatched search/filter`, () => {
    const initial = renderToStaticMarkup(createElement(TechnicianEmptyState, { context }))
    const filtered = renderToStaticMarkup(createElement(TechnicianEmptyState, { context, filtered: true }))
    assert.match(initial, /bg-empty-surface/)
    assert.match(filtered, /bg-empty-surface/)
    assert.match(initial, context === "reports" ? /Belum ada laporan fasilitas/ : /Belum ada riwayat perbaikan/)
    assert.doesNotMatch(initial, /reset filter|yang sesuai/)
    assert.match(filtered, context === "reports" ? /Tidak ada laporan yang sesuai/ : /Tidak ada riwayat yang sesuai/)
    assert.match(filtered, /Ubah pencarian atau reset filter/)
    assert.doesNotMatch(filtered, /Belum ada laporan fasilitas|Belum ada riwayat perbaikan/)
  })
}

test("An empty room-priority list makes no claim that there are no active reports", () => {
  const initial = renderToStaticMarkup(createElement(TechnicianEmptyState, { context: "room-priority" }))
  const filtered = renderToStaticMarkup(createElement(TechnicianEmptyState, { context: "room-priority", filtered: true }))
  assert.match(initial, /Belum ada ruang yang masuk prioritas/)
  assert.match(initial, /ruang dan objek terdaftar/)
  assert.match(initial, /isian lainnya dapat dilihat di Antrean laporan/)
  assert.doesNotMatch(initial, /Belum ada laporan fasilitas aktif|Tidak ada kerusakan/)
  assert.match(filtered, /Tidak ada ruang prioritas untuk status ini/)
  assert.match(filtered, /hanya mencakup laporan aktif/)
})

test("An empty expanded room differentiates a stale room from a status-filtered ticket list", () => {
  const initial = renderToStaticMarkup(createElement(TechnicianEmptyState, { context: "room-reports" }))
  const filtered = renderToStaticMarkup(createElement(TechnicianEmptyState, { context: "room-reports", filtered: true }))
  assert.match(initial, /Belum ada tiket aktif di ruang ini/)
  assert.match(initial, /Data ruang mungkin telah berubah/)
  assert.match(filtered, /Tidak ada tiket aktif yang sesuai/)
  assert.match(filtered, /Pilih status lain atau muat ulang/)
})

test("Report workspace shares the same empty-state composition with scope-aware reset and loading guards", () => {
  const list = read("src/features/facilities/components/teknisi-facility-report-list.tsx")
  assert.match(list, /import \{ TechnicianEmptyState \} from "\.\/technician-empty-state"/)
  assert.match(list, /!page\.loading && !page\.error && !page\.items\.length/)
  assert.match(list, /!rooms\.loading && !rooms\.error && rooms\.data && !rooms\.data\.items\.length/)
  assert.match(list, /emptyContext="history"/)
  assert.match(list, /emptyContext="reports"/)
  assert.match(list, /hasFilters && onReset/)
  assert.match(list, /const hasFilters = Boolean\(search\.trim\(\) \|\| status !== \(history \? "selesai" : "semua"\) \|\| period !== "semua"\)/)
  assert.match(list, /function resetFilters\(\) \{ setQuery\(""\); setStatus\(history \? "selesai" : "semua"\); setPeriod\("semua"\); setSort\("terbaru"\) \}/)
  assert.match(list, /onReset=\{\(\) => setStatus\("semua"\)\}/)
  assert.doesNotMatch(list, /Tidak ada prioritas ruang aktif pada status ini|min-h-40 flex-col/)
})

test("Dashboard preserves four shared KPIs and removes the duplicated daily task panel", () => {
  const dashboard = read("src/features/facilities/components/teknisi-dashboard.tsx")
  assert.equal((dashboard.match(/<KpiCard\b/g) ?? []).length, 4)
  assert.doesNotMatch(dashboard, /Tugas hari ini|technicianTasks|xl:grid-cols-\[minmax\(0,1\.35fr\)/)
  assert.match(dashboard, /<TechnicianEmptyState context="queue"/)
  const loading = read("src/components/layout/page-loading.tsx")
  assert.match(loading, /if \(role === "teknisi"\)/)
  const technicianLoading = loading.slice(loading.indexOf('if (role === "teknisi")'), loading.indexOf('\n  return (', loading.indexOf('if (role === "teknisi")')))
  assert.match(technicianLoading, /length: 6/)
  assert.match(technicianLoading, /size-\[180px\] rounded-full/)
})

test("Queue navigation lives once in its header while the footer only describes the preview limit", () => {
  const dashboard = read("src/features/facilities/components/teknisi-dashboard.tsx")
  const header = dashboard.slice(dashboard.indexOf("<CardHeader"), dashboard.indexOf("</CardHeader>"))
  const content = dashboard.slice(dashboard.indexOf("<CardContent"), dashboard.indexOf("</CardContent>"))

  assert.match(header, /variant="link"/)
  assert.match(header, /Lihat semua laporan dalam antrean perbaikan/)
  assert.match(header, /href="\/teknisi\/laporan-fasilitas\?view=queue"/)
  assert.equal((dashboard.match(/href="\/teknisi\/laporan-fasilitas\?view=queue"/g) ?? []).length, 1)
  assert.doesNotMatch(content, /Buka antrean|Lihat semua|view=queue/)
  assert.match(content, /Maksimal 5 laporan aktif terbaru/)
  assert.match(content, /encodeURIComponent\(item\.ticket\)/)
})

test("Room selection updates the facility donut, resets disclosure, and falls back after a room completes", () => {
  const analysis = read("src/features/facilities/components/technician-priority-analysis.tsx")

  assert.match(analysis, /const selectedRoom = topRooms\.find\(\(room\) => room\.id === selectedRoomId\) \?\? topRooms\[0\]/)
  assert.match(analysis, /onClick=\{\(\) => setSelectedRoomId\(room\.id\)\}/)
  assert.match(analysis, /<TechnicianFacilityComposition key=\{selectedRoom\.id\} room=\{selectedRoom\}/)
  assert.match(analysis, /const pieTooltip = useStablePieTooltip\(\)/)
  assert.match(analysis, /backgroundColor: objectChartData\[index\]\.fill/)
  assert.match(analysis, /<ChartContainer config=\{objectChartConfig\}/)
  assert.match(analysis, /<Pie data=\{objectChartData\} dataKey="value" nameKey="name"/)
  assert.match(analysis, /isAnimationActive="auto" animationBegin=\{0\} animationDuration=\{500\}/)
  assert.match(analysis, /<ChartTooltip active=\{pieTooltip\.tooltipActive\}/)
  assert.match(analysis, /showAllObjects \? facilities : facilities\.slice\(0, OBJECT_CHART_LIMIT\)/)
  assert.match(analysis, /onClick=\{\(\) => setShowAllObjects\(\(current\) => !current\)\}/)
  assert.doesNotMatch(analysis, /roomColors|BarChart|role="combobox"/)
})

function luminance(hex: string) {
  const [red, green, blue] = hex.slice(1).match(/../g)!.map((channel) => {
    const value = Number.parseInt(channel, 16) / 255
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
  })
  return red * 0.2126 + green * 0.7152 + blue * 0.0722
}

for (const selector of [":root", ".dark"]) {
  test(`${selector} empty surface has a semantic token and readable supporting text`, () => {
    const css = read("src/app/globals.css")
    const block = css.match(new RegExp(`${selector.replace(".", "\\.")}\\s*\\{([^}]+)\\}`))?.[1]
    assert.ok(block)
    const surface = block.match(/--empty-surface:\s*(#[0-9a-f]{6});/i)?.[1]
    const text = block.match(/--muted-foreground:\s*(#[0-9a-f]{6});/i)?.[1]
    assert.ok(surface)
    assert.ok(text)
    if (selector === ":root") assert.equal(surface.toLowerCase(), "#fafbfb")
    else assert.notEqual(surface.toLowerCase(), "#fafbfb")
    const foreground = luminance(text)
    const background = luminance(surface)
    const ratio = (Math.max(foreground, background) + 0.05) / (Math.min(foreground, background) + 0.05)
    assert.ok(ratio >= 4.5, `Empty-state text contrast: ${ratio.toFixed(2)}:1`)
    assert.match(css, /--color-empty-surface: var\(--empty-surface\)/)
  })
}
