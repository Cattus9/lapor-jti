import assert from "node:assert/strict"
import { test } from "node:test"
import { getStatusBadgePresentation } from "../src/components/ui/status-badge-presentation"
import { reportStatuses, statusLabels } from "../src/features/reports/domain/report"

test("every canonical status and its displayed label have the same non-neutral presentation", () => {
  for (const status of reportStatuses) {
    const presentation = getStatusBadgePresentation(status)
    assert.notEqual(presentation.tone, "neutral", status)
    assert.deepEqual(presentation, getStatusBadgePresentation(statusLabels[status]))
  }
})

test("lifecycle phases use distinct semantic tones", () => {
  assert.deepEqual(reportStatuses.map((status) => getStatusBadgePresentation(status).tone), ["info", "cyan", "warning", "violet", "teal", "success", "destructive"])
  assert.match(getStatusBadgePresentation("Baru").className!, /bg-blue-100/)
  assert.match(getStatusBadgePresentation("Selesai").className!, /bg-emerald-100/)
})

test("legacy labels and casing preserve the lifecycle hierarchy", () => {
  for (const [alias, stage] of [["Sedang Diproses", "diproses"], ["Ditemukan", "barang_teridentifikasi"], ["Dicocokkan", "barang_teridentifikasi"], ["Menunggu penyerahan", "barang_teridentifikasi"], ["  BARANG   TERIDENTIFIKASI  ", "barang_teridentifikasi"]]) {
    assert.deepEqual(getStatusBadgePresentation(alias), getStatusBadgePresentation(stage))
  }
  assert.equal(getStatusBadgePresentation("Perlu diverifikasi").tone, "warning")
  assert.equal(getStatusBadgePresentation("Diverifikasi").tone, "cyan")
})

test("unknown labels safely fall back to neutral", () => {
  for (const status of ["Draft", "", "constructor", "__proto__"]) assert.equal(getStatusBadgePresentation(status).tone, "neutral")
})
