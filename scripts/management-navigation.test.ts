import test from "node:test"
import assert from "node:assert/strict"
import { navigationByRole } from "../src/components/navigation/nav-config"
import { groupNavigationItems } from "../src/components/navigation/nav-groups"

test("Management navigation has four meaningful sections while preserving route order", () => {
  const items = navigationByRole.manajemen
  const groups = groupNavigationItems(items)
  assert.deepEqual(groups.map(({ label, items }) => [label, items.map(({ title }) => title)]), [
    ["Operasional", ["Ringkasan", "Kelola Laporan", "Monitoring"]],
    ["Analisis", ["Statistik", "Rekap Laporan"]],
    ["Administrasi", ["Kelola Pengguna", "Pengaturan Operasional"]],
    ["Akun", ["Notifikasi", "Profil"]],
  ])
  assert.deepEqual(groups.flatMap((group) => group.items), items)
  assert.equal(new Set(groups.flatMap((group) => group.items.map((item) => item.url))).size, items.length)
})

test("Other roles retain their existing Workspace navigation", () => {
  for (const role of ["pelapor", "satpam", "teknisi", "admin"] as const) {
    const groups = groupNavigationItems(navigationByRole[role])
    assert.equal(groups.length, 1)
    assert.equal(groups[0].label, "Workspace")
    assert.deepEqual(groups[0].items, navigationByRole[role])
  }
})

test("Grouping preserves UI metadata and never reorders non-adjacent groups", () => {
  const items = [
    { title: "One", group: "A", indicator: "new report", isActive: true },
    { title: "Two", group: "B", accessibleLabel: "Two reports" },
    { title: "Three", group: "A" },
  ]
  const groups = groupNavigationItems(items)
  assert.deepEqual(groups.map((group) => group.label), ["A", "B", "A"])
  assert.equal(groups[0].items[0], items[0])
  assert.equal(groups[1].items[0], items[1])
  assert.deepEqual(groups.flatMap((group) => group.items), items)
  assert.deepEqual(groupNavigationItems([]), [])
})
