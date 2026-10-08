import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { ManagementFacilityOverview, ManagementHandlerOverview, ManagementStatisticsScope } from "../src/features/management/components/management-statistics"
import type { ManagementStatisticsData } from "../src/features/management/types"

const source = readFileSync(new URL("../src/features/management/components/management-statistics.tsx", import.meta.url), "utf8")

test("Handler labels and metrics stay together in responsive definition-list groups", () => {
  const html = renderToStaticMarkup(createElement(ManagementHandlerOverview, {
    handlers: [{ handler: "satpam", active: 2, total: 3 }, { handler: "teknisi", active: 4, total: 6 }], total: 9,
  }))
  assert.match(html, /<dl class="grid gap-6 md:grid-cols-3">/)
  const groups = [...html.matchAll(/<dt[^>]*>(.*?)<\/dt>\s*<dd[^>]*>(.*?)<\/dd>/g)]
  assert.equal(groups.length, 3)
  assert.match(groups[0][1], /Teknisi/)
  assert.match(groups[0][2], />4<\/span>/)
  assert.match(groups[0][2], /aktif.*dari 6 tiket/)
  assert.match(groups[1][1], /Satpam/)
  assert.match(groups[1][2], />2<\/span>/)
  assert.match(groups[1][2], /aktif.*dari 3 tiket/)
  assert.match(groups[2][1], /Manajemen Jurusan/)
  assert.match(groups[2][2], /text-muted-foreground">0<\/span>/)
  assert.match(html, /width:100%/)
  assert.match(html, /width:50%/)
  assert.match(html, /width:0%/)
  assert.match(html, /6 dari 9 tiket masih aktif/)
  assert.doesNotMatch(html, /Diurutkan dari yang terbanyak|Skala batang/)
  assert.doesNotMatch(groups.map((group) => group[0]).join(""), /justify-between/)
})

test("A closed workload shows zero active tickets; an empty period stays an empty state", () => {
  const closed = renderToStaticMarkup(createElement(ManagementHandlerOverview, {
    handlers: [{ handler: "satpam", active: 0, total: 3 }], total: 3,
  }))
  assert.match(closed, /0 dari 3 tiket masih aktif/)
  assert.equal((closed.match(/width:0%/g) ?? []).length, 3)
  assert.doesNotMatch(closed, /NaN|Infinity|Tidak ada laporan pada periode ini/)
  const empty = renderToStaticMarkup(createElement(ManagementHandlerOverview, { handlers: [], total: 0 }))
  assert.match(empty, /Tidak ada laporan pada periode ini/)
  assert.doesNotMatch(empty, /<dl|width:/)
})

test("Statistics scope is a prominent themed surface without an extra horizontal divider", () => {
  const html = renderToStaticMarkup(createElement(ManagementStatisticsScope, {
    period: { preset: "all", from: "", to: "" }, onChange: () => {},
  }))
  assert.match(html, /data-slot="card"/)
  assert.match(html, /aria-labelledby="statistics-scope-title"/)
  assert.match(html, /border-0 bg-accent\/60.*ring-0/)
  assert.match(html, /<h2[^>]*font-semibold[^>]*>Cakupan statistik<\/h2>/)
  assert.match(html, /text-base font-semibold text-accent-foreground">Semua waktu/)
  assert.match(html, /Seluruh KPI dan grafik · WIB/)
  assert.match(html, /Pilih periode statistik: Semua data \(Semua waktu\)/)
  assert.doesNotMatch(html, /\bborder-[bt](?:\s|")/)
  assert.match(html, /sm:flex-row/)
})

test("Custom ranges retain a full readable scope label and accessible picker context", () => {
  const html = renderToStaticMarkup(createElement(ManagementStatisticsScope, {
    period: { preset: "custom", from: "2026-10-01", to: "2026-10-08" }, onChange: () => {},
  }))
  assert.match(html, /1 Okt 2026 - 8 Okt 2026/)
  assert.match(html, /Pilih periode statistik: Rentang tanggal \(1 Okt 2026 - 8 Okt 2026\)/)
  assert.match(source, /<ManagementStatisticsScope period=\{period\} onChange=\{setPeriod\} \/>/)
  assert.match(source, /<ManagementHandlerOverview handlers=\{data.handlers\} total=\{data.total\} \/>/)
  assert.match(source, /search.set\("from", period.from\); search.set\("to", period.to\)/)
  assert.match(source, /disabled=\{!draftFrom \|\| !draftTo \|\| draftFrom > draftTo\}/)
})

test("Both period triggers reflect every applied preset and use the shared primary button style", () => {
  const presets = [
    { preset: "all", label: "Semua data" },
    { preset: "7-days", label: "7 hari" },
    { preset: "30-days", label: "30 hari" },
    { preset: "month", label: "Bulan ini" },
    { preset: "custom", label: "Rentang tanggal" },
  ] as const
  for (const { preset, label } of presets) {
    const html = renderToStaticMarkup(createElement(ManagementStatisticsScope, {
      period: { preset, from: preset === "all" ? "" : "2026-10-01", to: preset === "all" ? "" : "2026-10-08" }, onChange: () => {},
    }))
    const triggers = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
    assert.equal(triggers.length, 2)
    for (const trigger of triggers) {
      assert.ok(trigger.includes(`>${label}</span>`))
      assert.ok(trigger.includes(`aria-label="Pilih periode statistik: ${label} (`))
      assert.match(trigger, /bg-primary-action text-primary-foreground hover:bg-primary-action-hover/)
      assert.match(trigger, /aria-expanded:bg-primary-action-hover/)
      assert.match(trigger, /aria-haspopup="dialog"/)
      assert.match(trigger, /focus-visible:ring-3/)
      assert.doesNotMatch(trigger, /bg-card|text-muted-foreground|Ubah periode/)
    }
  }
  // Derive the label from the applied parent selection, not a second local state or an unsubmitted draft.
  assert.match(source, /periodPresets.find\(\(preset\) => preset.value === period.preset\)\?\.label/)
  assert.match(source, /onChange\(nextPeriod\)/)
  assert.match(source, /onChange\(\{ preset: "custom", from: draftFrom, to: draftTo \}\)/)
})

test("Historical room priorities include completed rooms and rank total reports rather than the active queue", () => {
  const rooms: ManagementStatisticsData["rooms"] = [
    { id: "active", room: "Lab Aktif", location: "Lab Aktif", totalReports: 3, activeReports: 3, completedReports: 0, facilities: [{ facility: "AC", totalReports: 3, activeReports: 3 }] },
    { id: "closed", room: "Lab Selesai", location: "Lab Selesai", totalReports: 10, activeReports: 0, completedReports: 10, facilities: [{ facility: "AC", totalReports: 8, activeReports: 0 }, { facility: "TV", totalReports: 4, activeReports: 0 }] },
    { id: "empty", room: "Lab Kosong", location: "Lab Kosong", totalReports: 0, activeReports: 0, completedReports: 0, facilities: [] },
  ]
  const original = structuredClone(rooms)
  const html = renderToStaticMarkup(createElement(ManagementFacilityOverview, { rooms }))
  assert.match(html, /Prioritas historikal fasilitas/)
  assert.match(html, /13 laporan di 2 lokasi pada periode terpilih/)
  assert.match(html, /Termasuk laporan selesai dan ditolak/)
  assert.match(html, /Objek di Lab Selesai/)
  assert.match(html, /12 objek dilaporkan/)
  assert.match(html, /67%/)
  assert.match(html, /33%/)
  assert.match(html, /0 aktif · 10 dari 10 laporan sudah selesai/)
  assert.equal((html.match(/>Prioritas utama<\/span>/g) ?? []).length, 1)
  assert.equal((html.match(/>Prioritas berikutnya<\/span>/g) ?? []).length, 1)
  assert.match(html, /berdasarkan total laporan seluruh status pada periode terpilih/)
  assert.match(html, /width:30%/)
  assert.doesNotMatch(html, /Lab Kosong|Belum ada laporan fasilitas aktif|Komposisi objek pada laporan aktif/)
  assert.deepEqual(rooms, original)
})

test("Equal historical totals share priority despite different active counts", () => {
  const rooms: ManagementStatisticsData["rooms"] = [
    { id: "a", room: "Lab A", location: "Lab A", totalReports: 5, activeReports: 0, completedReports: 5, facilities: [] },
    { id: "b", room: "Lab B", location: "Lab B", totalReports: 5, activeReports: 4, completedReports: 1, facilities: [] },
  ]
  const html = renderToStaticMarkup(createElement(ManagementFacilityOverview, { rooms }))
  assert.equal((html.match(/>Prioritas utama<\/span>/g) ?? []).length, 2)
  assert.equal((html.match(/width:100%/g) ?? []).length, 2)
  assert.match(html, /Belum ada rincian objek fasilitas/)
  assert.doesNotMatch(html, /data-slot="chart"|NaN|Infinity/)
})

test("Historical facility empty states are period scoped and remain wired to applied filters", () => {
  const html = renderToStaticMarkup(createElement(ManagementFacilityOverview, { rooms: [] }))
  assert.match(html, /Belum ada laporan fasilitas pada periode ini/)
  assert.doesNotMatch(html, /aria-pressed|Prioritas utama|Prioritas berikutnya|data-slot="chart"/)
  assert.match(source, /<ManagementFacilityOverview key=\{period.from \+ ":" \+ period.to\} rooms=\{data.rooms\}/)
  assert.match(source, /maximumRoomReports = Math.max\(1, \.\.\.rankedRooms.map\(\(room\) => room.totalReports\)\)/)
})
