import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { FoundNoticeService, type FoundNoticeRepository } from "../src/features/found-notices/application/found-notice-service"
import { parseFoundNoticeCursor, presentFoundNotice } from "../src/features/found-notices/domain/found-notice"

const actor = { id: randomUUID(), role: "pelapor" }
const ref = { source: "report" as const, id: randomUUID() }
function fixture() {
  const calls: string[] = []
  const repo: FoundNoticeRepository = {
    list: async userId => { calls.push(userId); return { items: [], unread: 0, total: 0, nextCursor: null } },
    detail: async userId => { calls.push(userId); return null },
    markRead: async userId => { calls.push(userId); return true },
  }
  return { repo, calls, service: new FoundNoticeService(repo) }
}

test("shared notices remain limited to Pelapor, including direct detail/read calls", async () => {
  const { service, calls } = fixture()
  for (const role of ["satpam", "tefa", "manajemen", "teknisi", "admin"]) {
    assert.throws(() => service.list({ ...actor, role }), /Pelapor/)
    await assert.rejects(service.detail({ ...actor, role }, ref), /Pelapor/)
    await assert.rejects(service.markRead({ ...actor, role }, ref), /Pelapor/)
  }
  assert.equal(calls.length, 0)
})

test("invalid refs, forged sources, cursors and unbounded requests never reach persistence", async () => {
  const { service, calls } = fixture()
  for (const raw of [null, { ...ref, source: "loss" }, { ...ref, id: "../private" }]) await assert.rejects(service.markRead(actor, raw))
  for (const cursor of ["bad", "x".repeat(201), JSON.stringify({ ...ref, publishedAt: "bad" }), JSON.stringify({ ...ref, publishedAt: "2026-11-08" })]) assert.throws(() => service.list(actor, { cursor }))
  for (const limit of [0, -1, 21, 1.5]) assert.throws(() => service.list(actor, { limit }))
  assert.equal(calls.length, 0)
})

test("receipt identity comes from the authenticated actor, not a supplied userId", async () => {
  const { service, calls } = fixture()
  assert.deepEqual(await service.markRead(actor, { ...ref, userId: randomUUID() }), { ok: true })
  assert.deepEqual(calls, [actor.id])
})

test("removed or rejected findings return unavailable instead of exposing private report detail", async () => {
  const { service, repo } = fixture()
  await assert.rejects(service.detail(actor, ref), /tidak tersedia/)
  repo.markRead = async () => false
  await assert.rejects(service.markRead(actor, ref), /tidak tersedia/)
})

test("the shared projection excludes identities, original descriptions, photo keys and ownership evidence", () => {
  const internal = {
    ...ref, itemName: "Dompet", foundLocation: "Ruang 3.2", storageLocation: "Pos Satpam",
    publishedAt: new Date("2026-11-08T01:00:00.000Z"), state: "stored" as const, readAt: null,
    founderName: "PRIVATE", reporterEmail: "PRIVATE", recipientPhone: "PRIVATE", description: "PRIVATE",
    photoStorageKey: "PRIVATE", ownershipEvidence: "PRIVATE", ticketNumber: "PRIVATE",
  }
  const projected = presentFoundNotice(internal)
  assert.equal(JSON.stringify(projected).includes("PRIVATE"), false)
  assert.deepEqual(Object.keys(projected).sort(), ["source", "id", "itemName", "foundLocation", "storageLocation", "publishedAt", "state", "read"].sort())
  assert.equal(projected.read, false)
  assert.equal(presentFoundNotice({ ...internal, readAt: new Date() }).read, true)
  assert.deepEqual(parseFoundNoticeCursor(JSON.stringify({ ...ref, publishedAt: projected.publishedAt })), { ...ref, publishedAt: internal.publishedAt })
})
