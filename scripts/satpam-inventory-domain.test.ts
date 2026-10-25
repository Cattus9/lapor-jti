import assert from "node:assert/strict"
import test from "node:test"
import { randomUUID } from "node:crypto"
import { assertInventoryReportCompletable, validateCreateInventory, validateHandoverInventory } from "../src/features/lost-found/domain/inventory"
import { SatpamService } from "../src/features/lost-found/application/satpam-service"
import type { SatpamRepository } from "../src/features/lost-found/application/ports"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import type { ReportActor } from "../src/features/reports/domain/report"
import { validateSatpamIncident } from "../src/features/lost-found/domain/incident-time"

const fakeRepository = {
  listInventory: async () => ({ items: [], total: 0 }),
} as unknown as SatpamRepository

const fakeStorage = {} as AttachmentStorage

test("A physical inventory return may finish an active Satpam report, but cannot reopen or close a foreign workflow", () => {
  for (const status of ["baru", "diproses"]) assertInventoryReportCompletable({ category: "kehilangan-temuan", handlerRole: "satpam", status })
  for (const status of ["selesai", "ditolak", "barang_teridentifikasi", "diserahkan"]) assert.throws(() => assertInventoryReportCompletable({ category: "kehilangan-temuan", handlerRole: "satpam", status }), /Laporan tertaut/)
  assert.throws(() => assertInventoryReportCompletable({ category: "fasilitas", handlerRole: "teknisi", status: "baru" }), /Laporan tertaut/)
})

test("Satpam custom incident dates reject impossible dates, future days and partial date/time pairs", () => {
  validateSatpamIncident()
  validateSatpamIncident("2026-01-20", "09:30")
  assert.throws(() => validateSatpamIncident("2026-02-30", "09:30"), /Tanggal kejadian tidak valid/)
  assert.throws(() => validateSatpamIncident("2099-01-01", "09:30"), /hari ini/)
  assert.throws(() => validateSatpamIncident("2026-01-20"), /bersamaan/)
})

test("Inventory validates image bytes before storage, and cleans only newly staged files on failure/retry", async () => {
  const actor: ReportActor = { id: randomUUID(), role: "satpam" }
  const removed: string[] = []
  const staged = { id: randomUUID(), storageKey: randomUUID(), name: "photo.png", mimeType: "image/png", size: 8, digest: "digest" }
  let writes = 0
  const storage = { store: async () => { writes++; return [staged] }, remove: async (files: { storageKey: string }[]) => { removed.push(...files.map(f => f.storageKey)) } } as unknown as AttachmentStorage
  const failing = new SatpamService({ createInventory: async () => { throw new Error("persistence failed") } } as unknown as SatpamRepository, storage)
  await assert.rejects(failing.createInventory(actor, { itemName: "Barang" }, { name: "fake.png", mimeType: "image/png", bytes: new Uint8Array([1, 2]) }), /valid/)
  assert.equal(writes, 0)
  const image = { name: "photo.png", mimeType: "image/png", bytes: new Uint8Array([137,80,78,71,13,10,26,10]) }
  await assert.rejects(failing.createInventory(actor, { itemName: "Barang" }, image), /persistence failed/)
  assert.deepEqual(removed, [staged.storageKey])
  const originalKey = randomUUID()
  const retry = new SatpamService({ createInventory: async () => ({ id: randomUUID() }), getInventoryPhoto: async () => ({ storageKey: originalKey }) } as unknown as SatpamRepository, storage)
  await retry.createInventory(actor, { itemName: "Barang" }, image)
  assert.deepEqual(removed, [staged.storageKey, staged.storageKey])
  assert.ok(!removed.includes(originalKey))
})


test("validateCreateInventory requires itemName and trims fields", () => {
  assert.throws(() => validateCreateInventory({ itemName: "" }), /Nama barang tidak valid/)
  assert.throws(() => validateCreateInventory({ itemName: "   " }), /Nama barang tidak valid/)
  assert.throws(() => validateCreateInventory({ itemName: "a".repeat(201) }), /maksimal 200/)

  const validated = validateCreateInventory({
    itemName: "  Kunci Motor Vario  ",
    founderName: "  Ahmad Yani  ",
    foundLocation: "  Parkiran Motor Gedung Utama  ",
    description: "  Warna hitam dengan gantungan boneka  ",
  })
  assert.equal(validated.itemName, "Kunci Motor Vario")
  assert.equal(validated.founderName, "Ahmad Yani")
  assert.equal(validated.foundLocation, "Parkiran Motor Gedung Utama")
  assert.equal(validated.description, "Warna hitam dengan gantungan boneka")
})

