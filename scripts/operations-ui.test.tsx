import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { FacilityMappingFields } from "../src/features/reports/components/facility-mapping-fields"
import { SettingsSection } from "../src/features/operations/components/operational-settings"
import { FacilityCategoryField, MasterAvailabilityField, MasterNameField } from "../src/features/operations/components/master-editor-fields"
import { facilityCategories } from "../src/features/operations/domain/facility-categories"
import { readFileSync } from "node:fs"
import type { OperationalCatalog } from "../src/features/operations/domain/operations"

const catalog: OperationalCatalog = {
  areas: [{ id: "floor-2", name: "Lantai 2", kind: "floor", isActive: true, revision: 0 }],
  locations: [{ id: "lab", name: "Lab Uji", areaId: "floor-2", objectIds: ["lamp", "ac"], isActive: true, revision: 0 }],
  objects: [{ id: "lamp", name: "Lampu Uji", isActive: true, revision: 0 }, { id: "sink", name: "Wastafel Uji", isActive: true, revision: 0 }, { id: "ac", name: "AC Uji", isActive: false, revision: 0 }],
  officers: [], services: [],
}
function render(location: string, facilities: string[] = [], data = catalog) {
  return renderToStaticMarkup(<FacilityMappingFields catalog={data} location={location} facilities={facilities} otherLocation="" otherFacility="" onLocationChange={() => {}} onFacilitiesChange={() => {}} onOtherLocationChange={() => {}} onOtherFacilityChange={() => {}} />)
}
test("Reporter form renders dependent area/location fields and mapped active checkboxes only", () => {
  const html = render("Lab Uji")
  assert.match(html, /Area \/ lantai/); assert.match(html, /Lokasi fasilitas/)
  assert.match(html, /aria-label="Lampu Uji"/); assert.match(html, /aria-label="Lainnya"/)
  assert.doesNotMatch(html, /aria-label="Wastafel Uji"/); assert.doesNotMatch(html, /aria-label="AC Uji"/)
})
test("Location selection is required before facility choices; catalog gaps retain the escape hatch", () => {
  assert.match(render(""), /Pilih lokasi dahulu/)
  assert.doesNotMatch(render(""), /aria-label="Lampu Uji"/)
  const emptyRoom = { ...catalog, locations: catalog.locations.map((room) => ({ ...room, objectIds: [] })) }
  assert.match(render("Lab Uji", [], emptyRoom), /Belum ada fasilitas terpetakan/)
  assert.match(render("Lab Uji", [], emptyRoom), /aria-label="Lainnya"/)
  assert.match(render("Lainnya"), /Detail lokasi/)
})
test("Unavailable draft fields are disclosed rather than silently losing user input", () => {
  assert.match(render("Unknown room"), /Lokasi draft sudah tidak tersedia/)
  const html = render("Lab Uji", ["Wastafel Uji"])
  assert.match(html, /Fasilitas draft tidak lagi tersedia/)
  assert.match(html, /Hapus pilihan yang tidak tersedia/)
})

