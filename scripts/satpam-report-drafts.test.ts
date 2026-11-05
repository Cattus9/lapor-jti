import test from "node:test"
import assert from "node:assert/strict"
import { File } from "node:buffer"
import { emptySatpamDraft, hasSatpamDraftContent, parseSatpamDraft, type SatpamDraftView } from "../src/features/lost-found/domain/satpam-draft"
import { SatpamReportDrafts, type SatpamDraftEntry } from "../src/features/lost-found/components/satpam-report-drafts"

test("Drafts preserve independent fields and photos while a previous save is in flight", async () => {
  const store = new SatpamReportDrafts()
  const firstPhoto = new File(["first"], "barang.png", { type: "image/png" }) as unknown as globalThis.File
  store.capture("kehilangan", { ...emptySatpamDraft("kehilangan"), title: "Dompet", itemName: "Dompet" }, firstPhoto)
  let release!: () => void
  const wait = new Promise<void>((resolve) => { release = resolve })
  const writes: SatpamDraftEntry[] = []
  const writer = async (entry: SatpamDraftEntry) => {
    writes.push(entry)
    if (writes.length === 1) await wait
    const draft: SatpamDraftView = { id: entry.id, revision: entry.revision + 1, fields: entry.fields, photo: entry.file ? { id: crypto.randomUUID(), name: entry.file.name, size: entry.file.size, mimeType: entry.file.type } : null }
    return { draft }
  }
  const pending = store.save("kehilangan", writer)
  store.capture("temuan", { ...emptySatpamDraft("temuan"), itemName: "Kunci" }, null)
  store.capture("kehilangan", { ...emptySatpamDraft("kehilangan"), title: "Dompet diperbarui", itemName: "Dompet" }, firstPhoto)
  release(); await pending
  assert.equal(writes.length, 2)
  assert.equal(writes[1].revision, 1)
  assert.equal(writes[1].fields.title, "Dompet diperbarui")
  assert.equal(store.isDirty("kehilangan"), false)
  assert.equal(store.get("kehilangan").file, firstPhoto)
  assert.equal(store.get("temuan").fields.itemName, "Kunci")
})

test("Failed saves retain input; emptying a saved draft clears its identity", async () => {
  const store = new SatpamReportDrafts()
  store.capture("temuan", { ...emptySatpamDraft("temuan"), itemName: "Payung" }, null)
  const writeId = store.get("temuan").writeId
  await assert.rejects(store.save("temuan", async () => { throw new Error("offline") }), /offline/)
  assert.equal(store.get("temuan").fields.itemName, "Payung")
  assert.equal(store.get("temuan").status, "error")
  assert.equal(store.get("temuan").writeId, writeId, "An identical retry must keep the same request identity")
  await store.save("temuan", async entry => ({ draft: { id: entry.id, revision: 1, fields: entry.fields, photo: null } }))
  const oldId = store.get("temuan").id
  store.capture("temuan", emptySatpamDraft("temuan"), null)
  assert.notEqual(store.get("temuan").writeId, writeId)
  await store.save("temuan", async entry => ({ clearedDraftId: entry.id }))
  assert.notEqual(store.get("temuan").id, oldId)
  assert.equal(store.get("temuan").revision, 0)
  assert.equal(store.isDirty("temuan"), false)
  assert.equal(hasSatpamDraftContent(store.get("temuan").fields, false), false)
})

test("Draft parser excludes fields hidden by the chosen kind and automatic time", () => {
  const value = parseSatpamDraft({ ...emptySatpamDraft("temuan"), title: "hidden", ownerContact: "hidden", incidentDate: "2026-10-01" })
  assert.equal(value.title, "")
  assert.equal(value.ownerContact, "")
  assert.equal(value.incidentDate, "")
  assert.throws(() => parseSatpamDraft({ ...emptySatpamDraft("temuan"), itemName: "x".repeat(201) }))
  assert.throws(() => parseSatpamDraft({ ...emptySatpamDraft("kehilangan"), useCustomTime: true, incidentDate: "2026-02-30" }))
  assert.throws(() => parseSatpamDraft({ ...emptySatpamDraft("kehilangan"), useCustomTime: true, incidentTime: "25:00" }))
})

test("The finding's source survives draft restore and is cleared for a loss draft", () => {
  const fields = { ...emptySatpamDraft("temuan"), sourceFoundTicket: "LJ-2026-00001" }
  assert.equal(parseSatpamDraft(fields).sourceFoundTicket, fields.sourceFoundTicket)
  assert.equal(hasSatpamDraftContent(fields, false), true)
  assert.equal(parseSatpamDraft({ ...fields, kind: "kehilangan" }).sourceFoundTicket, "")
  assert.throws(() => parseSatpamDraft({ ...fields, sourceFoundTicket: "invalid" }))
})