test("validateCreateLossReport requires itemName, characteristics, description and validates length", async () => {
  const { validateCreateLossReport } = await import("../src/features/lost-found/domain/loss-report")
  assert.throws(() => validateCreateLossReport({ itemName: "", characteristics: "Hitam", description: "Hilang di perpus" }), /Nama barang wajib diisi/)
  assert.throws(() => validateCreateLossReport({ itemName: "Laptop", characteristics: "", description: "Hilang di perpus" }), /Ciri-ciri barang wajib diisi/)
  assert.throws(() => validateCreateLossReport({ itemName: "Laptop", characteristics: "Hitam", description: "" }), /Detail\/kronologi kehilangan wajib diisi/)

  const validated = validateCreateLossReport({
    itemName: "  Laptop Asus  ",
    characteristics: "  Warna perak ada stiker GitHub  ",
    description: "  Tertinggal di meja laboratorium lantai 2  ",
  })
  assert.equal(validated.itemName, "Laptop Asus")
  assert.equal(validated.characteristics, "Warna perak ada stiker GitHub")
  assert.equal(validated.description, "Tertinggal di meja laboratorium lantai 2")
})

test("Inventory rejects external photo URLs and malformed runtime payloads", () => {
  for (const photoUrl of ["https://example.com/photo.jpg", "ftp://example.com/photo.jpg", "javascript:alert(1)"]) assert.throws(() => validateCreateInventory({ itemName: "Dompet", photoUrl }), /unggahan foto privat/)
  for (const raw of [null, [], 1, { itemName: 123 }]) assert.throws(() => validateCreateInventory(raw), /tidak valid/)
})

test("Inventory handover requires an officer, ownership evidence, a stable key and valid optional loss reference", () => {
  const input = { id: randomUUID(), officerId: randomUUID(), submissionKey: randomUUID(), recipient: "  Siti  ", ownershipEvidence: "  Menjelaskan ciri khusus  ", note: "  Catatan  " }
  const result = validateHandoverInventory(input)
  assert.equal(result.recipient, "Siti"); assert.equal(result.ownershipEvidence, "Menjelaskan ciri khusus")
  assert.equal(result.note, "Catatan"); assert.equal(result.lossTicket, undefined)
  assert.throws(() => validateHandoverInventory({ ...input, officerId: "" }), /Pilih petugas/)
  assert.throws(() => validateHandoverInventory({ ...input, ownershipEvidence: "" }), /kepemilikan/)
  assert.throws(() => validateHandoverInventory({ ...input, submissionKey: "" }), /Kunci penyerahan/)
  assert.throws(() => validateHandoverInventory({ ...input, recipient: "x".repeat(151) }), /maksimal 150/)
  assert.throws(() => validateHandoverInventory({ ...input, lossTicket: "bad" }), /tiket tidak valid/)
})

test("SatpamService inventory endpoints enforce satpam role authorization", async () => {
  const service = new SatpamService(fakeRepository, fakeStorage)
  const pelaporActor: ReportActor = { id: "user-1", role: "pelapor" }
  const satpamActor: ReportActor = { id: "user-2", role: "satpam" }

  await assert.rejects(() => service.listInventory(pelaporActor, {}), /Akses hanya untuk Satpam/)
  await assert.rejects(() => service.createInventory(pelaporActor, { itemName: "Tas" }), /Akses hanya untuk Satpam/)
  await assert.rejects(() => service.handoverInventory(pelaporActor, { id: "item-1", recipient: "Budi" }), /Akses hanya untuk Satpam/)
  await assert.rejects(() => service.createLossReport(pelaporActor, { itemName: "Tas", characteristics: "Biru", description: "Hilang" }), /Akses hanya untuk Satpam/)

  // Satpam actor is authorized
  const list = await service.listInventory(satpamActor, {})
  assert.equal(list.total, 0)
})
