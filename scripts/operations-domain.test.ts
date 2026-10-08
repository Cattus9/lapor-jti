import test from "node:test"
import assert from "node:assert/strict"
import { assertUserChange, availableFacilities, parseMasterCommand, parseUserCommand, type OperationalCatalog } from "../src/features/operations/domain/operations"
import { ReportError } from "../src/features/reports/domain/report"
import { resolveOperationsSnapshot } from "../src/features/operations/components/operations-resource-state"
import { facilityCategories, isFacilityCategory } from "../src/features/operations/domain/facility-categories"

const id = "00000000-0000-4000-8000-000000000001"
const master = { entity: "locations", name: "Lab Uji", isActive: true, areaId: "floor-2", objectIds: ["lamp", "lamp"] }
const user = { name: "Petugas Uji", email: "Petugas@example.test", role: "teknisi", isActive: true, password: "unique-Password-123" }
test("Location configuration requires a stable area and deduplicates bounded mappings", () => {
  assert.deepEqual(parseMasterCommand(master).objectIds, ["lamp"])
  for (const areaId of ["", null, {}, 1]) assert.throws(() => parseMasterCommand({ ...master, areaId }), ReportError)
  for (const objectIds of [null, "lamp", [null], Array(101).fill("lamp")]) assert.throws(() => parseMasterCommand({ ...master, objectIds }), ReportError)
})
test("Master writes validate revisions, names, status, area kinds and ordering", () => {
  for (const name of ["", " Lainnya ", "x".repeat(101), "bad\u0000name"]) assert.throws(() => parseMasterCommand({ ...master, name }), ReportError)
  for (const revision of [undefined, -1, 0.2, "0"]) assert.throws(() => parseMasterCommand({ ...master, id, revision }), ReportError)
  for (const isActive of ["true", 1, undefined]) assert.throws(() => parseMasterCommand({ ...master, isActive }), ReportError)
  for (const sortOrder of [-1, 1000, "1", 0.5]) assert.throws(() => parseMasterCommand({ ...master, entity: "areas", sortOrder }), ReportError)
  assert.throws(() => parseMasterCommand({ ...master, entity: "areas", kind: "basement" }), ReportError)
  assert.throws(() => parseMasterCommand({ ...master, entity: "officers", id: "bad", revision: 0 }), ReportError)
})
test("Facility categories are a fixed allowlist for creates and edits, not arbitrary text", () => {
  const object = { entity: "objects", name: "Meja", isActive: true }
  assert.equal(new Set(facilityCategories).size, facilityCategories.length)
  for (const group of facilityCategories) {
    assert.equal(isFacilityCategory(group), true)
    assert.equal(parseMasterCommand({ ...object, group }).group, group)
    assert.equal(parseMasterCommand({ ...object, id: "object-5", revision: 0, group: ` ${group} ` }).group, group)
  }
  for (const group of ["", "Uji", "Furniture", "furnitur", "Kategori baru", "Perangkat\u0000", null, {}, undefined]) {
    assert.equal(isFacilityCategory(group), false)
    assert.throws(() => parseMasterCommand({ ...object, group }), ReportError)
    assert.throws(() => parseMasterCommand({ ...object, id: "object-5", revision: 0, group }), ReportError)
  }
  assert.equal(parseMasterCommand({ ...master, group: "Ignored unrelated field" }).group, "")
})
test("User creation uses operational roles only and bounded Better Auth passwords", () => {
  assert.equal(parseUserCommand(user).email, "petugas@example.test")
  for (const role of ["admin", "", {}, null]) assert.throws(() => parseUserCommand({ ...user, role }), ReportError)
  for (const password of [undefined, "x".repeat(11), "x".repeat(129)]) assert.throws(() => parseUserCommand({ ...user, password }), ReportError)
  for (const email of ["abc", "a b@example.test", "a@x"]) assert.throws(() => parseUserCommand({ ...user, email }), ReportError)
  const parsed = parseUserCommand({ ...user, actorId: "spoof", emailVerified: true, image: "spoof" })
  assert.equal("actorId" in parsed, false); assert.equal("emailVerified" in parsed, false)
})
test("Editing a user requires its version and never silently resets a credential", () => {
  const { password: _password, ...profile } = user; void _password
  const edit = { ...profile, id, updatedAt: "2026-10-08T00:00:00.000Z" }
  assert.equal(parseUserCommand(edit).password, undefined)
  assert.throws(() => parseUserCommand({ ...edit, password: user.password }), ReportError)
  assert.throws(() => parseUserCommand({ ...edit, updatedAt: "bad" }), ReportError)
})
test("Self-demotion, self-deactivation, admin targets and the last active manager are protected", () => {
  const before = { id, role: "manajemen", isActive: true }
  assert.throws(() => assertUserChange(id, before, { role: "teknisi", isActive: true }, 2), ReportError)
  assert.throws(() => assertUserChange(id, before, { role: "manajemen", isActive: false }, 2), ReportError)
  assert.throws(() => assertUserChange("other", before, { role: "teknisi", isActive: true }, 1), ReportError)
  assert.throws(() => assertUserChange("other", { ...before, role: "admin" }, { role: "teknisi", isActive: true }, 2), ReportError)
  assert.doesNotThrow(() => assertUserChange("other", before, { role: "teknisi", isActive: true }, 2))
  assert.doesNotThrow(() => assertUserChange("other", { ...before, isActive: false }, { role: "teknisi", isActive: true }, 1))
})
test("Reporter facility choices follow explicit room mappings, including disabled objects", () => {
  const catalog: OperationalCatalog = { areas: [], services: [], officers: [], locations: [{ id: "lab", name: "Lab Uji", areaId: "floor-2", objectIds: ["lamp", "ac"], isActive: true, revision: 0 }], objects: [{ id: "lamp", name: "Lampu", isActive: true, revision: 0 }, { id: "sink", name: "Wastafel", isActive: true, revision: 0 }, { id: "ac", name: "AC", isActive: false, revision: 0 }] }
  assert.deepEqual(availableFacilities(catalog, "Lab Uji").map((row) => row.name), ["Lampu"])
  assert.deepEqual(availableFacilities(catalog, "Unknown"), [])
  assert.deepEqual(availableFacilities(catalog, "Lainnya").map((row) => row.name), ["Lampu", "Wastafel"])
})
test("Same-scope reloads retain confirmed content but keep stale actions disabled", () => {
  const result = { url: "/configuration", key: "first", data: { rooms: ["lab"] }, error: "" }
  assert.deepEqual(resolveOperationsSnapshot("/configuration", "first", result), { data: result.data, loading: false, error: "" })
  assert.deepEqual(resolveOperationsSnapshot("/configuration", "next", result), { data: result.data, loading: true, error: "" })
  assert.deepEqual(resolveOperationsSnapshot("/users?role=satpam", "next", result), { data: undefined, loading: true, error: "" })
  assert.deepEqual(resolveOperationsSnapshot("/configuration", "next", { ...result, key: "next", error: "Network error" }), { data: result.data, loading: false, error: "Network error" })
})