test("All master name fields have contextual examples and linked Shadcn helper text", () => {
  const descriptions = new Set<string>()
  for (const entity of ["officers", "areas", "locations", "objects", "services"] as const) {
    const html = renderToStaticMarkup(<MasterNameField entity={entity} value="" onChange={() => {}} />)
    assert.match(html, /placeholder="Contoh: [^"]+"/)
    assert.match(html, /aria-describedby="master-name-hint"/)
    assert.match(html, /data-slot="field-description"/)
    assert.match(html, /id="master-name-hint"/)
    assert.match(html, /text-xs/)
    const helper = html.match(/<p[^>]*id="master-name-hint"[^>]*>([^<]+)<\/p>/)![1]
    descriptions.add(helper)
    const edited = renderToStaticMarkup(<MasterNameField entity={entity} value="Nama yang disimpan" onChange={() => {}} />)
    assert.match(edited, /value="Nama yang disimpan"/)
    assert.match(edited, /placeholder="Contoh:/)
  }
  assert.equal(descriptions.size, 5)
  const userEditor = readFileSync("src/features/operations/components/user-management.tsx", "utf8")
  assert.match(userEditor, /id="user-name" aria-describedby="user-name-hint" placeholder="Contoh:/)
  assert.match(userEditor, /<FieldDescription id="user-name-hint">/)
})

test("Facility category is a described select, preserves seeded values and discloses legacy categories", () => {
  const html = renderToStaticMarkup(<FacilityCategoryField value="Furnitur" onChange={() => {}} />)
  assert.match(html, /role="combobox"/)
  assert.match(html, /id="object-group"/)
  assert.match(html, /aria-describedby="object-group-hint"/)
  assert.match(html, />Furnitur<\/span>/)
  assert.doesNotMatch(html, /<input[^>]*id="object-group"/)
  for (const category of facilityCategories) assert.ok(category.trim())
  const legacy = renderToStaticMarkup(<FacilityCategoryField value="" legacyCategory="Custom lama" onChange={() => {}} />)
  assert.match(legacy, /Pilih kategori fasilitas/)
  assert.match(legacy, /Custom lama/)
  assert.match(legacy, /belum termasuk daftar tetap/)
  const selected = renderToStaticMarkup(<FacilityCategoryField value="Umum" legacyCategory="Custom lama" onChange={() => {}} />)
  assert.doesNotMatch(selected, /belum termasuk daftar tetap/)
})

test("Availability hints describe the actual consumer and retain labelled checkbox semantics", () => {
  const consumers = { officers: "penyerahan barang", areas: "seluruh lokasi", locations: "jika area aktif", objects: "lokasi yang dipetakan", services: "laporan baru" }
  for (const entity of ["officers", "areas", "locations", "objects", "services"] as const) {
    const html = renderToStaticMarkup(<MasterAvailabilityField entity={entity} checked onChange={() => {}} />)
    assert.match(html, /Tersedia untuk dipilih/)
    assert.match(html, /for="master-active"/)
    assert.match(html, /id="master-active"/)
    assert.match(html, /aria-describedby="master-active-hint"/)
    assert.match(html, /data-slot="field-description"/)
    assert.ok(html.includes(consumers[entity]))
    assert.match(html, /Nonaktif:/)
  }
})

test("Operational cards retain soft status tones, primary Add and soft-blue row actions", () => {
  for (const entity of ["officers", "areas", "locations", "objects", "services"] as const) {
    const rows = [
      { id: "active", name: "Data aktif", isActive: true, revision: 0, kind: "floor" as const, group: "Fasilitas" },
      { id: "inactive", name: "Data nonaktif", isActive: false, revision: 0, kind: "floor" as const, group: "Fasilitas" },
    ]
    const html = renderToStaticMarkup(<SettingsSection entity={entity} catalog={{ ...catalog, [entity]: rows }} disabled={false} onEdit={() => {}} />)
    assert.match(html, /data-tone="success"[^>]*>Aktif<\/span>/)
    assert.match(html, /data-tone="neutral"[^>]*>Nonaktif<\/span>/)
    assert.match(html, /bg-emerald-50/)
    assert.match(html, /dark:bg-emerald-950\/50/)
    const buttons = html.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []
    const add = buttons.find((button) => button.includes("Tambah "))!
    const edit = buttons.find((button) => button.includes('aria-label="Ubah Data aktif"'))!
    assert.ok(add)
    assert.match(add, /bg-primary-action/)
    assert.doesNotMatch(add, / disabled=""/)
    assert.ok(edit)
    assert.doesNotMatch(edit, /bg-primary-action/)
    assert.match(edit, /bg-primary\/5/)
    assert.match(edit, /text-primary-action-hover/)
    assert.match(edit, /hover:bg-primary\/10/)
    assert.match(edit, /dark:bg-primary\/10/)
    assert.match(edit, /dark:text-primary/)
    if (entity === "locations") assert.match(edit, /Atur lokasi/)
    const cards = (html.match(/<div\b[^>]*data-slot="card"[^>]*>/g) ?? []).filter((card) => card.includes('role="article"'))
    assert.equal(cards.length, 2)
    for (const card of cards) {
      assert.match(card, /hover:border-primary\/40/)
      assert.match(card, /focus-within:border-primary\/40/)
      assert.match(card, /motion-reduce:transition-none/)
      assert.doesNotMatch(card, /hover:border-2|cursor-pointer/)
    }
    const pending = renderToStaticMarkup(<SettingsSection entity={entity} catalog={{ ...catalog, [entity]: rows }} disabled onEdit={() => {}} />)
    assert.match((pending.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []).find((button) => button.includes("Tambah "))!, / disabled=""/)
    assert.match((pending.match(/<button\b[^>]*>[\s\S]*?<\/button>/g) ?? []).find((button) => button.includes('aria-label="Ubah Data aktif"'))!, / disabled=""/)
  }
})
