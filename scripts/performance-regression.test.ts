import test from "node:test"
import assert from "node:assert/strict"
import { randomBytes, randomUUID } from "node:crypto"
import { readFileSync } from "node:fs"
import sharp from "sharp"
import { PrivateImagePreviews } from "../src/features/reports/infrastructure/private-image-previews"
import { parseInventoryFilter } from "../src/features/lost-found/domain/inventory"
import { SatpamService } from "../src/features/lost-found/application/satpam-service"
import type { SatpamRepository } from "../src/features/lost-found/application/ports"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import { mergeOperationalPage } from "../src/components/reports/operational-resource-state"

test("An empty report page still supplies catalog metadata; append deduplicates and resets discard the previous scope", () => {
  const empty = { items: [] as { id: string }[], nextCursor: null, total: 0, services: [{ id: "service-1" }] }
  const first = mergeOperationalPage(empty.items, empty)
  assert.equal(first.data, empty)
  assert.equal(first.data.services.length, 1)
  const next = mergeOperationalPage([{ id: "a" }, { id: "b" }], { items: [{ id: "b" }, { id: "c" }], nextCursor: null, total: 3 })
  assert.deepEqual(next.items.map((item) => item.id), ["a", "b", "c"])
  assert.deepEqual(mergeOperationalPage(empty.items, empty).items, [])
})

test("Inventory filters are bounded, typed, and pass cursor/search to SQL", () => {
  assert.deepEqual(parseInventoryFilter({ q: "  kunci  ", status: "tersimpan", cursor: "cursor" }), { query: "kunci", status: "tersimpan", cursor: "cursor" })
  for (const raw of [{ q: 3 }, { q: "a".repeat(101) }, { status: "invalid" }, { cursor: "" }, { cursor: 5 }, { cursor: "a".repeat(161) }]) assert.throws(() => parseInventoryFilter(raw))
})

test("Private thumbnails are bounded WebP without metadata; source stays unchanged and reads coalesce", async () => {
  const source = await sharp(randomBytes(1920 * 1080 * 3), { raw: { width: 1920, height: 1080, channels: 3 } }).jpeg({ quality: 90 }).withMetadata().toBuffer()
  const copy = Buffer.from(source), cache = new PrivateImagePreviews()
  let reads = 0
  const load = async () => { reads++; return source }
  const [one, two] = await Promise.all([cache.read("one", load), cache.read("one", load)])
  const meta = await sharp(one.bytes).metadata()
  assert.equal(reads, 1)
  assert.equal(one, two)
  assert.equal(one.mimeType, "image/webp")
  assert.ok(meta.width! <= 640 && meta.height! <= 640)
  assert.equal(meta.exif, undefined)
  assert.ok(one.bytes.length < source.length / 4)
  assert.deepEqual(source, copy)
  await cache.read("one", load); assert.equal(reads, 1)
  cache.forget("one"); await cache.read("one", load); assert.equal(reads, 2)
  console.log(`Thumbnail fixture: ${source.length} original bytes -> ${one.bytes.length} preview bytes`)
})

test("Thumbnail failures do not poison the cache, SVG is rejected and entries are bounded", async () => {
  const cache = new PrivateImagePreviews(), source = await sharp({ create: { width: 8, height: 8, channels: 3, background: "green" } }).png().toBuffer()
  await assert.rejects(cache.read("broken", async () => Buffer.from("not an image")), /dipratinjau/)
  await assert.rejects(cache.read("svg", async () => Buffer.from('<svg width="8" height="8" xmlns="http://www.w3.org/2000/svg"><rect width="8" height="8"/></svg>')), /dipratinjau/)
  await cache.read("broken", async () => source)
  for (let i = 0; i < 65; i++) await cache.read(String(i), async () => source)
  let reloaded = false
  await cache.read("broken", async () => { reloaded = true; return source })
  assert.equal(reloaded, true)
})

test("Preview access always checks role and current repository result before reading storage", async () => {
  const id = randomUUID(), actor = { id: randomUUID(), role: "satpam" }
  let exists = true, lookups = 0, previews = 0, originals = 0
  const service = new SatpamService({ getInventoryPhoto: async () => { lookups++; return exists ? { mimeType: "image/jpeg", storageKey: id, name: "item.jpg" } : null } } as unknown as SatpamRepository, {
    read: async () => { originals++; return new Uint8Array([1]) },
    readPreview: async () => { previews++; return { bytes: new Uint8Array([2]), mimeType: "image/webp" } },
  } as unknown as AttachmentStorage)
  for (const role of ["tefa", "pelapor", "teknisi", "manajemen"]) await assert.rejects(service.downloadInventoryPhoto({ ...actor, role }, id, true), /Akses hanya untuk Satpam/)
  assert.equal(lookups, 0)
  assert.equal((await service.downloadInventoryPhoto(actor, id, true)).photo.mimeType, "image/webp")
  assert.equal((await service.downloadInventoryPhoto(actor, id)).photo.mimeType, "image/jpeg")
  exists = false
  await assert.rejects(service.downloadInventoryPhoto(actor, id, true), /Foto tidak ditemukan/)
  assert.equal(lookups, 3); assert.equal(previews, 1); assert.equal(originals, 1)
})

test("TEFA list uses its own catalog response and details have a deferred bundle", () => {
  const text = readFileSync("src/features/tefa/components/tefa-workspace.tsx", "utf8")
  assert.match(text, /view === "dashboard" \? "\/api\/tefa\/dashboard" : undefined/)
  assert.match(text, /page\.data\?\.services/)
  assert.match(text, /dynamic\(\(\) => import\("\.\/tefa-report-detail"\)/)
  assert.doesNotMatch(text, /import \{ TefaReportDetail \} from/)
  for (const path of ["satpam-inventory-workspace.tsx", "satpam-lost-found-workspace.tsx"]) {
    const source = readFileSync(`src/features/lost-found/components/${path}`, "utf8")
    assert.match(source, /useSatpamPage<InventoryItem>/)
    assert.match(source, /inventoryResource\.loadMore|resource\.loadMore/)
  }
})
