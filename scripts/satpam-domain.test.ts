import test from "node:test"
import assert from "node:assert/strict"
import { parseSatpamCommand, parseSatpamFilter, parseHistoryFilter, requireSatpam } from "../src/features/lost-found/domain/satpam"
import { SatpamService } from "../src/features/lost-found/application/satpam-service"
import { assertTransition, ReportError } from "../src/features/reports/domain/report"
import type { SatpamRepository } from "../src/features/lost-found/application/ports"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import { satpamReportPeriods, satpamReportSorts } from "../src/features/lost-found/domain/satpam-list-filters"
import { defaultReportFilters, reportDateBounds } from "../src/features/reports/domain/report-list-filters"

const id = "00000000-0000-4000-8000-000000000001"
const handover = { type: "handover", matchId: id, officerId: id, recipient: "Penerima", location: "Pos Satpam", note: "" }
test("Only the authenticated Satpam role can operate; selected officer is not an account", () => {
  requireSatpam({ id, role: "satpam" })
  for (const role of ["pelapor", "teknisi", "manajemen", "admin"]) assert.throws(() => requireSatpam({ id, role }), (e: unknown) => e instanceof ReportError && e.status === 403)
})
test("Handover requires an explicit officer, recipient and location", () => {
  assert.deepEqual(parseSatpamCommand(handover), handover)
  for (const patch of [{ officerId: undefined }, { officerId: "nama satpam" }, { matchId: "invalid" }, { recipient: " " }, { recipient: "x".repeat(151) }, { location: "" }, { note: "x".repeat(2001) }]) assert.throws(() => parseSatpamCommand({ ...handover, ...patch }), ReportError)
  assert.equal(parseSatpamCommand({ ...handover, officerName: "Impersonated", actorId: id }).type, "handover")
})
test("Direct status mutation cannot bypass matching or handover; rejection needs a reason", () => {
  for (const status of ["barang_teridentifikasi", "diserahkan", "baru", "fasilitas"]) assert.throws(() => parseSatpamCommand({ type: "status", ticket: "LJ-2026-00001", status }), ReportError)
  assert.throws(() => parseSatpamCommand({ type: "status", ticket: "LJ-2026-00001", status: "ditolak", note: " " }), ReportError)
  assert.equal(parseSatpamCommand({ type: "status", ticket: "LJ-2026-00001", status: "diverifikasi" }).type, "status")
})
test("Matching requires two distinct valid tickets", () => {
  assert.equal(parseSatpamCommand({ type: "match", lossTicket: "LJ-2026-00001", foundTicket: "LJ-2026-00002" }).type, "match")
  for (const foundTicket of ["LJ-2026-00001", "bad", "LJ-2026-00000000000000000"]) assert.throws(() => parseSatpamCommand({ type: "match", lossTicket: "LJ-2026-00001", foundTicket }), ReportError)
})
test("Lost/found lifecycle cannot skip steps or reopen terminal status", () => {
  for (const [from, to] of [["baru", "diverifikasi"], ["diverifikasi", "diproses"], ["diproses", "barang_teridentifikasi"], ["barang_teridentifikasi", "diserahkan"], ["diserahkan", "selesai"], ["baru", "ditolak"]] as const) assertTransition("kehilangan-temuan", from, to)
  for (const [from, to] of [["baru", "selesai"], ["diproses", "ditolak"], ["selesai", "diproses"], ["ditolak", "diverifikasi"]] as const) assert.throws(() => assertTransition("kehilangan-temuan", from, to), ReportError)
})
test("Server filters reject malformed statuses, officers and calendar dates", () => {
  assert.equal(parseSatpamFilter({ kind: "temuan", matching: "1", q: "  kartu  " }).query, "kartu")
  for (const value of [{ kind: "fasilitas" }, { status: "admin" }, { q: "a".repeat(201) }]) assert.throws(() => parseSatpamFilter(value), ReportError)
  assert.deepEqual(parseHistoryFilter({ from: "2026-10-01", to: "2026-10-04", officerId: id }).from, "2026-10-01")
  for (const value of [{ from: "2026-02-30" }, { from: "2026-10-05", to: "2026-10-04" }, { officerId: "nama" }]) assert.throws(() => parseHistoryFilter(value), ReportError)
})
test("Service rejects unauthorized/invalid commands before repository or storage calls", async () => {
  let calls = 0
  const repository = { execute: async () => { calls++ } } as unknown as SatpamRepository
  const storage = {} as AttachmentStorage
  const service = new SatpamService(repository, storage)
  await assert.rejects(service.execute({ id, role: "pelapor" }, handover), ReportError)
  await assert.rejects(service.execute({ id, role: "satpam" }, { ...handover, officerId: null }), ReportError)
  assert.equal(calls, 0)
  await service.execute({ id, role: "satpam" }, handover)
  assert.equal(calls, 1)
})
test("List defaults preserve newest/all-time and accept the same periods for both kinds", () => {
  const defaults = parseSatpamFilter()
  assert.equal(defaults.sort, "terbaru")
  assert.equal(defaults.period, "semua")
  for (const kind of ["kehilangan", "temuan"]) {
    for (const sort of Object.keys(satpamReportSorts)) {
      for (const period of Object.keys(satpamReportPeriods)) {
        const filter = parseSatpamFilter({ kind, sort, period })
        assert.equal(filter.sort, sort)
        assert.equal(filter.period, period)
        assert.equal(filter.kind, kind)
      }
    }
  }
})
test("List rejects unknown periods and orders rather than silently falling back", () => {
  for (const raw of [{ sort: "asc" }, { sort: "updatedAt" }, { sort: {} }, { sort: "toString" }, { period: "rentang" }, { period: "besok" }, { period: 7 }, { period: "__proto__" }]) assert.throws(() => parseSatpamFilter(raw), ReportError)
})
test("List periods use inclusive WIB calendar starts and exclusive next midnight", () => {
  const now = new Date("2026-10-03T17:00:00Z") // 4 October, exactly midnight WIB.
  const expected = { "hari-ini": "2026-10-03T17:00:00.000Z", "7-hari": "2026-09-27T17:00:00.000Z", "30-hari": "2026-09-04T17:00:00.000Z" }
  for (const period of Object.keys(satpamReportPeriods)) {
    const filter = parseSatpamFilter({ period })
    const bounds = reportDateBounds({ ...defaultReportFilters, period: filter.period }, now)
    if (filter.period === "semua") assert.deepEqual(bounds, {})
    else {
      assert.equal(bounds.from?.toISOString(), expected[filter.period])
      assert.equal(bounds.until?.toISOString(), "2026-10-04T17:00:00.000Z")
    }
  }
  const beforeMidnight = reportDateBounds({ ...defaultReportFilters, period: "hari-ini" }, new Date(now.getTime() - 1))
  assert.equal(beforeMidnight.from?.toISOString(), "2026-10-02T17:00:00.000Z")
})
