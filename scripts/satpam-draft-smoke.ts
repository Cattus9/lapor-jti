import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { inArray } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { createDatabaseClient } from "../src/db/client"
import { accounts, users, reports, reportDrafts, reportAttachments, satpamInventory, satpamLossReports } from "../src/db/schema"
import { emptySatpamDraft, type SatpamDraftFields } from "../src/features/lost-found/domain/satpam-draft"

// HTTP/backend checks only. Cleanup is limited to fixtures owned by these disposable users.
async function main() {
  const origin = process.env.BETTER_AUTH_URL, connect = process.env.REPORT_SMOKE_CONNECT_URL || origin
  if (process.env.NODE_ENV !== "development" || !origin || !connect || !process.env.REPORT_UPLOAD_DIR || ![origin, connect].every(value => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname))) throw new Error("Run on loopback in development with private storage configured.")
  const { db, pool } = createDatabaseClient("migration"), ids: string[] = [], cookies: string[] = [], password = randomUUID()
  const request = (path: string, cookie?: string, init?: RequestInit) => fetch(new URL(path, connect), { ...init, redirect: "manual", headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...init?.headers } })
  const photoBytes = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  const save = (id: string, revision: number, fields: SatpamDraftFields, retainedPhotoId: string | null, photoName?: string, cookie = cookies[0], writeId?: string) => {
    const form = new FormData()
    form.set("data", JSON.stringify({ id, revision, fields, retainedPhotoId, writeId }))
    if (photoName) form.set("photo", new Blob([photoBytes], { type: "image/png" }), photoName)
    return request("/api/satpam/drafts", cookie, { method: "POST", body: form })
  }
  try {
    for (const role of ["satpam", "satpam", "pelapor"] as const) {
      const id = randomUUID(); ids.push(id)
      const email = `draft-smoke-${id}@example.invalid`
      await db.insert(users).values({ id, email, name: `Akun uji ${role}`, role })
      await db.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: await hashPassword(password) })
      const login = await request("/api/auth/sign-in/email", undefined, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      assert.equal(login.status, 200)
      cookies.push(login.headers.getSetCookie().map(value => value.split(";")[0]).join("; "))
    }
    assert.equal((await request("/api/satpam/drafts")).status, 401)
    assert.equal((await request("/api/satpam/drafts", cookies[2])).status, 403)
    const page = await request("/satpam/pelaporan", cookies[0])
    assert.equal(page.status, 200); assert.match(await page.text(), /Pelaporan Pos Satpam/)
    const lossId = randomUUID(), fields = { ...emptySatpamDraft("kehilangan"), title: "Dompet hilang", itemName: "Dompet", location: "Ruang uji", description: "Dompet hitam", ownerName: "Pemilik uji" }
    const writeId = randomUUID()
    let response = await save(lossId, 0, fields, null, "dompet.png", cookies[0], writeId)
    assert.equal(response.status, 200, await response.clone().text())
    const first = (await response.json()).draft
    assert.equal(first.revision, 1); assert.ok(first.photo?.id)
    assert.equal((await save(randomUUID(), 0, fields, null)).status, 409)
    response = await save(lossId, 0, fields, null, "dompet.png", cookies[0], writeId)
    assert.equal(response.status, 200); const repeated = (await response.json()).draft
    assert.equal(repeated.revision, 1); assert.equal(repeated.photo.id, first.photo.id)
    assert.equal((await save(lossId, 0, { ...fields, title: "Berbeda" }, null, "dompet.png", cookies[0], writeId)).status, 409)
    const photoPath = `/api/satpam/drafts/${lossId}/photo/${first.photo.id}`
    assert.equal((await request(photoPath, cookies[1])).status, 404)
    assert.equal((await request(photoPath, cookies[2])).status, 403)
    response = await request(photoPath, cookies[0]); assert.equal(response.status, 200)
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), photoBytes)
    assert.equal((await request("/api/satpam/drafts", cookies[1]).then(value => value.json())).drafts.length, 0)
    const badOrigin = new FormData(); badOrigin.set("data", "{}")
    assert.equal((await request("/api/satpam/drafts", cookies[0], { method: "POST", headers: { Origin: "https://untrusted.example.invalid" }, body: badOrigin })).status, 403)
    response = await save(lossId, 1, fields, first.photo.id)
    assert.equal(response.status, 200); assert.equal((await response.json()).draft.revision, 2)
    const foundId = randomUUID(), found = { ...emptySatpamDraft("temuan"), itemName: "Payung", description: "Biru" }
    response = await save(foundId, 0, found, null, "payung.png")
    assert.equal(response.status, 200); assert.equal((await response.json()).draft.revision, 1)
    const resumed = (await request("/api/satpam/drafts", cookies[0]).then(value => value.json())).drafts
    assert.equal(resumed.length, 2)
    assert.equal(resumed.find((draft: { id: string }) => draft.id === lossId)?.photo?.id, first.photo.id)
    assert.equal(resumed.find((draft: { id: string }) => draft.id === foundId)?.fields.itemName, "Payung")
    const lossSubmit = () => {
      const form = new FormData()
      for (const [key, value] of Object.entries({ submissionKey: lossId, draftRevision: "2", title: fields.title, itemName: fields.itemName, location: fields.location, description: fields.description, characteristics: fields.description, ownerName: fields.ownerName })) form.set(key, value)
      return request("/api/satpam/loss-reports", cookies[0], { method: "POST", body: form })
    }
    const attempts = await Promise.all([lossSubmit(), lossSubmit()])
    assert.deepEqual(attempts.map(value => value.status), [200, 200])
    const losses = await Promise.all(attempts.map(value => value.json()))
    assert.equal(losses[0].id, losses[1].id)
    assert.equal((await db.select().from(reports).where(inArray(reports.submissionKey, [lossId]))).length, 1)
    assert.equal((await request(photoPath, cookies[0])).status, 404)
    assert.equal((await request(`/api/satpam/loss-reports/${losses[0].id}/photo`, cookies[0])).status, 200)

    const inventorySubmit = () => {
      const form = new FormData()
      form.set("submissionKey", foundId); form.set("itemName", found.itemName); form.set("description", found.description)
      form.set("photo", new Blob([photoBytes], { type: "image/png" }), "payung.png")
      return request("/api/satpam/inventory", cookies[0], { method: "POST", body: form })
    }
    const inventory = await Promise.all([inventorySubmit(), inventorySubmit()])
    assert.deepEqual(inventory.map(value => value.status), [200, 200])
    const items = await Promise.all(inventory.map(value => value.json()))
    assert.equal(items[0].id, items[1].id)
    response = await save(foundId, 1, emptySatpamDraft("temuan"), null)
    assert.equal(response.status, 200); assert.equal((await response.json()).clearedDraftId, foundId)
    response = await save(foundId, 1, emptySatpamDraft("temuan"), null)
    assert.equal(response.status, 200); assert.equal((await response.json()).clearedDraftId, foundId)
    assert.equal((await request("/api/satpam/drafts", cookies[0]).then(value => value.json())).drafts.length, 0)
    console.log("PASS: authenticated draft/photo ownership, resume, conflict-safe concurrent submission, inventory retry and clearing")
  } finally {
    if (ids.length) {
      const files = await db.select({ key: reportAttachments.storageKey }).from(reportAttachments).where(inArray(reportAttachments.ownerId, ids))
      const inventoryFiles = await db.select({ key: satpamInventory.photoStorageKey }).from(satpamInventory).where(inArray(satpamInventory.registeredBy, ids))
      await db.delete(reportDrafts).where(inArray(reportDrafts.reporterId, ids))
      await db.delete(satpamLossReports).where(inArray(satpamLossReports.registeredBy, ids))
      await db.delete(satpamInventory).where(inArray(satpamInventory.registeredBy, ids))
      await db.delete(reports).where(inArray(reports.reporterId, ids))
      await db.delete(users).where(inArray(users.id, ids))
      const root = resolve(process.env.REPORT_UPLOAD_DIR!)
      for (const key of new Set([...files, ...inventoryFiles].map(item => item.key).filter((value): value is string => Boolean(value)))) await unlink(join(root, key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error })
    }
    await pool.end()
  }
}

main().catch(error => { console.error(error); process.exitCode = 1 })
