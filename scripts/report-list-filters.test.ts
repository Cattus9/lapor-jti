import assert from "node:assert/strict"
import test from "node:test"
import { defaultReportFilters, hasReportFilters, parseReportListFilters, reportDateBounds, reportListHref, reportProcessFilters } from "../src/features/reports/domain/report-list-filters"
import { ReportService } from "../src/features/reports/application/report-service"
import type { AttachmentStorage, ReportRepository } from "../src/features/reports/application/ports"

test("default list includes all submitted reports without a date limit", () => {
  assert.deepEqual(parseReportListFilters(), defaultReportFilters)
  assert.deepEqual(reportDateBounds(defaultReportFilters), {})
  assert.equal(hasReportFilters(defaultReportFilters), false)
  assert.equal(reportListHref(defaultReportFilters), "/pelapor/laporan-saya")
})
test("search is bounded and normalized without changing literal wildcard input", () => {
  const filters = parseReportListFilters({ q: "  Dompet 100%_\\  ", category: "kehilangan-temuan", status: "baru" })
  assert.equal(filters.q, "Dompet 100%_\\")
  assert.equal(hasReportFilters(filters), true)
  assert.throws(() => parseReportListFilters({ q: "x".repeat(101) }))
  assert.throws(() => parseReportListFilters({ q: ["dompet", "AC"] }))
})
test("unknown or malformed category/status/period filters are rejected", () => {
  for (const raw of [null, [], "filter", { category: "admin" }, { status: "ditemukan" }, { period: "constructor" }, { period: "__proto__" }, { category: 1 }, { status: {} }]) assert.throws(() => parseReportListFilters(raw))
})
test("process options have exactly three compact groups for every category", () => {
  assert.deepEqual(Object.values(reportProcessFilters), ["Semua", "Belum selesai", "Selesai"])
  for (const category of ["semua", "kehilangan-temuan", "fasilitas", "layanan", "lainnya"]) {
    for (const status of Object.keys(reportProcessFilters)) assert.equal(parseReportListFilters({ category, status }).status, status)
  }
})
test("legacy stage URLs normalize to compact groups without allowing invalid category stages", () => {
  for (const status of ["baru", "diverifikasi", "diproses", "barang_teridentifikasi", "diserahkan"]) assert.equal(parseReportListFilters({ category: "kehilangan-temuan", status }).status, "belum-selesai")
  assert.equal(parseReportListFilters({ category: "layanan", status: "ditolak" }).status, "semua")
  assert.equal(parseReportListFilters({ category: "fasilitas", status: "belum-selesai" }).status, "belum-selesai")
  assert.throws(() => parseReportListFilters({ category: "layanan", status: "diverifikasi" }))
  assert.throws(() => parseReportListFilters({ category: "fasilitas", status: "diserahkan" }))
})
test("custom ranges require real complete dates in chronological order", () => {
  for (const [from, to] of [["", ""], ["2026-10-04", ""], ["2026-02-29", "2026-03-01"], ["2026-02-30", "2026-03-01"], ["2026-10-05", "2026-10-04"], ["2026-13-01", "2026-13-02"], ["2026-1-01", "2026-01-02"], ["9999-12-31", "9999-12-31"]]) assert.throws(() => parseReportListFilters({ period: "rentang", from, to }))
  assert.equal(parseReportListFilters({ period: "rentang", from: "2028-02-29", to: "2028-02-29" }).from, "2028-02-29")
  assert.equal(parseReportListFilters({ period: "semua", from: "invalid", to: "invalid" }).from, "")
})
test("custom period includes the final WIB day with an exclusive next-day bound", () => {
  const bounds = reportDateBounds(parseReportListFilters({ period: "rentang", from: "2026-10-03", to: "2026-10-04" }))
  assert.equal(bounds.from?.toISOString(), "2026-10-02T17:00:00.000Z")
  assert.equal(bounds.until?.toISOString(), "2026-10-04T17:00:00.000Z")
})
test("relative periods use Jakarta midnight even before the UTC date changes", () => {
  const now = new Date("2026-10-03T18:30:00Z") // 4 October, 01:30 WIB
  const expected = { "hari-ini": "2026-10-03T17:00:00.000Z", "7-hari": "2026-09-27T17:00:00.000Z", "30-hari": "2026-09-04T17:00:00.000Z", "bulan-ini": "2026-09-30T17:00:00.000Z" }
  for (const [period, from] of Object.entries(expected)) {
    const bounds = reportDateBounds(parseReportListFilters({ period }), now)
    assert.equal(bounds.from?.toISOString(), from)
    assert.equal(bounds.until?.toISOString(), "2026-10-04T17:00:00.000Z")
  }
})
test("date ranges remain correct across leap days and year boundaries", () => {
  const range = reportDateBounds(parseReportListFilters({ period: "rentang", from: "2028-02-28", to: "2028-02-29" }))
  assert.equal(range.until?.toISOString(), "2028-02-29T17:00:00.000Z")
  const week = reportDateBounds(parseReportListFilters({ period: "7-hari" }), new Date("2027-01-01T04:00:00Z"))
  assert.equal(week.from?.toISOString(), "2026-12-25T17:00:00.000Z")
})
test("pagination links preserve criteria and applying/resetting removes stale cursors", () => {
  const filters = parseReportListFilters({ q: "AC & LCD", category: "fasilitas", status: "baru", period: "rentang", from: "2026-10-03", to: "2026-10-04" })
  const url = new URL(reportListHref(filters, { cursor: "date|id", draftCursor: "draft|id" }), "http://localhost")
  assert.equal(url.searchParams.get("q"), "AC & LCD")
  assert.equal(url.searchParams.get("cursor"), "date|id")
  assert.equal(url.searchParams.get("draftCursor"), "draft|id")
  assert.deepEqual(parseReportListFilters(Object.fromEntries(url.searchParams)), filters)
  assert.equal(new URL(reportListHref(filters), url).searchParams.has("cursor"), false)
  assert.equal(reportListHref(defaultReportFilters), "/pelapor/laporan-saya")
})
test("service validates filters and keeps ownership before handing them to persistence", async () => {
  let calls = 0
  const repository = { list: (ownerId: string, cursor?: string, ticket?: string, draftCursor?: string, filters?: unknown) => { calls++; assert.equal(ownerId, "owner"); assert.equal(cursor, "cursor"); assert.deepEqual(filters, parseReportListFilters({ category: "fasilitas" })); return Promise.resolve({ items: [], drafts: [], nextCursor: null, nextDraftCursor: null }) } } as unknown as ReportRepository
  const service = new ReportService(repository, {} as AttachmentStorage)
  assert.throws(() => service.list({ id: "owner", role: "pelapor" }, undefined, undefined, undefined, { category: "unknown" }))
  assert.throws(() => service.list({ id: "owner", role: "teknisi" }))
  assert.equal(calls, 0)
  await service.list({ id: "owner", role: "pelapor" }, "cursor", undefined, undefined, { category: "fasilitas" })
  assert.equal(calls, 1)
})
