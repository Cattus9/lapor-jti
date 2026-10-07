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

test("Seven active rooms show five leaders without losing the remaining rooms or reports", () => {
  const rooms = [room("7", 1), room("4", 4), room("2", 6), room("1", 7), room("6", 2), room("3", 5), room("5", 3)]
  const original = structuredClone(rooms)
  const summary = getTechnicianPrioritySummary(rooms)

  assert.deepEqual(summary.topRooms.map((entry) => entry.id), ["1", "2", "3", "4", "5"])
  assert.equal(summary.totalRooms, 7)
  assert.equal(summary.remainingRooms, 2)
  assert.equal(summary.remainingActiveReports, 3)
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

  assert.equal((html.match(/aria-pressed="(?:true|false)"/g) ?? []).length, 5)
  assert.equal((html.match(/aria-pressed="true"/g) ?? []).length, 1)
  assert.match(html, /Lihat semua 7 ruang/)
  assert.match(html, /href="\/teknisi\/laporan-fasilitas\?view=priority"/)
  assert.match(html, /28 laporan aktif di 7 ruang/)
  assert.match(html, /2 ruang lainnya · 3 laporan aktif/)
  assert.match(html, /Prioritas berdasarkan laporan aktif, bukan risiko\. Jumlah per objek bukan total tiket\. 2 laporan di luar grafik ada di antrean\./)
  assert.doesNotMatch(html, /role="combobox"|Prioritas utama|Prioritas tinggi|Prioritas sedang/)
})

test("Up to five rooms do not suggest an omitted bucket", () => {
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [room("1", 1)] }))
  assert.match(html, /Buka prioritas/)
  assert.doesNotMatch(html, /Lihat semua|ruang lainnya/)
  assert.doesNotMatch(html, /laporan di luar grafik/)
})

test("Chart identity retains distinct room colors and the original facility panel without duplicate controls", () => {
  const html = renderToStaticMarkup(createElement(TechnicianPriorityAnalysis, { rooms: [room("1", 2), room("2", 1)] }))
  assert.match(html, /--color-room-1: var\(--chart-1\)/)
  assert.match(html, /--color-room-2: var\(--chart-2\)/)
  assert.match(html, /--color-activeReports: var\(--chart-1\)/)
  assert.match(html, /Keluhan di dalam ruang/)
  assert.equal((html.match(/href="\/teknisi\/laporan-fasilitas\?view=priority"/g) ?? []).length, 1)
  assert.doesNotMatch(html, /role="combobox"|color-mix/)
})
