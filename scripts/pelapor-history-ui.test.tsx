import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { Stepper } from "../src/components/ui/stepper"
import { lifecycleByCategory, reportCategories, statusLabels } from "../src/features/reports/domain/report"
import { ReportRow } from "../src/features/reports/components/pelapor-report-history-list"
import { ReportCategoryBadge } from "../src/features/reports/components/report-category-badge"
import type { ReportListItem } from "../src/features/reports/types"

const source = (path: string) => readFileSync(path, "utf8")
const makeReport = (category: ReportListItem["category"], status: ReportListItem["status"]): ReportListItem => ({ id: "report-fixture", ticketNumber: "LJ-2026-00001", title: "Proyektor tidak menyala", descriptionPreview: "Proyektor di Lab RSI tidak menyala saat digunakan.", category, status, submittedAtIso: "2026-10-24T02:00:00Z", submittedAt: "24 Okt 2026, 09.00", updatedAt: "24 Okt 2026, 10.00" })

test("All report lifecycles emphasize exactly the current stage, while previous stages use soft primary blue", () => {
  for (const category of reportCategories) {
    const stages = lifecycleByCategory[category]
    for (const [activeIndex, value] of stages.entries()) for (const variant of ["segments", "circles"] as const) {
      const html = renderToStaticMarkup(<Stepper steps={stages.map((status) => ({ value: status, label: statusLabels[status] }))} value={value} variant={variant} aria-label="Progres laporan" />)
      const entries = html.match(/<li\b[^>]*>.*?<\/li>/g) ?? []
      assert.equal(entries.length, stages.length)
      assert.equal(entries.filter((entry) => entry.includes('data-state="completed"')).length, activeIndex)
      assert.equal(entries.filter((entry) => entry.includes('data-state="current"')).length, 1)
      assert.equal(entries.filter((entry) => entry.includes('aria-current="step"')).length, 1)
      for (const [index, entry] of entries.entries()) {
        if (index === activeIndex) assert.match(entry, /bg-primary/)
        else if (index < activeIndex) {
          assert.match(entry, variant === "segments" ? /bg-primary\/25/ : /bg-primary\/10/)
          assert.doesNotMatch(entry, /bg-primary(?:\s|"|$)|bg-primary-action\s/)
          assert.match(entry, /text-muted-foreground/)
        } else { assert.doesNotMatch(entry, /bg-primary/); assert.match(entry, /text-muted-foreground/) }
      }
      assert.doesNotMatch(html, /(?:class="[^"]*)(?:shadow-|blur-|ring-primary)/)
      assert.match(html, /data-slot="separator"/)
      if (variant === "circles") assert.match(html, /data-slot="badge"/)
    }
  }
})

test("Unknown stages never invent active progress", () => {
  const html = renderToStaticMarkup(<Stepper steps={[{ value: "baru", label: "Baru" }]} value="ditolak" />)
  assert.doesNotMatch(html, /aria-current="step"/)
  assert.match(html, /data-state="upcoming"/)
})

test("History shows report identity, status and a real description preview without duplicate progress", () => {
  for (const category of reportCategories) for (const status of [...lifecycleByCategory[category], "ditolak"] as const) {
    const html = renderToStaticMarkup(<ReportRow report={makeReport(category, status)} />)
    assert.match(html, /data-slot="dialog-trigger"/)
    assert.match(html, /group\/card/)
    assert.match(html, /role="button"/)
    assert.match(html, /tabindex="0"/)
    assert.match(html, /Lihat detail/)
    assert.doesNotMatch(html, /DoneIcon|blur-/)
    if (status === "selesai") {
      assert.match(html, /DoneStatusIc\.png/)
      assert.match(html, /alt=""/)
    } else assert.doesNotMatch(html, /<img|DoneStatusIc/)
    assert.doesNotMatch(html, /LJ-2026-00001/)
    assert.equal((html.match(/data-slot="badge"/g) ?? []).length, 2, "Category and status retain separate meanings")
    assert.match(html, new RegExp(`>${statusLabels[status]}</span>`))
    assert.doesNotMatch(html, /Tahap \d|Semua tahap selesai/)
    assert.doesNotMatch(html, /data-slot="stepper"/)
    assert.match(html, /Proyektor di Lab RSI tidak menyala saat digunakan\./)
  }
})

test("Previews are text, never rendered HTML, and missing previews do not fabricate report content", () => {
  const html = renderToStaticMarkup(<ReportRow report={{ ...makeReport("fasilitas", "baru"), descriptionPreview: '<script>alert("x")</script>' }} />)
  assert.doesNotMatch(html, /<script>/)
  assert.match(html, /&lt;script&gt;/)
  const empty = renderToStaticMarkup(<ReportRow report={{ ...makeReport("fasilitas", "baru"), descriptionPreview: "" }} />)
  assert.doesNotMatch(empty, /line-clamp-2/)
  assert.match(empty, /Lihat detail/)
})

test("Creation date stays visible and the update date is omitted only when its displayed value is identical", () => {
  const report = makeReport("fasilitas", "baru")
  const same = renderToStaticMarkup(<ReportRow report={{ ...report, updatedAt: report.submittedAt }} />)
  assert.match(same, /Dikirim <time dateTime="2026-10-24T02:00:00Z"|Dikirim <time datetime="2026-10-24T02:00:00Z"/)
  assert.doesNotMatch(same, />Diperbarui /)
  const updated = renderToStaticMarkup(<ReportRow report={report} />)
  assert.match(updated, />Diperbarui 24 Okt 2026, 10.00 WIB/)
  assert.match(updated, /Dikirim <time/)
  assert.doesNotMatch(updated, /<h2[^>]*class="[^"]*truncate/)
})

