import assert from "node:assert/strict"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { TechnicianPriorityAnalysis } from "../src/features/facilities/components/technician-priority-analysis"
import { getTechnicianPrioritySummary } from "../src/features/facilities/components/technician-priority-summary"
import type { TechnicianRoomPriority } from "../src/features/facilities/types"

function room(id: string, activeReports: number, name = `Ruang ${id}`): TechnicianRoomPriority {
  return { id, room: name, location: name, activeReports, totalReports: activeReports + 2, facilities: [{ facility: "AC", activeReports }] }
}

test("Seven active rooms show six leaders without losing the remaining rooms or reports", () => {
  const rooms = [room("7", 1), room("4", 4), room("2", 6), room("1", 7), room("6", 2), room("3", 5), room("5", 3)]
  const original = structuredClone(rooms)
  const summary = getTechnicianPrioritySummary(rooms)

  assert.deepEqual(summary.topRooms.map((entry) => entry.id), ["1", "2", "3", "4", "5", "6"])
  assert.equal(summary.totalRooms, 7)
  assert.equal(summary.remainingRooms, 1)
  assert.equal(summary.remainingActiveReports, 1)
  assert.equal(summary.totalActiveReports, 28)
  assert.equal(summary.topRooms.reduce((sum, entry) => sum + entry.activeReports, 0) + summary.remainingActiveReports, summary.totalActiveReports)
  assert.deepEqual(rooms, original, "Presentation must not reorder or mutate the dashboard data")
})

test("Equal counts have a deterministic room-name and ID order", () => {
  const rooms = [room("b", 1, "Lab RSI"), room("c", 1, "Lab Jaringan"), room("a", 1, "Lab RSI")]
  assert.deepEqual(getTechnicianPrioritySummary(rooms).topRooms.map((entry) => entry.id), ["c", "a", "b"])
  assert.deepEqual(getTechnicianPrioritySummary([...rooms].reverse()).topRooms.map((entry) => entry.id), ["c", "a", "b"])
})

test("Completed rooms with no active tickets drop out of the summary, not historical totals", () => {
  const summary = getTechnicianPrioritySummary([room("done", 0), room("active", 2)])
  assert.deepEqual(summary.topRooms.map((entry) => entry.id), ["active"])
  assert.equal(summary.totalRooms, 1)
  assert.equal(summary.totalActiveReports, 2)
  assert.equal(summary.remainingRooms, 0)
  assert.equal(summary.remainingActiveReports, 0)
})

test("An empty workload has no ranking or other-room bucket", () => {
  assert.deepEqual(getTechnicianPrioritySummary([]), { topRooms: [], totalRooms: 0, totalActiveReports: 0, remainingRooms: 0, remainingActiveReports: 0 })
  assert.deepEqual(getTechnicianPrioritySummary([room("done", 0)]), getTechnicianPrioritySummary([]))
})

test("The rendered summary bounds room selection and exposes the full priority route", () => {
  const rooms = Array.from({ length: 7 }, (_, index) => room(String(index + 1), 7 - index))
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms, unclassifiedReports: 2 }))

  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) ?? []).length, 6)
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1)
  assert.match(html, /Lihat semua 7 ruang/)
  assert.match(html, /href="\/teknisi\/laporan-fasilitas\?view=priority"/)
  assert.match(html, /28 laporan aktif di 7 ruang/)
  assert.match(html, /6 dari 7 ruang dengan laporan terbanyak/)
  assert.match(html, /1 ruang lainnya · 1 laporan aktif/)
  assert.match(html, /Prioritas berdasarkan laporan aktif, bukan risiko\. Jumlah per objek bukan total tiket\. 2 laporan di luar grafik ada di antrean\./)
  assert.equal((html.match(/>Prioritas utama<\/span>/g) ?? []).length, 1)
  assert.equal((html.match(/>Prioritas berikutnya<\/span>/g) ?? []).length, 5)
  assert.doesNotMatch(html, /role="combobox"|Prioritas tinggi|Prioritas sedang/)
})

