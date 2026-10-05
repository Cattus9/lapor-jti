import "dotenv/config"
import assert from "node:assert/strict"
import { randomInt, randomUUID } from "node:crypto"
import { unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { and, eq, inArray } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { createDatabaseClient } from "../src/db/client"
import { accounts, users, reports, locations, facilityObjects, reportDrafts, reportAttachments, reportFacilityObjects, reportStatusHistory, notifications } from "../src/db/schema"
import { emptyReportPayload, type ReportPayload } from "../src/features/reports/domain/report"
import { getTodayInWib } from "../src/features/reports/domain/report-date"

// HTTP/backend checks only, not browser automation. Development and loopback only.
// Only exact disposable IDs created by this run are deleted in finally; no seed or reset.
async function main() {
  const origin = process.env.BETTER_AUTH_URL, password = process.env.DEMO_USER_PASSWORD
  const connect = process.env.REPORT_SMOKE_CONNECT_URL || origin
  if (process.env.NODE_ENV !== "development" || !origin || !connect || !password || !process.env.REPORT_UPLOAD_DIR || ![origin, connect].every((value) => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname))) throw new Error("Run Teknisi smoke in local development with a demo password and private storage configured.")
  const { pool, db } = createDatabaseClient("migration")
  const userIds: string[] = [], reportIds: string[] = [], draftIds: string[] = [], cookies: string[] = []
  const tag = randomUUID()
  const request = (path: string, cookie?: string, init?: RequestInit) => fetch(new URL(path, connect), { ...init, redirect: "manual", headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...init?.headers } })
  const command = (body: unknown, cookie = cookies[1], headers?: HeadersInit) => request("/api/teknisi/reports", cookie, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })
  async function json(path: string, cookie = cookies[1]) { const response = await request(path, cookie); assert.equal(response.status, 200, path); return response.json() }
  async function submit(patch: Partial<ReportPayload> = {}, withFile = false, draft = false) {
    const id = randomUUID(); draftIds.push(id)
    const payload = { ...emptyReportPayload, category: "fasilitas", title: `Teknisi smoke ${tag}`, description: "Kerusakan sementara pengujian backend.", incidentDate: getTodayInWib(), incidentTime: "09:00", location: masterLocations[0].name, facilities: masterObjects.map((object) => object.name), otherCategory: "Pengujian", ...patch }
    const form = new FormData(); form.set("data", JSON.stringify({ id, revision: 0, payload, retainedAttachmentIds: [] }))
    if (withFile) {
      form.append("files", new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }), "smoke.pdf")
      form.append("files", new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])], { type: "image/png" }), "smoke.png")
    }
    const response = await request(draft ? "/api/pelapor/drafts" : "/api/pelapor/reports", cookies[0], { method: "POST", body: form })
    assert.equal(response.status, 200, await response.clone().text())
    const data = await response.json()
    if (draft) return data.draft as { id: string; attachments: { id: string }[] }
    reportIds.push(data.report.id)
    return data.report as { id: string; ticketNumber: string }
  }
  let masterLocations: typeof locations.$inferSelect[] = []
  let masterObjects: typeof facilityObjects.$inferSelect[] = []
  try {
    masterLocations = await db.select().from(locations).where(eq(locations.isActive, true)).limit(2)
    masterObjects = await db.select().from(facilityObjects).where(eq(facilityObjects.isActive, true)).limit(2)
    assert.ok(masterLocations.length === 2 && masterObjects.length === 2, "Two existing locations and facility objects required; this test does not seed them.")
    for (const role of ["pelapor", "teknisi", "teknisi", "satpam", "manajemen"] as const) {
      const id = randomUUID(); userIds.push(id)
      const email = `technician-smoke-${id}@example.test`
      await db.insert(users).values({ id, email, name: `Akun uji ${role}`, identifier: `TEST-${id}`, role })
      await db.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: await hashPassword(password) })
      const response = await request("/api/auth/sign-in/email", undefined, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      assert.equal(response.status, 200)
      cookies.push(response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; "))
    }
    for (const path of ["/api/teknisi/reports", "/api/teknisi/priorities", "/api/teknisi/history", "/api/teknisi/notifications"]) {
      assert.equal((await request(path)).status, 401)
      for (const cookie of [cookies[0], cookies[3], cookies[4]]) assert.equal((await request(path, cookie)).status, 403)
    }
    assert.equal((await command({}, cookies[1], { Origin: "https://untrusted.example.test" })).status, 403)
    assert.equal((await command({}, cookies[1], { "Content-Type": "text/plain" })).status, 415)
    assert.equal((await command({ note: "x".repeat(13000) })).status, 413)
    assert.equal((await command({ ...emptyReportPayload, ticket: "bad", status: "selesai", note: "X" })).status, 400)

    const item = await submit({}, true) as { id: string; ticketNumber: string }
    const reject = await submit({ title: `Reject ${tag}` }) as typeof item
    const unknown = await submit({ location: "Lainnya", otherLocation: `Lokasi uji ${tag}`, facilities: ["Lainnya"], otherFacility: `Objek uji ${tag}` }) as typeof item
    const other = await submit({ category: "lainnya" }, true) as typeof item
    const draft = await submit({}, true, true) as { id: string; attachments: { id: string }[] }
    assert.equal((await request(`/api/teknisi/reports/${other.ticketNumber}`, cookies[1])).status, 404)
    assert.equal((await command({ ticket: other.ticketNumber, status: "diverifikasi" })).status, 404)
    assert.equal((await request(`/api/teknisi/attachments/${draft.attachments[0].id}`, cookies[1])).status, 404)
    const otherFiles = await db.select().from(reportAttachments).where(eq(reportAttachments.reportId, other.id))
    assert.equal((await request(`/api/teknisi/attachments/${otherFiles[0].id}`, cookies[1])).status, 404)
    const detail = await json(`/api/teknisi/reports/${item.ticketNumber}`)
    assert.equal(detail.files.length, 2); assert.equal(detail.report.facilities.length, 2); assert.equal(detail.history.length, 1)
    const pdf = detail.files.find((file: { mimeType: string }) => file.mimeType === "application/pdf")
    const png = detail.files.find((file: { mimeType: string }) => file.mimeType === "image/png")
    const download = await request(pdf.url, cookies[1]); assert.equal(download.status, 200); assert.equal(await download.text(), "%PDF-1.7\n%%EOF")
    const preview = await request(png.previewUrl, cookies[1]); assert.equal(preview.status, 200); assert.equal(preview.headers.get("x-content-type-options"), "nosniff"); assert.match(preview.headers.get("content-disposition")!, /^inline/)
    assert.equal((await request(pdf.url, cookies[0])).status, 403)
    const incoming = await db.select().from(notifications).where(and(eq(notifications.reportId, item.id), inArray(notifications.recipientId, userIds.slice(1))))
    assert.deepEqual(incoming.map((n) => n.recipientId).sort(), [userIds[1], userIds[2]].sort())
    console.log("PASS: live session/role/origin/body guards, cross-category/draft isolation, private files and active-Teknisi notification fanout")

    const priorities = await json("/api/teknisi/priorities")
    const room = priorities.items.find((r: { id: string }) => r.id === masterLocations[0].id)
    const expected = await pool.query("select count(*)::integer as count from reports r where r.category='fasilitas' and r.handler_role='teknisi' and r.status not in ('selesai','ditolak') and r.location_id=$1 and exists(select 1 from report_facility_objects o where o.report_id=r.id and o.object_id is not null)", [masterLocations[0].id])
    assert.equal(room.activeReports, expected.rows[0].count, "Room counts distinct tickets, not object joins")
    assert.ok(!priorities.items.some((r: { room: string }) => r.room === `Lokasi uji ${tag}`))
    const search = await json(`/api/teknisi/reports?q=${tag}`)
    assert.equal(search.total, 3); assert.ok(search.items.some((r: { id: string }) => r.id === unknown.id))
    const objectSearch = await json(`/api/teknisi/reports?q=${encodeURIComponent(masterObjects[0].name)}`)
    assert.equal(objectSearch.items.filter((r: { id: string }) => r.id === item.id).length, 1)
    assert.equal((await command({ ticket: item.ticketNumber, status: "diproses" })).status, 409)
    for (const status of ["selesai", "ditolak"]) assert.equal((await command({ ticket: item.ticketNumber, status, note: " " })).status, 400)
    const accept = { ticket: item.ticketNumber, status: "diverifikasi", actorId: userIds[0], actorName: "Impersonated" }
    const concurrent = await Promise.all([command(accept), command(accept, cookies[2])])
    assert.deepEqual(concurrent.map((r) => r.status).sort(), [200, 409])
    const verified = await db.select().from(reportStatusHistory).where(and(eq(reportStatusHistory.reportId, item.id), eq(reportStatusHistory.toStatus, "diverifikasi")))
    assert.equal(verified.length, 1); assert.ok([userIds[1], userIds[2]].includes(verified[0].actorId)); assert.equal(verified[0].actorName, "Akun uji teknisi")
    assert.equal((await command({ ticket: item.ticketNumber, status: "ditolak", note: "Invalid" })).status, 409)
    assert.equal((await command({ ticket: item.ticketNumber, status: "diproses" })).status, 200)
    assert.equal((await command({ ticket: item.ticketNumber, status: "selesai", note: "Lampu diganti dan diuji." })).status, 200)
    assert.equal((await command({ ticket: item.ticketNumber, status: "diproses" })).status, 409)
    assert.equal((await command({ ticket: reject.ticketNumber, status: "ditolak", note: "Lokasi perlu dikonfirmasi ulang." })).status, 200)
    const completed = await json(`/api/teknisi/history?q=${tag}&period=hari-ini`)
    assert.equal(completed.total, 1); assert.equal(completed.items[0].id, item.id); assert.equal(completed.items[0].completionNote, "Lampu diganti dan diuji."); assert.ok(completed.items[0].completedAt)
    const finalDetail = await json(`/api/teknisi/reports/${item.ticketNumber}`)
    assert.deepEqual(finalDetail.history.map((event: { status: string }) => event.status), ["Baru", "Diverifikasi", "Diproses", "Selesai"])
    const reporterNotifications = await json("/api/pelapor/notifications", cookies[0])
    assert.ok(reporterNotifications.items.some((n: { ticketNumber: string; description: string }) => n.ticketNumber === item.ticketNumber && n.description.includes("Lampu diganti")))
    console.log("PASS: unique multi-object aggregation, sequential lifecycle, concurrent one-winner conflict, server actor identity, required completion/rejection notes and Pelapor visibility")

    const sameTimestamp = new Date()
    const pages = Array.from({ length: 25 }, (_, index) => ({ id: randomUUID(), ticketNumber: `LJ-2098-${randomInt(100000000000, 999999999999)}`, submissionKey: randomUUID(), reporterId: userIds[0], category: "fasilitas" as const, handlerRole: "teknisi" as const, title: `Page ${tag} ${index === 0 ? "%_" : index}`, description: "Pagination fixture.", incidentDate: getTodayInWib(), incidentTime: "09:00", locationId: masterLocations[1].id, locationText: masterLocations[1].name, submittedAt: sameTimestamp }))
    reportIds.push(...pages.map((r) => r.id)); await db.insert(reports).values(pages)
    await db.insert(reportFacilityObjects).values(pages.flatMap((r) => masterObjects.map((object) => ({ reportId: r.id, objectId: object.id, objectText: object.name }))))
    for (const sort of ["terbaru", "terlama"]) {
      const path = `/api/teknisi/reports?q=${encodeURIComponent(`Page ${tag}`)}&sort=${sort}`
      const first = await json(path); assert.equal(first.items.length, 20); assert.equal(first.total, 25); assert.ok(first.nextCursor)
      const second = await json(`${path}&cursor=${encodeURIComponent(first.nextCursor)}`)
      assert.equal(second.items.length, 5); assert.equal(second.nextCursor, null)
      const ids = [...first.items, ...second.items].map((r: { id: string }) => r.id)
      assert.equal(new Set(ids).size, 25)
      assert.deepEqual(ids, pages.map((r) => r.id).sort().map((id, i, sorted) => sort === "terlama" ? id : sorted[sorted.length - 1 - i]))
    }
    assert.equal((await json(`/api/teknisi/reports?q=${encodeURIComponent(`Page ${tag} %_`)}`)).total, 1, "Literal wildcard search")
    assert.equal((await json(`/api/teknisi/reports?q=${encodeURIComponent(`Page ${tag}`)}&period=hari-ini`)).total, 25)
    // Older submission, but completion remains today: history periods follow completed_at.
    await db.update(reports).set({ submittedAt: new Date(Date.now() - 40 * 86400000) }).where(eq(reports.id, item.id))
    assert.equal((await json(`/api/teknisi/history?q=${tag}&period=hari-ini`)).total, 1)
    for (const suffix of ["sort=asc", "status=diserahkan", "period=besok", "cursor=bad", "classified=true"]) assert.equal((await request(`/api/teknisi/reports?${suffix}`, cookies[1])).status, 400)
    const inbox = await json("/api/teknisi/notifications")
    const n = inbox.items.find((entry: { ticketNumber: string }) => entry.ticketNumber === item.ticketNumber)
    assert.ok(n)
    const mark = (id: string) => request("/api/teknisi/notifications", cookies[1], { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) })
    const otherInbox = await json("/api/teknisi/notifications", cookies[2])
    const foreign = otherInbox.items[0].id
    assert.equal((await mark(foreign)).status, 200)
    const [unchanged] = await db.select().from(notifications).where(eq(notifications.id, foreign)); assert.equal(unchanged.readAt, null)
    assert.equal((await mark(n.id)).status, 200)
    const [read] = await db.select().from(notifications).where(eq(notifications.id, n.id)); assert.ok(read.readAt)
    await db.update(users).set({ isActive: false }).where(eq(users.id, userIds[2]))
    assert.equal((await command({ ticket: unknown.ticketNumber, status: "diverifikasi" }, cookies[2])).status, 401)
    const late = await submit({ title: `Inactive recipient ${tag}` }) as typeof item
    const lateNotifications = await db.select().from(notifications).where(and(eq(notifications.reportId, late.id), inArray(notifications.recipientId, userIds.slice(1))))
    assert.deepEqual(lateNotifications.map((entry) => entry.recipientId), [userIds[1]], "Inactive Teknisi must not receive new queue notifications")
    await db.insert(notifications).values(pages.map((report) => ({ reportId: report.id, recipientId: userIds[1], kind: "status", title: "Notifikasi pengujian", description: tag, createdAt: sameTimestamp })))
    const firstInbox = await json("/api/teknisi/notifications")
    assert.equal(firstInbox.items.length, 20); assert.ok(firstInbox.nextCursor)
    const secondInbox = await json(`/api/teknisi/notifications?cursor=${encodeURIComponent(firstInbox.nextCursor)}`)
    assert.equal(secondInbox.nextCursor, null)
    assert.equal(new Set([...firstInbox.items, ...secondInbox.items].map((entry: { id: string }) => entry.id)).size, firstInbox.items.length + secondInbox.items.length)
    console.log("PASS: ASC/DESC keyset pagination with timestamp ties, literal search, WIB submission/completion periods, recipient ownership and account deactivation")

    const indexes = await pool.query("select indexname from pg_indexes where schemaname='public' and tablename='reports'")
    for (const name of ["reports_handler_status_date_idx", "reports_handler_date_idx", "reports_handler_completed_idx", "reports_location_active_idx"]) assert.ok(indexes.rows.some((r) => r.indexname === name), name)
    const explain = await pool.query("explain (analyze, buffers, format json) select id from reports where handler_role='teknisi' and category='fasilitas' and status='selesai' and completed_at is not null order by completed_at desc, id desc limit 21")
    assert.ok(explain.rows[0]["QUERY PLAN"][0].Plan)
    for (const path of ["/teknisi/dashboard", "/teknisi/laporan-fasilitas", "/teknisi/riwayat", "/teknisi/notifikasi"]) assert.equal((await request(path, cookies[1])).status, 200, path)
    console.log("PASS: migrated indexes, EXPLAIN ANALYZE execution and four authenticated Teknisi server pages")
    console.log("Teknisi backend smoke passed.")
  } finally {
    try {
      const files = userIds.length ? await db.select({ key: reportAttachments.storageKey }).from(reportAttachments).where(inArray(reportAttachments.ownerId, userIds)) : []
      if (draftIds.length) await db.delete(reportDrafts).where(inArray(reportDrafts.id, draftIds))
      if (reportIds.length) await db.delete(reports).where(inArray(reports.id, reportIds))
      if (userIds.length) await db.delete(users).where(inArray(users.id, userIds))
      const root = resolve(process.env.REPORT_UPLOAD_DIR!)
      for (const file of files) {
        if (!/^[0-9a-f-]{36}$/.test(file.key)) throw new Error("Unexpected disposable storage key.")
        await unlink(join(root, file.key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error })
      }
      console.log("Disposable Teknisi test accounts, reports, drafts and files cleaned; existing data preserved.")
    } finally { await pool.end() }
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Teknisi smoke failed."); process.exitCode = 1 })