test("Category identity uses the existing shared Badge tones rather than local color palettes", () => {
  for (const category of reportCategories) {
    const html = renderToStaticMarkup(<ReportCategoryBadge category={category} />)
    assert.match(html, /data-slot="badge"/)
    assert.match(html, /data-tone="(?:info|success|violet|warning)"/)
  }
  assert.doesNotMatch(source("src/features/reports/components/report-category-badge.tsx"), /(?:bg|border|text)-(?:blue|emerald|orange|violet)-\d/)
})

test("Detail retains its stepper while history surface, reduced motion and filter geometry follow the theme", () => {
  const paths = ["pelapor-report-history-list.tsx", "pelapor-report-detail-dialog.tsx", "pelapor-report-filters.tsx"]
  for (const name of paths) {
    const text = source(`src/features/reports/components/${name}`)
    assert.doesNotMatch(text, /text-\[|blur-|ring-primary\/|!h-9/)
    assert.doesNotMatch(text, /(?:bg|text|border)-\[#[0-9a-f]+\]/i)
  }
  const list = source("src/features/reports/components/pelapor-report-history-list.tsx")
  assert.doesNotMatch(list, /@\/components\/ui\/stepper/)
  assert.match(list, /motion-safe:hover:-translate-y-0\.5/)
  assert.match(list, /motion-reduce:transition-none/)
  assert.match(list, /bg-report-surface/)
  assert.match(source("src/app/globals.css"), /--report-surface: #fbfbfc/)
  assert.match(source("src/features/reports/components/pelapor-report-detail-dialog.tsx"), /@\/components\/ui\/stepper/)
  const filters = source("src/features/reports/components/pelapor-report-filters.tsx")
  assert.match(filters, /--report-history-filter-width/)
  assert.match(filters, /--report-history-filter-columns/)
  assert.match(source("src/app/globals.css"), /--report-history-filter-width: 33rem/)
  assert.match(source("src/app/globals.css"), /--muted-foreground:/)
  assert.match(source("src/features/reports/components/pelapor-report-detail-dialog.tsx"), /nativeButton=\{!trigger\}/)
})
