import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { readFileSync } from "node:fs"
import { Package } from "lucide-react"
import { SectionCard } from "../src/components/ui/section-card"
import { SatpamPriorityQueue } from "../src/features/lost-found/components/satpam-dashboard"
import { InventoryResults } from "../src/features/lost-found/components/satpam-inventory-workspace"
import type { InventoryItem } from "../src/features/lost-found/domain/inventory"

const item: InventoryItem = { id: "fixture", itemName: "Dompet hitam", description: "Fixture", status: "tersimpan", storageLocation: "Pos Satpam", registeredByName: "Petugas", createdAt: "25 Okt 2026", updatedAt: "25 Okt 2026" }
const props = { items: [] as InventoryItem[], loading: false, error: "", filtered: false, onSelect: () => {}, onRetry: () => {} }

test("Section header remains outside the content surface, with its semantic heading and zero metadata", () => {
  const html = renderToStaticMarkup(<SectionCard title="Inventaris" icon={Package} meta={0}>Konten</SectionCard>)
  assert.match(html, /data-slot="card"/)
  assert.match(html, /<h2[^>]*>.*Inventaris<\/h2>/)
  assert.match(html, />0<\/div>/)
  assert.ok(html.indexOf('data-slot="section-header"') < html.indexOf('data-slot="card-content"'))
})

test("Dashboard has an explicit empty state and retains the queue when an active handover report exists", () => {
  const empty = renderToStaticMarkup(<SatpamPriorityQueue queue={[]} updatedAt="25 Okt 2026" />)
  assert.match(empty, /Tidak ada laporan aktif/)
  assert.match(empty, /border-dashed/)
  const live = renderToStaticMarkup(<SatpamPriorityQueue queue={[{ id: "one", ticket: "LJ-2026-1", title: "Barang siap diserahkan", status: "Barang teridentifikasi", kind: "temuan", location: "Pos", submittedAt: "25 Okt 2026" }]} updatedAt="25 Okt 2026" />)
  assert.match(live, /Barang siap diserahkan/)
  assert.doesNotMatch(live, /Tidak ada laporan aktif/)
  assert.match(live, /detail=1/)
})

test("Inventory distinguishes a blank collection from unmatched filters, with one inset empty state", () => {
  const initial = renderToStaticMarkup(<InventoryResults {...props} />)
  assert.match(initial, /Belum ada barang inventaris/)
  assert.match(initial, /bg-empty-surface/)
  const filtered = renderToStaticMarkup(<InventoryResults {...props} filtered />)
  assert.match(filtered, /Tidak ada barang yang sesuai/)
  assert.doesNotMatch(filtered, /Belum ada barang inventaris|Daftarkan Barang Pertama/)
})

test("Loading and request failures never masquerade as empty inventory; stale cards cannot act", () => {
  const loading = renderToStaticMarkup(<InventoryResults {...props} loading />)
  assert.match(loading, /data-slot="skeleton"/)
  assert.doesNotMatch(loading, /Belum ada barang inventaris|Tidak ada barang yang sesuai/)
  const failed = renderToStaticMarkup(<InventoryResults {...props} error="Koneksi terputus" />)
  assert.match(failed, /Koneksi terputus/)
  assert.match(failed, /Coba lagi/)
  assert.doesNotMatch(failed, /Belum ada barang inventaris|Tidak ada barang yang sesuai/)
  const stale = renderToStaticMarkup(<InventoryResults {...props} items={[item]} loading />)
  assert.match(stale, /Dompet hitam/)
  assert.match(stale, /aria-disabled="true"/)
  assert.match(stale, /tabindex="-1"/)
})

test("Inventory uses the shared section surface, labelled global controls and Shadcn status tones", () => {
  const text = readFileSync("src/features/lost-found/components/satpam-inventory-workspace.tsx", "utf8")
  assert.match(text, /<SectionCard title="Daftar barang inventaris"/)
  assert.match(text, /items=\{inventoryStatusOptions\}/)
  assert.match(text, /htmlFor="inventory-status"/)
  assert.doesNotMatch(text, /w-\[180px\]|text-\[11px\]|hover:shadow-md/)
  const live = renderToStaticMarkup(<InventoryResults {...props} items={[item]} />)
  assert.match(live, /data-tone="success"/)
  assert.match(live, /role="button"/)
})
