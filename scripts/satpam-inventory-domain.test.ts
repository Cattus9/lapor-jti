import assert from "node:assert/strict"
import test from "node:test"
import { validateCreateInventory, validateHandoverInventory } from "../src/features/lost-found/domain/inventory"
import { SatpamService } from "../src/features/lost-found/application/satpam-service"
import type { SatpamRepository } from "../src/features/lost-found/application/ports"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import type { ReportActor } from "../src/features/reports/domain/report"

const fakeRepository = {
  listInventory: async () => ({ items: [], total: 0 }),
} as unknown as SatpamRepository

const fakeStorage = {} as AttachmentStorage


test("validateCreateInventory requires itemName and trims fields", () => {
  assert.throws(() => validateCreateInventory({ itemName: "" }), /Nama barang wajib diisi/)
  assert.throws(() => validateCreateInventory({ itemName: "   " }), /Nama barang wajib diisi/)
  assert.throws(() => validateCreateInventory({ itemName: "a".repeat(201) }), /Nama barang maksimal 200/)

  const validated = validateCreateInventory({
    itemName: "  Kunci Motor Vario  ",
    founderName: "  Ahmad Yani  ",
    description: "  Warna hitam dengan gantungan boneka  ",
  })
  assert.equal(validated.itemName, "Kunci Motor Vario")
  assert.equal(validated.founderName, "Ahmad Yani")
  assert.equal(validated.description, "Warna hitam dengan gantungan boneka")
})

test("validateCreateInventory rejects invalid photoUrl protocols", () => {
  assert.throws(() => validateCreateInventory({ itemName: "Dompet", photoUrl: "ftp://example.com/foto.jpg" }), /Tautan foto harus berupa URL valid/)
  assert.throws(() => validateCreateInventory({ itemName: "Dompet", photoUrl: "javascript:alert(1)" }), /Tautan foto harus berupa URL valid/)

  const validated = validateCreateInventory({ itemName: "Dompet", photoUrl: "https://example.com/foto.jpg" })
  assert.equal(validated.photoUrl, "https://example.com/foto.jpg")
})

test("validateHandoverInventory validates recipient and note", () => {
  assert.throws(() => validateHandoverInventory({ id: "", recipient: "Budi" }), /ID barang tidak valid/)
  assert.throws(() => validateHandoverInventory({ id: "123", recipient: "   " }), /Nama penerima barang wajib diisi/)
  assert.throws(() => validateHandoverInventory({ id: "123", recipient: "a".repeat(151) }), /Nama penerima maksimal 150/)

  const validated = validateHandoverInventory({ id: "item-1", recipient: "  Siti Aminah  ", note: "  Membawa STNK asli  " })
  assert.equal(validated.id, "item-1")
  assert.equal(validated.recipient, "Siti Aminah")
  assert.equal(validated.note, "Membawa STNK asli")
})

test("SatpamService inventory endpoints enforce satpam role authorization", async () => {
  const service = new SatpamService(fakeRepository, fakeStorage)
  const pelaporActor: ReportActor = { id: "user-1", role: "pelapor" }
  const satpamActor: ReportActor = { id: "user-2", role: "satpam" }


  await assert.rejects(() => service.listInventory(pelaporActor, {}), /Akses hanya untuk Satpam/)
  await assert.rejects(() => service.createInventory(pelaporActor, { itemName: "Tas" }), /Akses hanya untuk Satpam/)
  await assert.rejects(() => service.handoverInventory(pelaporActor, { id: "item-1", recipient: "Budi" }), /Akses hanya untuk Satpam/)


  // Satpam actor is authorized
  const list = await service.listInventory(satpamActor, {})
  assert.equal(list.total, 0)
})