test("Exactly six rooms do not suggest an omitted bucket", () => {
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: Array.from({ length: 6 }, (_, index) => room(String(index + 1), 1)) }))
  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) ?? []).length, 6)
  assert.match(html, /Buka prioritas/)
  assert.doesNotMatch(html, /Lihat semua|ruang lainnya/)
  assert.doesNotMatch(html, /laporan di luar grafik/)
})

test("The room list drives one object-composition chart without duplicate controls", () => {
  const first = { ...room("1", 2), facilities: [{ facility: "AC", activeReports: 2 }, { facility: "LCD", activeReports: 1 }] }
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [first, room("2", 1)] }))
  assert.match(html, /--color-object-0: var\(--chart-1\)/)
  assert.match(html, /--color-object-1: var\(--chart-2\)/)
  assert.match(html, /background-color:var\(--chart-1\)/)
  assert.match(html, /background-color:var\(--chart-2\)/)
  assert.equal((html.match(/data-slot="chart"/g) ?? []).length, 1)
  assert.match(html, /Prioritas ruang aktif/)
  assert.match(html, /Objek di Ruang 1/)
  assert.match(html, /3 objek dilaporkan/)
  assert.match(html, /67%/)
  assert.match(html, /33%/)
  assert.equal((html.match(/href="\/teknisi\/laporan-fasilitas\?view=priority"/g) ?? []).length, 1)
  assert.doesNotMatch(html, /role="combobox"|color-mix|--color-room-/)
})

test("Five active objects retain a donut and omit completed objects without mutating the data", () => {
  const facilities = ["AC", "Komputer", "Lampu", "LCD", "TV"].map((facility) => ({ facility, activeReports: 1 }))
  facilities.push({ facility: "Kursi", activeReports: 0 })
  const original = structuredClone(facilities)
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [{ ...room("1", 1), facilities }] }))
  assert.match(html, /5 objek dilaporkan/)
  assert.equal((html.match(/20%/g) ?? []).length, 5)
  assert.match(html, /data-slot="chart"/)
  assert.doesNotMatch(html, /Kursi|Lihat semua .* objek/)
  assert.deepEqual(facilities, original)
})

test("More than five objects use a bounded list with shares calculated across all objects", () => {
  const facilities = ["AC", "Komputer", "Kursi", "Lampu", "LCD", "Meja", "TV"].map((facility, index) => ({ facility, activeReports: 7 - index }))
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [{ ...room("1", 7), facilities }] }))
  assert.doesNotMatch(html, /data-slot="chart"|objek dilaporkan/)
  assert.match(html, /Lihat semua 7 objek/)
  assert.match(html, /aria-expanded="false"/)
  assert.match(html, /25%/)
  assert.match(html, /11%/)
  assert.doesNotMatch(html, />Meja<|>TV</)
})

test("A stale room without active object counts has an explicit inset empty state, not a zero donut", () => {
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [{ ...room("1", 1), facilities: [{ facility: "AC", activeReports: 0 }] }] }))
  assert.match(html, /Belum ada objek fasilitas aktif/)
  assert.match(html, /bg-empty-surface/)
  assert.doesNotMatch(html, /data-slot="chart"|NaN|Infinity/)
})

test("Tied active counts share primary priority even with different historical totals", () => {
  const rooms = [{ ...room("1", 2), totalReports: 5 }, { ...room("2", 2), totalReports: 25 }, { ...room("3", 1), totalReports: 80 }]
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms }))
  assert.equal((html.match(/>Prioritas utama<\/span>/g) ?? []).length, 2)
  assert.equal((html.match(/>Prioritas berikutnya<\/span>/g) ?? []).length, 1)
  assert.match(html, /berdasarkan jumlah laporan aktif, bukan tingkat risiko teknis/)
  assert.doesNotMatch(html, /Prioritas historikal/)
})
