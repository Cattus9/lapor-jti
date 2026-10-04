import assert from "node:assert/strict"
import test from "node:test"
import { resolveSatpamResource } from "../src/features/lost-found/components/satpam-resource-state"

const url = "/api/satpam/reports/LJ-2026-00049"
const previous = { url, key: `${url}?refresh=1`, data: { status: "Diverifikasi" }, error: "" }

test("a detail refresh retains confirmed data while blocking actions via loading", () => {
  const state = resolveSatpamResource(url, `${url}?refresh=2`, previous, true)
  assert.equal(state.data, previous.data)
  assert.equal(state.loading, true)
  assert.equal(state.error, "")
})

test("the refreshed server status replaces the previous status", () => {
  const key = `${url}?refresh=2`
  const data = { status: "Diproses" }
  assert.deepEqual(resolveSatpamResource(url, key, { url, key, data, error: "" }, true), { data, error: "", loading: false })
})

test("detail data never leaks to another ticket or a disabled request", () => {
  assert.equal(resolveSatpamResource("/api/satpam/reports/LJ-2026-00050", "other", previous, true).data, undefined)
  assert.deepEqual(resolveSatpamResource(undefined, "", previous, true), { data: undefined, error: "", loading: false })
})

test("refresh errors remain visible and do not masquerade as loading or success", () => {
  const key = `${url}?refresh=2`
  const state = resolveSatpamResource(url, key, { ...previous, key, error: "Koneksi bermasalah." }, true)
  assert.equal(state.data, previous.data)
  assert.equal(state.error, "Koneksi bermasalah.")
  assert.equal(state.loading, false)
})

test("list resources still clear old data for skeletons and changed filters", () => {
  assert.equal(resolveSatpamResource(url, `${url}?refresh=2`, previous).data, undefined)
  assert.equal(resolveSatpamResource(url, `${url}?refresh=2`, previous).loading, true)
})
