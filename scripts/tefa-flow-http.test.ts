import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { and, eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { users, accounts, sessions, reports, reportDrafts, reportStatusHistory, notifications, services } from "../src/db/schema"
import { emptyReportPayload } from "../src/features/reports/domain/report"

test("Live Pelapor -> TEFA -> Pelapor/Monitoring flow and concurrent transitions", { skip: process.env.NODE_ENV !== "development" ? "Requires running local app and local development PostgreSQL" : false }, async () => {
  const origin = new URL(process.env.BETTER_AUTH_URL!)
  const hosts = ["localhost", "127.0.0.1", "[::1]"]
  assert.ok(hosts.includes(origin.hostname) && hosts.includes(new URL(getDatabaseUrl("application")).hostname))
  const { db, pool } = createDatabaseClient()
  const run = randomUUID(), password = `Flow-test-${randomUUID()}`
  const actors = new Map<string, { id: string; email: string; cookie: string }>()
  const request = (role: string, path: string, body?: object | FormData, requestOrigin = origin.origin) => fetch(new URL(path, origin), { method: body === undefined ? "GET" : "POST", redirect: "manual", headers: { Origin: requestOrigin, Cookie: actors.get(role)?.cookie ?? "", ...(body && !(body instanceof FormData) ? { "Content-Type": "application/json" } : {}) }, body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined })
  try {
    const passwordHash = await hashPassword(password)
    await db.transaction(async (tx) => {
      for (const role of ["pelapor", "manajemen", "tefa"] as const) {
        const id = randomUUID(), email = `${role}-${run}@example.invalid`
        actors.set(role, { id, email, cookie: "" })
        await tx.insert(users).values({ id, name: `Flow ${role} ${run}`, email, role, isActive: true })
        await tx.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: passwordHash })
      }
    })
    for (const [role, actor] of actors) {
      const login = await request(role, "/api/auth/sign-in/email", { email: actor.email, password })
      assert.equal(login.status, 200)
      actor.cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ")
    }
    const [jti] = await db.select().from(services).where(eq(services.id, "service-1"))
    assert.equal(jti.handlerRole, "tefa")
    const payload = { ...emptyReportPayload, category: "layanan", service: jti.name, title: `TEFA HTTP ${run}`, description: "HTTP integration fixture", program: "TIF", location: "Loket fixture", incidentTimeMode: "automatic" }
    async function submit(service: string) {
      const id = randomUUID(), body = new FormData()
      body.set("data", JSON.stringify({ id, revision: 0, payload: { ...payload, service, handlerRole: "manajemen" } }))
      const response = await request("pelapor", "/api/pelapor/reports", body)
      assert.equal(response.status, 200)
      const result = await response.json()
      return { result, body }
    }
    const own = await submit(jti.name), foreign = await submit("Administrasi")
    const report = own.result.report, other = foreign.result.report
    const retry = await request("pelapor", "/api/pelapor/reports", own.body)
    assert.equal((await retry.json()).report.id, report.id, "Submission retry is idempotent")
    const list = await request("tefa", `/api/tefa/reports?q=${run}`)
    assert.match(list.headers.get("cache-control") ?? "", /no-store/)
    const page = await list.json()
    assert.equal(page.total, 1)
    assert.equal(page.items[0].id, report.id)
    const dashboard = await request("tefa", "/api/tefa/dashboard")
    assert.equal(dashboard.status, 200)
    assert.ok((await dashboard.json()).services.some((row: { id: string }) => row.id === jti.id))
    assert.equal((await request("tefa", "/tefa/notifikasi")).status, 200)
    assert.equal((await request("manajemen", `/api/manajemen/reports/${report.ticketNumber}`)).status, 404)
    assert.equal((await request("manajemen", `/api/manajemen/monitoring/${report.ticketNumber}`)).status, 200)
    assert.equal((await request("tefa", `/api/tefa/reports/${other.ticketNumber}`)).status, 404)
    assert.equal((await request("tefa", "/api/tefa/reports", { ticket: other.ticketNumber, status: "diproses" })).status, 404)
    assert.equal((await request("manajemen", "/api/tefa/reports")).status, 403)
    assert.equal((await request("tefa", "/api/tefa/reports", { ticket: report.ticketNumber, status: "diproses" }, "https://untrusted.example.invalid")).status, 403)
    const concurrent = await Promise.all([1, 2].map(() => request("tefa", "/api/tefa/reports", { ticket: report.ticketNumber, status: "diproses", actorId: actors.get("manajemen")!.id })))
    assert.deepEqual(concurrent.map((response) => response.status).sort(), [200, 409])
    assert.equal((await db.select().from(reportStatusHistory).where(and(eq(reportStatusHistory.reportId, report.id), eq(reportStatusHistory.toStatus, "diproses")))).length, 1)
    assert.equal((await request("tefa", "/api/tefa/reports", { ticket: report.ticketNumber, status: "selesai", note: " " })).status, 400)
    assert.equal((await request("tefa", "/api/tefa/reports", { ticket: report.ticketNumber, status: "selesai", note: "Kendala teratasi." })).status, 200)
    assert.equal((await (await request("tefa", `/api/tefa/reports?view=history&q=${run}`)).json()).total, 1)
    const [complete] = await db.select().from(reports).where(eq(reports.id, report.id))
    assert.equal(complete.status, "selesai"); assert.ok(complete.completedAt)
    const history = await db.select().from(reportStatusHistory).where(eq(reportStatusHistory.reportId, report.id))
    assert.equal(history.length, 3)
    assert.equal(history.filter((entry) => entry.actorId === actors.get("tefa")!.id).length, 2)
    assert.equal((await db.select().from(notifications).where(and(eq(notifications.reportId, report.id), eq(notifications.recipientId, actors.get("pelapor")!.id)))).length, 3, "One notification for submission and each committed transition")
    assert.equal((await (await request("pelapor", `/api/pelapor/reports/${report.id}`)).json()).history.length, 3)
    assert.ok((await (await request("tefa", "/api/tefa/notifications")).json()).items.some((entry: { reportTitle: string }) => entry.reportTitle === payload.title))
    const read = await fetch(new URL("/api/tefa/notifications", origin), { method: "PATCH", headers: { Origin: origin.origin, Cookie: actors.get("tefa")!.cookie, "Content-Type": "application/json" }, body: JSON.stringify({ all: true }) })
    assert.equal(read.status, 200)
    assert.equal((await (await request("tefa", "/api/tefa/notifications")).json()).unread, 0)
  } finally {
    const ids = [...actors.values()].map((actor) => actor.id)
    try {
      if (ids.length) await db.transaction(async (tx) => {
        await tx.delete(reportDrafts).where(inArray(reportDrafts.reporterId, ids))
        await tx.delete(reports).where(inArray(reports.reporterId, ids))
        await tx.delete(sessions).where(inArray(sessions.userId, ids))
        await tx.delete(accounts).where(inArray(accounts.userId, ids))
        await tx.delete(users).where(inArray(users.id, ids))
      })
      if (ids.length) assert.equal((await db.select().from(users).where(inArray(users.id, ids))).length, 0)
      assert.equal((await db.select().from(notifications).where(inArray(notifications.recipientId, ids.length ? ids : [randomUUID()]))).length, 0)
    } finally { await pool.end() }
  }
})
