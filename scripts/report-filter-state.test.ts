import assert from "node:assert/strict"
import test from "node:test"
import { createReportFilterState, reconcileReportFilterState } from "../src/features/reports/components/report-filter-state"
import { defaultReportFilters, parseReportListFilters, reportListHref } from "../src/features/reports/domain/report-list-filters"

test("unchanged URL criteria preserve input state across pagination", () => {
  const state = createReportFilterState(defaultReportFilters)
  assert.equal(reconcileReportFilterState(state, { ...defaultReportFilters }), state)
})

test("a completed request cannot overwrite newer typing or incomplete dates", () => {
  const requested = parseReportListFilters({ q: "AC" })
  const newer = { ...requested, q: "AC rusak", period: "rentang" as const, from: "2026-10-01", to: "" }
  const state = { ...createReportFilterState(defaultReportFilters), values: newer, requests: [reportListHref(requested)] }
  const received = reconcileReportFilterState(state, requested)
  assert.deepEqual(received.values, newer)
  assert.deepEqual(received.requests, [])
  assert.equal(received.revision, 0)
})

test("overlapping requests acknowledge older results without discarding the newest selection", () => {
  const first = parseReportListFilters({ q: "AC" })
  const second = parseReportListFilters({ q: "AC", category: "fasilitas" })
  let state = { ...createReportFilterState(defaultReportFilters), values: second, requests: [reportListHref(first), reportListHref(second)] }
  state = reconcileReportFilterState(state, first)
  assert.deepEqual(state.values, second)
  assert.deepEqual(state.requests, [reportListHref(second)])
  state = reconcileReportFilterState(state, second)
  assert.deepEqual(state.values, second)
  assert.deepEqual(state.requests, [])
})

test("external navigation restores URL state and invalidates delayed searches", () => {
  const first = parseReportListFilters({ category: "fasilitas" })
  const state = { ...createReportFilterState(first), values: { ...first, q: "unfinished search" } }
  const received = reconcileReportFilterState(state, defaultReportFilters)
  assert.deepEqual(received.values, defaultReportFilters)
  assert.equal(received.revision, state.revision + 1)
  assert.deepEqual(received.requests, [])
})
