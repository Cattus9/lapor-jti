import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { and, eq, inArray } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { createDatabaseClient } from "../src/db/client"
import { accounts, users, reports, reportDrafts, reportAttachments, notifications } from "../src/db/schema"
import { emptyReportPayload, isUuid, type ReportPayload } from "../src/features/reports/domain/report"
import { getTodayInWib } from "../src/features/reports/domain/report-date"

// HTTP checks only, no browser automation. Disposable test accounts/data are removed in finally.
async function main() {
  const baseURL = process.env.BETTER_AUTH_URL
  const password = process.env.DEMO_USER_PASSWORD
  if (process.env.NODE_ENV !== "development" || !baseURL || !password || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(baseURL).hostname)) throw new Error("Report smoke requires a local development server and configured demo password.")
  const { pool, db } = createDatabaseClient("migration")
  // Run beside the app so cleanup targets the same private storage volume.
  if (!process.env.REPORT_UPLOAD_DIR) { await pool.end(); throw new Error("Run report smoke inside the development app with REPORT_UPLOAD_DIR configured.") }
  const storageRoot = resolve(process.env.REPORT_UPLOAD_DIR)
  const connectURL = process.env.REPORT_SMOKE_CONNECT_URL || baseURL
  if (!["localhost", "127.0.0.1", "[::1]"].includes(new URL(connectURL).hostname)) { await pool.end(); throw new Error("Smoke connection URL must be local.") }
  const ids: string[] = []; const cookies: string[] = []
  async function request(path: string, cookie?: string, init?: RequestInit) {
    return fetch(new URL(path, connectURL), { ...init, redirect: "manual", headers: { Origin: baseURL!, ...(cookie ? { Cookie: cookie } : {}), ...init?.headers } })
  }
  async function write(cookie: string, payload: Partial<ReportPayload>, id = randomUUID(), revision = 0, draft = false, kept: string[] = [], file?: Blob) {
    const form = new FormData(); form.set("data", JSON.stringify({ id, revision, payload, retainedAttachmentIds: kept, reporterId: ids[1], status: "selesai", handlerRole: "admin" }))
    if (file) form.append("files", file, "bukti.pdf")
    return request(draft ? "/api/pelapor/drafts" : "/api/pelapor/reports", cookie, { method: "POST", body: form })
  }
  const payload: ReportPayload = { ...emptyReportPayload, title: "Pengujian backend Pelapor", description: "Data sementara untuk pemeriksaan otomatis.", location: "Lobi JTI", incidentDate: "2026-10-03", incidentTime: "10:15", otherCategory: "Pengujian" }
  try {
    for (const role of ["pelapor", "pelapor", "teknisi"] as const) {
      const id = randomUUID(); ids.push(id)
      const email = `report-smoke-${id}@example.test`
      await db.insert(users).values({ id, email, name: "Pengujian sementara", identifier: `TEST-${id}`, role })
      await db.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: await hashPassword(password) })
      const response = await request("/api/auth/sign-in/email", undefined, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      assert.equal(response.status, 200, "temporary account login")
      cookies.push(response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; "))
    }
    assert.equal((await request("/api/pelapor/reports")).status, 401)
    assert.equal((await request("/api/pelapor/reports", cookies[2])).status, 403)
    const badOrigin = await request("/api/pelapor/drafts", cookies[0], { method: "POST", headers: { Origin: "https://untrusted.example.test" } })
    assert.equal(badOrigin.status, 403)
    assert.equal((await write(cookies[0], { category: "lainnya" })).status, 400)
    for (const draft of [false, true]) {
      for (const incidentDate of [getTodayInWib(new Date(Date.now() + 86_400_000)), getTodayInWib(new Date(Date.now() + 7 * 86_400_000)), "9999-12-31"]) {
        const future = await write(cookies[0], { ...payload, incidentDate }, randomUUID(), 0, draft)
        assert.equal(future.status, 400)
        assert.match((await future.json()).error, /Tanggal kejadian tidak boleh melebihi hari ini/)
      }
    }
    assert.equal((await write(cookies[0], payload, randomUUID(), 0, false, [], new Blob(["fake image"], { type: "image/png" }))).status, 400)
    console.log("PASS: authentication, role, CSRF, required fields, future incident dates, and file validation")

    const draftId = randomUUID()
    const partial = await write(cookies[0], { category: "lainnya", title: "Draft parsial" }, draftId, 0, true)
    assert.equal(partial.status, 200)
    assert.equal((await partial.json()).draft.revision, 1)
    assert.equal((await write(cookies[0], payload, draftId, 0, true)).status, 409)
    assert.equal((await write(cookies[1], payload, draftId, 1, true)).status, 404)
    const saved = await write(cookies[0], payload, draftId, 1, true, [], new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }))
    assert.equal(saved.status, 200); const savedDraft = (await saved.json()).draft
    const attachmentId = savedDraft.attachments[0].id
    assert.equal((await request(`/api/pelapor/attachments/${attachmentId}`, cookies[1])).status, 404)
    const download = await request(`/api/pelapor/attachments/${attachmentId}`, cookies[0]); assert.equal(download.status, 200); assert.equal(await download.text(), "%PDF-1.7\n%%EOF")
    assert.equal((await write(cookies[1], payload, randomUUID(), 0, true, [attachmentId])).status, 400)
    const [first, retry] = await Promise.all([write(cookies[0], payload, draftId, 2, false, [attachmentId]), write(cookies[0], payload, draftId, 2, false, [attachmentId])])
    assert.equal(first.status, 200); assert.equal(retry.status, 200)
    const firstResult = (await first.json()).report; assert.deepEqual(firstResult, (await retry.json()).report)
    const [persisted] = await db.select().from(reports).where(eq(reports.id, firstResult.id))
    assert.equal(persisted.reporterId, ids[0]); assert.equal(persisted.status, "baru"); assert.equal(persisted.handlerRole, "manajemen"); assert.equal(persisted.completedAt, null)
    assert.equal((await write(cookies[0], payload, draftId, 2, true)).status, 409)
    assert.equal((await request(`/api/pelapor/reports/${firstResult.id}`, cookies[1])).status, 404)
    const detail = await (await request(`/api/pelapor/reports/${firstResult.id}`, cookies[0])).json()
    assert.equal(detail.detail.attachments.length, 1); assert.equal(detail.history.length, 1); assert.equal(detail.detail.fields[0].value, "Pengujian")
    assert.equal((await db.select().from(reportAttachments).where(eq(reportAttachments.id, attachmentId)))[0].draftId, null)
    console.log("PASS: draft revision/ownership, private download, transactional submission, and concurrent idempotency")

    const categories: ReportPayload[] = [
      { ...payload, category: "fasilitas", location: "Lab Jaringan 2", facilities: ["AC", "LCD"] },
      { ...payload, category: "kehilangan-temuan", reportType: "Kehilangan", itemName: "Dompet", itemDetails: "Warna hitam" },
      { ...payload, category: "kehilangan-temuan", reportType: "Temuan", itemName: "Kartu", itemDetails: "Warna biru" },
      { ...payload, category: "layanan", service: "JTI Surat", program: "TIF" },
    ]
    for (const data of categories) {
      const response = await write(cookies[0], data); assert.equal(response.status, 200)
      const report = (await response.json()).report
      const full = await (await request(`/api/pelapor/reports/${report.id}`, cookies[0])).json()
      assert.ok(full.detail.fields.length > 0)
    }
    const responses = await Promise.all(Array.from({ length: 19 }, () => write(cookies[0], payload)))
    const tickets = await Promise.all(responses.map(async (response) => { assert.equal(response.status, 200); return (await response.json()).report.ticketNumber }))
    assert.equal(new Set(tickets).size, tickets.length)
    const page1 = await (await request("/api/pelapor/reports", cookies[0])).json()
    assert.equal(page1.items.length, 20); assert.ok(page1.nextCursor); assert.equal(page1.drafts.length, 0); assert.equal("detail" in page1.items[0], false)
    const page2 = await (await request(`/api/pelapor/reports?cursor=${encodeURIComponent(page1.nextCursor)}`, cookies[0])).json()
    assert.equal(page2.items.length, 4)
    assert.equal(new Set([...page1.items, ...page2.items].map((item: { id: string }) => item.id)).size, 24)
    const selected = await (await request(`/api/pelapor/reports?ticket=${firstResult.ticketNumber}`, cookies[0])).json()
    assert.equal(selected.selected.id, firstResult.id)
    const otherPage = await (await request("/api/pelapor/reports", cookies[1])).json(); assert.equal(otherPage.items.length, 0)
    assert.equal((await (await request(`/api/pelapor/reports?ticket=${firstResult.ticketNumber}`, cookies[1])).json()).selected, undefined)
    assert.equal((await write(cookies[0], { ...payload, category: "fasilitas", location: "Tidak terdaftar", facilities: ["AC"] })).status, 400)
    const drafts = await Promise.all(Array.from({ length: 21 }, () => write(cookies[0], { category: "lainnya", title: "Draft pagination" }, randomUUID(), 0, true)))
    for (const draft of drafts) assert.equal(draft.status, 200)
    const draftPage = await (await request("/api/pelapor/reports", cookies[0])).json()
    assert.equal(draftPage.drafts.length, 20); assert.ok(draftPage.nextDraftCursor)
    const draftPage2 = await (await request(`/api/pelapor/reports?draftCursor=${encodeURIComponent(draftPage.nextDraftCursor)}`, cookies[0])).json()
    assert.equal(draftPage2.drafts.length, 1)
    assert.equal(new Set([...draftPage.drafts, ...draftPage2.drafts].map((draft: { id: string }) => draft.id)).size, 21)
    console.log("PASS: four categories, unique concurrent tickets, pagination without duplication, and owner-scoped lists")

    // Only this run's disposable reports are adjusted to exercise WIB day boundaries.
    await db.update(reports).set({ submittedAt: new Date("2026-10-03T17:00:00Z") }).where(eq(reports.reporterId, ids[0]))
    await db.update(reports).set({ title: "Pengujian 100%_ laporan", status: "selesai", completedAt: new Date("2026-10-04T04:00:00Z"), submittedAt: new Date("2026-10-03T16:59:59.999Z") }).where(and(eq(reports.id, firstResult.id), eq(reports.reporterId, ids[0])))
    const processSamples = page1.items.filter((item: { id: string; category: string }) => item.category === "lainnya" && item.id !== firstResult.id).slice(0, 2)
    await db.update(reports).set({ status: "diproses" }).where(and(eq(reports.id, processSamples[0].id), eq(reports.reporterId, ids[0])))
    await db.update(reports).set({ status: "ditolak" }).where(and(eq(reports.id, processSamples[1].id), eq(reports.reporterId, ids[0])))
    async function filtered(query: Record<string, string>, cookie = cookies[0]) {
      const response = await request(`/api/pelapor/reports?${new URLSearchParams(query)}`, cookie)
      assert.equal(response.status, 200)
      return response.json()
    }
    const categoryPage = await filtered({ category: "fasilitas" }); assert.equal(categoryPage.items.length, 1); assert.equal(categoryPage.items[0].category, "fasilitas")
    assert.equal((await filtered({ category: "kehilangan-temuan" })).items.length, 2)
    const finished = await filtered({ status: "selesai" }); assert.equal(finished.items.length, 1); assert.equal(finished.items[0].id, firstResult.id)
    const active = await filtered({ status: "belum-selesai" }); assert.equal(active.items.length, 20); assert.ok(active.items.every((item: { status: string }) => item.status !== "selesai" && item.status !== "ditolak"))
    const activeNext = await filtered({ status: "belum-selesai", cursor: active.nextCursor }); assert.equal(activeNext.items.length, 2)
    assert.ok([...active.items, ...activeNext.items].some((item: { id: string }) => item.id === processSamples[0].id), "in-progress reports remain in the unfinished group")
    assert.ok([...page1.items, ...page2.items].some((item: { id: string }) => item.id === processSamples[1].id), "all reports include the rejected report")
    const rejected = await filtered({ q: processSamples[1].ticketNumber }); assert.equal(rejected.items[0].status, "ditolak")
    assert.equal((await filtered({ q: processSamples[1].ticketNumber, status: "selesai" })).items.length, 0)
    assert.equal((await filtered({ q: processSamples[1].ticketNumber, status: "belum-selesai" })).items.length, 0)
    const legacyStage = await filtered({ status: "baru", q: processSamples[0].ticketNumber }); assert.equal(legacyStage.items[0].status, "diproses", "old per-stage URLs now use the compact unfinished group")
    const day = await filtered({ period: "rentang", from: "2026-10-03", to: "2026-10-03" }); assert.equal(day.items.length, 1); assert.equal(day.items[0].id, firstResult.id); assert.equal(day.items[0].submittedAtIso, "2026-10-03T16:59:59.999Z"); assert.match(day.items[0].submittedAt, /3 Okt 2026/)
    const nextDay = await filtered({ period: "rentang", from: "2026-10-04", to: "2026-10-04" }); assert.equal(nextDay.items.length, 20); assert.equal((await filtered({ period: "rentang", from: "2026-10-04", to: "2026-10-04", cursor: nextDay.nextCursor })).items.length, 3)
    const combined = await filtered({ category: "lainnya", status: "selesai", q: "100%_", period: "rentang", from: "2026-10-03", to: "2026-10-03" }); assert.equal(combined.items.length, 1)
    const ticketSearch = await filtered({ q: firstResult.ticketNumber.toLowerCase() }); assert.equal(ticketSearch.items[0].id, firstResult.id)
    for (const query of ["%", "_"]) assert.equal((await filtered({ q: query })).items.length, 1, "literal wildcard search")
    for (const query of ["\\", "%' OR 1=1 --", "tidak-ada-laporan"]) assert.equal((await filtered({ q: query })).items.length, 0)
    assert.equal((await filtered({ q: "100%_" }, cookies[1])).items.length, 0, "filtered results remain owner scoped")
    const filteredPage = await filtered({ q: "Pengujian", category: "lainnya" }); assert.equal(filteredPage.items.length, 20); assert.equal(filteredPage.nextCursor, null)
    const invalidFilters: Record<string, string>[] = [{ category: "unknown" }, { status: "unknown" }, { period: "unknown" }, { q: "x".repeat(101) }, { category: "fasilitas", status: "diserahkan" }, { period: "rentang", from: "2026-02-30", to: "2026-03-01" }]
    for (const query of invalidFilters) assert.equal((await request(`/api/pelapor/reports?${new URLSearchParams(query)}`, cookies[0])).status, 400)
    const filteredHtml = await (await request("/pelapor/laporan-saya?category=lainnya&status=selesai", cookies[0])).text()
    assert.ok(filteredHtml.includes("Pengujian 100%_ laporan")); assert.ok(filteredHtml.includes("Dikirim")); assert.ok(filteredHtml.includes("WIB")); assert.ok(filteredHtml.includes("Semua waktu"))
    assert.ok(filteredHtml.includes("Jenis laporan")); assert.ok(filteredHtml.includes("Proses")); assert.ok(filteredHtml.includes("Periode"))
    const draftWithFilters = await filtered({ category: "fasilitas", status: "baru" }); assert.equal(draftWithFilters.drafts.length, 20)
    console.log("PASS: compact process groups, rejected-report semantics, combined SQL filters, literal search, WIB dates, pagination, and SSR metadata")

    const unread = await (await request("/api/pelapor/notifications", cookies[0])).json(); assert.equal(unread.unread, 24); assert.equal(unread.items.length, 20)
    const mark = await request("/api/pelapor/notifications", cookies[0], { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: unread.items[0].id }) }); assert.equal(mark.status, 200)
    assert.equal((await (await request("/api/pelapor/notifications", cookies[0])).json()).unread, 23)
    await request("/api/pelapor/notifications", cookies[1], { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    assert.equal((await (await request("/api/pelapor/notifications", cookies[0])).json()).unread, 23)
    await request("/api/pelapor/notifications", cookies[0], { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    assert.equal((await (await request("/api/pelapor/notifications", cookies[0])).json()).unread, 0)
    await db.update(users).set({ isActive: false }).where(eq(users.id, ids[0]))
    assert.equal((await request("/api/pelapor/reports", cookies[0])).status, 401)
    await db.update(users).set({ isActive: true, role: "teknisi" }).where(eq(users.id, ids[0]))
    assert.equal((await request("/api/pelapor/reports", cookies[0])).status, 403)
    await db.update(users).set({ role: "pelapor" }).where(eq(users.id, ids[0]))
    for (const path of ["dashboard", "laporan-saya", "notifikasi", "profil"]) assert.equal((await request(`/pelapor/${path}`, cookies[0])).status, 200)
    console.log("PASS: persistent notification reads and server-rendered Pelapor pages")
  } finally {
    // Only exact disposable account IDs created by this run are eligible for removal.
    // Only generated UUID keys belonging to the exact disposable accounts can be removed.
    for (const [index, cookie] of cookies.entries()) {
      const files = await db.select().from(reportAttachments).where(eq(reportAttachments.ownerId, ids[index]))
      for (const file of files) {
        assert.ok(isUuid(file.storageKey))
        try { await unlink(join(storageRoot, file.storageKey)) }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error }
      }
      await request("/api/auth/sign-out", cookie, { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }).catch(() => undefined)
    }
    if (ids.length) {
      await db.delete(notifications).where(inArray(notifications.recipientId, ids))
      await db.delete(reportAttachments).where(inArray(reportAttachments.ownerId, ids))
      await db.delete(reportDrafts).where(inArray(reportDrafts.reporterId, ids))
      await db.delete(reports).where(inArray(reports.reporterId, ids))
      await db.delete(users).where(and(inArray(users.id, ids), sqlSmokeAccount()))
    }
    await pool.end()
  }
}
function sqlSmokeAccount() { return eq(users.name, "Pengujian sementara") }
main().catch((error) => { console.error(error instanceof Error ? error.message : "Report smoke failed."); process.exitCode = 1 })
