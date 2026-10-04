import "dotenv/config"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { eq, inArray, or } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { createDatabaseClient } from "../src/db/client"
import { accounts, users, reports, reportDrafts, reportAttachments, reportLostFoundDetails, reportStatusHistory, notifications, securityOfficers, lostFoundMatches, reportHandovers } from "../src/db/schema"
import { emptyReportPayload, type ReportPayload } from "../src/features/reports/domain/report"
import { getTodayInWib } from "../src/features/reports/domain/report-date"

// HTTP only. Exact disposable IDs are cleaned in finally; no real account or report is modified.
async function main() {
  const origin = process.env.BETTER_AUTH_URL, password = process.env.DEMO_USER_PASSWORD
  const connect = process.env.REPORT_SMOKE_CONNECT_URL || origin
  if (process.env.NODE_ENV !== "development" || !origin || !connect || !password || !process.env.REPORT_UPLOAD_DIR || ![origin, connect].every((value) => ["localhost", "127.0.0.1", "[::1]"].includes(new URL(value).hostname))) throw new Error("Run Satpam smoke inside the local development app with a demo password and private storage configured.")
  const { pool, db } = createDatabaseClient("migration")
  const userIds: string[] = [], reportIds: string[] = [], draftIds: string[] = [], officerIds: string[] = [], cookies: string[] = []
  const tag = randomUUID()
  const request = (path: string, cookie?: string, init?: RequestInit) => fetch(new URL(path, connect), { ...init, redirect: "manual", headers: { Origin: origin, ...(cookie ? { Cookie: cookie } : {}), ...init?.headers } })
  const command = (body: unknown, cookie = cookies[1], headers?: HeadersInit) => request("/api/satpam/reports", cookie, { method: "POST", headers: { "Content-Type": "application/json", ...headers }, body: JSON.stringify(body) })
  async function submit(kind: "Kehilangan" | "Temuan", withFile = false, category: ReportPayload["category"] = "kehilangan-temuan", draft = false) {
    const id = randomUUID(); draftIds.push(id)
    const payload: ReportPayload = { ...emptyReportPayload, category, title: `Satpam smoke ${tag} ${kind}`, description: "Laporan sementara pengujian Satpam.", incidentDate: getTodayInWib(), incidentTime: "09:00", location: "Lobi JTI", reportType: kind, itemName: "Dompet", itemDetails: "Hitam %_", otherCategory: "Pengujian" }
    const form = new FormData(); form.set("data", JSON.stringify({ id, revision: 0, payload, retainedAttachmentIds: [] }))
    if (withFile) form.append("files", new Blob(["%PDF-1.7\n%%EOF"], { type: "application/pdf" }), "smoke.pdf")
    const response = await request(draft ? "/api/pelapor/drafts" : "/api/pelapor/reports", cookies[0], { method: "POST", body: form })
    assert.equal(response.status, 200, "Pelapor submission")
    const data = await response.json()
    if (draft) return data.draft as { id: string; attachments: { id: string }[] }
    reportIds.push(data.report.id)
    return data.report as { id: string; ticketNumber: string }
  }
  try {
    for (const role of ["pelapor", "satpam", "satpam", "teknisi"] as const) {
      const id = randomUUID(); userIds.push(id)
      const email = `satpam-smoke-${id}@example.test`
      await db.insert(users).values({ id, email, name: `Akun uji ${role}`, identifier: `TEST-${id}`, role })
      await db.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: await hashPassword(password) })
      const response = await request("/api/auth/sign-in/email", undefined, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) })
      assert.equal(response.status, 200)
      cookies.push(response.headers.getSetCookie().map((cookie) => cookie.split(";")[0]).join("; "))
    }
    for (const name of ["Petugas uji pertama", "Petugas uji kedua", "Petugas uji nonaktif"]) {
      const id = randomUUID(); officerIds.push(id)
      await db.insert(securityOfficers).values({ id, name, isActive: officerIds.length !== 3 })
    }
    assert.equal((await request("/api/satpam/reports")).status, 401)
    for (const cookie of [cookies[0], cookies[3]]) assert.equal((await request("/api/satpam/reports", cookie)).status, 403)
    assert.equal((await command({}, cookies[1], { Origin: "https://untrusted.example.test" })).status, 403)
    assert.equal((await command({ type: "status", ticket: "bad", status: "selesai" })).status, 400)

    const loss = await submit("Kehilangan", true) as { id: string; ticketNumber: string }
    const found = await submit("Temuan") as { id: string; ticketNumber: string }
    const secondFound = await submit("Temuan") as { id: string; ticketNumber: string }
    const other = await submit("Kehilangan", false, "lainnya") as { id: string; ticketNumber: string }
    const draft = await submit("Kehilangan", true, "kehilangan-temuan", true) as { id: string; attachments: { id: string }[] }
    assert.equal((await request(`/api/satpam/reports/${other.ticketNumber}`, cookies[1])).status, 404)
    assert.equal((await command({ type: "status", ticket: other.ticketNumber, status: "diverifikasi" })).status, 404)
    assert.equal((await request(`/api/satpam/attachments/${draft.attachments[0].id}`, cookies[1])).status, 404)
    const detail = await (await request(`/api/satpam/reports/${loss.ticketNumber}`, cookies[1])).json()
    assert.equal(detail.files.length, 1)
    const download = await request(detail.files[0].url, cookies[1]); assert.equal(download.status, 200); assert.equal(await download.text(), "%PDF-1.7\n%%EOF")
    assert.equal((await request(detail.files[0].url, cookies[0])).status, 403)
    const initialNotifications = await (await request("/api/satpam/notifications", cookies[1])).json()
    assert.ok(initialNotifications.items.some((n: { ticketNumber: string }) => n.ticketNumber === loss.ticketNumber))
    console.log("PASS: session/role/origin guards, category scope, private attachments, draft isolation and incoming notifications")

    assert.equal((await command({ type: "status", ticket: loss.ticketNumber, status: "diproses" })).status, 409)
    const accept = { type: "status", ticket: loss.ticketNumber, status: "diverifikasi" }
    const attempts = await Promise.all([command(accept), command(accept, cookies[2])])
    assert.deepEqual(attempts.map((r) => r.status).sort(), [200, 409])
    assert.equal((await command({ type: "status", ticket: loss.ticketNumber, status: "ditolak", note: "Tidak valid" })).status, 409)
    assert.equal((await command({ type: "status", ticket: loss.ticketNumber, status: "diserahkan" })).status, 400)
    assert.equal((await command({ type: "match", lossTicket: loss.ticketNumber, foundTicket: found.ticketNumber })).status, 409)
    for (const report of [found, secondFound]) assert.equal((await command({ type: "status", ticket: report.ticketNumber, status: "diverifikasi" })).status, 200)
    for (const report of [loss, found, secondFound]) assert.equal((await command({ type: "status", ticket: report.ticketNumber, status: "diproses" })).status, 200)
    assert.equal((await command({ type: "match", lossTicket: found.ticketNumber, foundTicket: loss.ticketNumber })).status, 400)
    const pairs = await Promise.all([command({ type: "match", lossTicket: loss.ticketNumber, foundTicket: found.ticketNumber }), command({ type: "match", lossTicket: loss.ticketNumber, foundTicket: secondFound.ticketNumber }, cookies[2])])
    assert.deepEqual(pairs.map((r) => r.status).sort(), [200, 409])
    const [pair] = await db.select().from(lostFoundMatches).where(eq(lostFoundMatches.lossReportId, loss.id))
    assert.ok(pair)
    const pairRows = await db.select().from(reports).where(inArray(reports.id, [pair.lossReportId, pair.foundReportId]))
    assert.ok(pairRows.every((r) => r.status === "barang_teridentifikasi"))
    console.log("PASS: sequential lifecycle, concurrent status conflict and crossed matching (one winner, no partial pair)")

    const handover = { type: "handover", matchId: pair.id, officerId: officerIds[0], recipient: "Penerima uji", location: "Pos Satpam", note: "Identitas diperiksa.", officerName: "Nama palsu", actorId: userIds[0] }
    assert.equal((await command({ ...handover, officerId: undefined })).status, 400)
    assert.equal((await command({ ...handover, officerId: officerIds[2] })).status, 400)
    assert.equal((await command({ ...handover, officerId: randomUUID() })).status, 400)
    assert.ok((await db.select().from(reports).where(inArray(reports.id, [pair.lossReportId, pair.foundReportId]))).every((r) => r.status === "barang_teridentifikasi"))
    const handoverAttempts = await Promise.all([command(handover), command({ ...handover, officerId: officerIds[1] }, cookies[2])])
    assert.deepEqual(handoverAttempts.map((r) => r.status).sort(), [200, 409])
    const recorded = await db.select().from(reportHandovers).where(eq(reportHandovers.matchId, pair.id))
    assert.equal(recorded.length, 1)
    assert.ok([userIds[1], userIds[2]].includes(recorded[0].actorId))
    const winningOfficer = recorded[0].officerId, snapshotName = recorded[0].officerName
    assert.ok(["Petugas uji pertama", "Petugas uji kedua"].includes(snapshotName))
    await db.update(securityOfficers).set({ name: "Petugas uji diubah", isActive: false }).where(eq(securityOfficers.id, winningOfficer))
    const history = await (await request(`/api/satpam/history?officerId=${winningOfficer}`, cookies[1])).json()
    assert.equal(history.items[0].handler, snapshotName); assert.equal(history.items[0].status, "Diserahkan")
    const both = await db.select().from(reports).where(inArray(reports.id, [pair.lossReportId, pair.foundReportId]))
    assert.ok(both.every((r) => r.status === "diserahkan" && r.completedAt === null))
    const events = await db.select().from(reportStatusHistory).where(inArray(reportStatusHistory.reportId, both.map((r) => r.id)))
    assert.equal(events.filter((event) => event.toStatus === "diserahkan").length, 2)
    assert.ok(events.filter((event) => event.toStatus === "diserahkan").every((event) => event.note.includes(snapshotName)))
    assert.equal((await command({ type: "status", ticket: loss.ticketNumber, status: "selesai" })).status, 200)
    const closed = await db.select().from(reports).where(inArray(reports.id, both.map((r) => r.id)))
    assert.ok(closed.every((r) => r.status === "selesai" && r.completedAt !== null))
    assert.equal((await command({ type: "status", ticket: loss.ticketNumber, status: "selesai" })).status, 409)
    const pelaporDetail = await (await request(`/api/pelapor/reports/${loss.id}`, cookies[0])).json()
    assert.equal(pelaporDetail.status, "selesai")
    assert.ok(pelaporDetail.history.some((h: { note: string }) => h.note.includes(snapshotName)))
    console.log("PASS: required active officer, server-resolved identity snapshots, single handover, audit history and atomic pair completion visible to Pelapor")

    const n = initialNotifications.items.find((item: { ticketNumber: string }) => item.ticketNumber === loss.ticketNumber)
    const read = (body: unknown, cookie: string) => request("/api/satpam/notifications", cookie, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
    assert.equal((await read({ id: n.id }, cookies[2])).status, 200)
    assert.equal((await db.select().from(notifications).where(eq(notifications.id, n.id)))[0].readAt, null)
    assert.equal((await read({ id: n.id }, cookies[1])).status, 200)
    assert.ok((await db.select().from(notifications).where(eq(notifications.id, n.id)))[0].readAt)

    const prefix = Date.now().toString().slice(-9)
    const fixtureRows = Array.from({ length: 25 }, (_, i) => ({ id: randomUUID(), submissionKey: randomUUID(), reporterId: userIds[0], ticketNumber: `LJ-2099-${prefix}${String(i).padStart(2, "0")}`, title: `Pagination ${tag} ${i}`, description: "Fixture", category: "kehilangan-temuan" as const, handlerRole: "satpam" as const, incidentDate: getTodayInWib(), incidentTime: "09:00", locationText: "Lobi", submittedAt: new Date("2000-01-01T00:00:00Z") }))
    reportIds.push(...fixtureRows.map((r) => r.id))
    await db.insert(reports).values(fixtureRows)
    await db.insert(reportLostFoundDetails).values(fixtureRows.map((r) => ({ reportId: r.id, kind: "kehilangan", itemName: "Uji", itemDetails: "Literal %_" })))
    const pageUrl = `/api/satpam/reports?q=${encodeURIComponent(`Pagination ${tag}`)}&kind=kehilangan`
    const first = await (await request(pageUrl, cookies[1])).json(); assert.equal(first.items.length, 20); assert.equal(first.total, 25); assert.ok(first.nextCursor)
    const second = await (await request(`${pageUrl}&cursor=${encodeURIComponent(first.nextCursor)}`, cookies[1])).json(); assert.equal(second.items.length, 5)
    assert.equal(new Set([...first.items, ...second.items].map((item: { id: string }) => item.id)).size, 25)
    const oldest = await (await request(`${pageUrl}&sort=terlama`, cookies[1])).json()
    assert.equal(oldest.items.length, 20); assert.equal(oldest.total, 25); assert.ok(oldest.nextCursor)
    const oldestNext = await (await request(`${pageUrl}&sort=terlama&cursor=${encodeURIComponent(oldest.nextCursor)}`, cookies[1])).json()
    assert.equal(oldestNext.items.length, 5); assert.equal(oldestNext.nextCursor, null)
    const oldestIds = [...oldest.items, ...oldestNext.items].map((item: { id: string }) => item.id)
    assert.deepEqual(oldestIds, fixtureRows.map((row) => row.id).sort())
    assert.deepEqual([...first.items, ...second.items].map((item: { id: string }) => item.id), [...oldestIds].reverse())

    // Exact calendar boundaries, deliberately different from the incident date.
    const dayMs = 86_400_000, start = new Date(`${getTodayInWib()}T00:00:00+07:00`).getTime()
    const timestamps = [start - 29 * dayMs - 1, start - 29 * dayMs, start - 6 * dayMs - 1, start - 6 * dayMs, start - 1, start, start + dayMs - 1, start + dayMs]
    const periodRows = ["kehilangan", "temuan"].flatMap((kind, kindIndex) => timestamps.map((time, i) => ({ ...fixtureRows[0], id: randomUUID(), submissionKey: randomUUID(), ticketNumber: `LJ-2099-${prefix}${String(25 + kindIndex * timestamps.length + i).padStart(2, "0")}`, title: `Period ${tag} ${kind} ${i}`, status: i === 5 ? "diverifikasi" as const : "baru" as const, submittedAt: new Date(time) })))
    reportIds.push(...periodRows.map((row) => row.id))
    await db.insert(reports).values(periodRows)
    await db.insert(reportLostFoundDetails).values(periodRows.map((row, i) => ({ reportId: row.id, kind: i < timestamps.length ? "kehilangan" : "temuan", itemName: "Uji periode", itemDetails: "Batas kalender WIB" })))
    for (const kind of ["kehilangan", "temuan"]) {
      const url = `/api/satpam/reports?q=${encodeURIComponent(`Period ${tag}`)}&kind=${kind}`
      const kindRows = periodRows.filter((row) => row.title.includes(kind))
      const newest = await (await request(url, cookies[1])).json()
      assert.deepEqual(newest.items.map((item: { id: string }) => item.id), kindRows.map((row) => row.id).reverse())
      for (const [period, from] of [["hari-ini", start], ["7-hari", start - 6 * dayMs], ["30-hari", start - 29 * dayMs]] as const) {
        const expected = kindRows.filter((row) => row.submittedAt.getTime() >= from && row.submittedAt.getTime() < start + dayMs).map((row) => row.id)
        for (const sort of ["terbaru", "terlama"]) {
          const result = await (await request(`${url}&period=${period}&sort=${sort}`, cookies[1])).json()
          assert.equal(result.total, expected.length)
          assert.deepEqual(result.items.map((item: { id: string }) => item.id), sort === "terlama" ? expected : [...expected].reverse())
        }
      }
      const filtered = await (await request(`${url}&period=hari-ini&status=diverifikasi`, cookies[1])).json()
      assert.equal(filtered.total, 1); assert.equal(filtered.items[0].status, "Diverifikasi")
    }
    const literal = await (await request(`/api/satpam/reports?q=${encodeURIComponent("%_")}`, cookies[1])).json(); assert.ok(literal.items.every((r: { characteristics: string }) => r.characteristics.includes("%_")))
    assert.equal((await request("/api/satpam/reports?cursor=bad", cookies[1])).status, 400)
    assert.equal((await request("/api/satpam/reports?sort=bad", cookies[1])).status, 400)
    assert.equal((await request("/api/satpam/reports?period=besok", cookies[1])).status, 400)
    assert.equal((await request("/api/satpam/history?from=2026-02-30", cookies[1])).status, 400)
    console.log("PASS: scoped notification read, escaped search, ASC/DESC keyset pagination, both report kinds' WIB periods and filter validation")
    for (const path of ["/satpam/dashboard", "/satpam/kehilangan-temuan", "/satpam/riwayat", "/satpam/notifikasi"]) assert.equal((await request(path, cookies[1])).status, 200)
    console.log("Satpam backend smoke passed.")
  } finally {
    try {
      const files = userIds.length ? await db.select({ key: reportAttachments.storageKey }).from(reportAttachments).where(inArray(reportAttachments.ownerId, userIds)) : []
      if (reportIds.length) {
        const matches = await db.select({ id: lostFoundMatches.id }).from(lostFoundMatches).where(or(inArray(lostFoundMatches.lossReportId, reportIds), inArray(lostFoundMatches.foundReportId, reportIds)))
        if (matches.length) { const matchIds = matches.map((m) => m.id); await db.delete(reportHandovers).where(inArray(reportHandovers.matchId, matchIds)); await db.delete(lostFoundMatches).where(inArray(lostFoundMatches.id, matchIds)) }
      }
      if (draftIds.length) await db.delete(reportDrafts).where(inArray(reportDrafts.id, draftIds))
      if (reportIds.length) await db.delete(reports).where(inArray(reports.id, reportIds))
      if (officerIds.length) await db.delete(securityOfficers).where(inArray(securityOfficers.id, officerIds))
      if (userIds.length) await db.delete(users).where(inArray(users.id, userIds))
      const root = resolve(process.env.REPORT_UPLOAD_DIR!)
      for (const file of files) {
        if (!/^[0-9a-f-]{36}$/.test(file.key)) throw new Error("Unexpected test storage key.")
        await unlink(join(root, file.key)).catch((error: NodeJS.ErrnoException) => { if (error.code !== "ENOENT") throw error })
      }
      console.log("Disposable Satpam smoke accounts, reports, officers and files cleaned.")
    } finally { await pool.end() }
  }
}
main().catch((error: unknown) => { console.error(error instanceof Error ? error.message : "Satpam smoke failed."); process.exitCode = 1 })
