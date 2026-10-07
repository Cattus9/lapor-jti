import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { getTechnicianReportTiming } from "../src/features/facilities/domain/technician-report-timing"
import { formatTechnicianDuration, TechnicianReportTimingCells } from "../src/features/facilities/components/technician-report-timing-cells"
import type { TechnicianFacilityReport } from "../src/features/facilities/types"

const submittedAt = new Date("2026-10-05T08:00:00+07:00")
const now = new Date("2026-10-07T10:30:00+07:00")
const startedAt = new Date("2026-10-07T08:00:00+07:00")
const empty = { waitingSeconds: null, processingStartedAt: null, processingSeconds: null }
const report: TechnicianFacilityReport = {
  id: "timing-example", ticket: "LJ-2026-00001", title: "Lampu rusak", facility: "Lampu", facilities: ["Lampu"],
  locationId: "lab-rsi", room: "Lab RSI", location: "Lab RSI", reporter: "Ayu Santoso", status: "Baru",
  submittedAt: "5 Okt 2026, 08.00", updatedAt: "7 Okt 2026, 08.00", eventDate: "4 Oktober 2026", eventTime: "09.00",
  description: "Lampu tidak menyala.", attachments: 0,
}

test("New and verified reports wait from submission, not from verification or incident time", () => {
  for (const status of ["baru", "diverifikasi"] as const) {
    const result = getTechnicianReportTiming({ status, submittedAt }, null, now)
    assert.deepEqual(result, { ...empty, waitingSeconds: 181800 })
    const html = renderToStaticMarkup(createElement(TechnicianReportTimingCells, {
      report: { ...report, status: status === "baru" ? "Baru" : "Diverifikasi" }, timing: result,
    }))
    assert.match(html, /5 Okt 2026, 08\.00/)
    assert.match(html, /Menunggu 2 hari 2 jam/)
    assert.doesNotMatch(html, /Diproses sejak|Berjalan|terlambat|SLA/i)
  }
})

test("Processing switches from waiting age to elapsed time since its persisted start", () => {
  const result = getTechnicianReportTiming({ status: "diproses", submittedAt }, startedAt, now)
  assert.deepEqual(result, { waitingSeconds: null, processingStartedAt: "2026-10-07T01:00:00.000Z", processingSeconds: 9000 })
  const html = renderToStaticMarkup(createElement(TechnicianReportTimingCells, { report: { ...report, status: "Diproses" }, timing: result }))
  assert.match(html, /Diproses sejak/)
  assert.match(html, /7 Okt 2026, 08\.00 WIB/)
  assert.match(html, /Berjalan 2 jam 30 menit/)
  assert.match(html, /Durasi dihitung saat detail dimuat/)
  assert.doesNotMatch(html, /Menunggu|Belum selesai/)
})

test("Missing processing history is disclosed without inventing a date from updatedAt", () => {
  const result = getTechnicianReportTiming({ status: "diproses", submittedAt }, null, now)
  assert.deepEqual(result, empty)
  const html = renderToStaticMarkup(createElement(TechnicianReportTimingCells, { report: { ...report, status: "Diproses" }, timing: result }))
  assert.match(html, /Diproses sejak/)
  assert.match(html, /Belum tercatat/)
  assert.doesNotMatch(html, /Berjalan|Menunggu|7 Okt 2026, 08\.00/)
})

test("Closed reports have no running counters and preserve the actual completion date", () => {
  for (const status of ["selesai", "ditolak"] as const) {
    assert.deepEqual(getTechnicianReportTiming({ status, submittedAt }, startedAt, now), empty)
  }
  const html = renderToStaticMarkup(createElement(TechnicianReportTimingCells, {
    report: { ...report, status: "Selesai", completedAt: "7 Okt 2026, 10.00" },
    // Even a stale snapshot must not make a closed report look active.
    timing: { waitingSeconds: 3600, processingStartedAt: startedAt.toISOString(), processingSeconds: 7200 },
  }))
  assert.match(html, /Selesai/)
  assert.match(html, /7 Okt 2026, 10\.00/)
  assert.doesNotMatch(html, /Menunggu|Berjalan|Diproses sejak/)
})

test("Invalid, future, and inconsistent timestamps do not produce fabricated or negative durations", () => {
  const current = { status: "diproses" as const, submittedAt }
  for (const start of [new Date("invalid"), new Date("2026-10-04T08:00:00+07:00"), new Date("2026-10-08T08:00:00+07:00")]) {
    assert.deepEqual(getTechnicianReportTiming(current, start, now), empty)
  }
  assert.deepEqual(getTechnicianReportTiming({ status: "baru", submittedAt: new Date("invalid") }, null, now), empty)
  assert.deepEqual(getTechnicianReportTiming({ status: "baru", submittedAt: new Date("2026-10-08T08:00:00+07:00") }, null, now), empty)
  assert.deepEqual(getTechnicianReportTiming(current, startedAt, new Date("invalid")), empty)
})

test("Durations measure elapsed time across WIB midnight, not the number of calendar dates touched", () => {
  const result = getTechnicianReportTiming({ status: "baru", submittedAt: new Date("2026-10-06T23:50:00+07:00") }, null, new Date("2026-10-07T00:10:00+07:00"))
  assert.equal(result.waitingSeconds, 1200)
  assert.equal(formatTechnicianDuration(result.waitingSeconds), "20 menit")
})

test("Compact duration labels handle fresh submissions, exact boundaries and invalid values", () => {
  for (const [seconds, label] of [
    [0, "kurang dari 1 menit"], [59, "kurang dari 1 menit"], [60, "1 menit"], [3599, "59 menit"],
    [3600, "1 jam"], [3660, "1 jam 1 menit"], [86400, "1 hari"], [90000, "1 hari 1 jam"],
  ] as const) assert.equal(formatTechnicianDuration(seconds), label)
  for (const value of [null, undefined, -1, Number.NaN, Number.POSITIVE_INFINITY]) assert.equal(formatTechnicianDuration(value), null)
})

test("Detail reuses indexed status history and inserts timing into the canonical table without a timer or extra queries", () => {
  const read = (path: string) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8")
  const repository = read("src/features/facilities/infrastructure/drizzle-technician-repository.ts")
  const detail = repository.slice(repository.indexOf("async detail("), repository.indexOf("async priorities("))
  assert.match(detail, /history\.find\(\(entry\) => entry\.toStatus === "diproses"\)\?\.createdAt \?\? null/)
  assert.match(detail, /timing: getTechnicianReportTiming\(rows\[0\]\.report, processingStartedAt\)/)
  assert.equal((detail.match(/\.from\(reportStatusHistory\)/g) ?? []).length, 1)
  assert.match(read("src/db/reports-schema.ts"), /history_report_date_idx/)
  const modal = read("src/features/facilities/components/technician-report-detail-dialog.tsx")
  assert.match(modal, /<TechnicianReportTimingCells report=\{report\} timing=\{detail\.data\.timing\} \/>/)
  assert.doesNotMatch(read("src/features/facilities/domain/technician-report-timing.ts"), /from ["'](?:next|react|drizzle-orm|@\/db)/)
  assert.doesNotMatch(read("src/features/facilities/components/technician-report-timing-cells.tsx"), /setInterval|setTimeout|Date\.now/)
})
