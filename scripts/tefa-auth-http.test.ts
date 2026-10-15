import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { hashPassword } from "better-auth/crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { accounts, sessions, users } from "../src/db/schema"

// HTTP authorization checks, not browser/visual automation. HTTP needs committed
// fixtures visible to the app's pool, so clean up only our UUID in finally.
test("Live TEFA routes use the database role/status and reject cross-role APIs", {
  skip: process.env.NODE_ENV !== "development" ? "Requires local running app and explicit development environment" : false,
}, async () => {
  const origin = new URL(process.env.BETTER_AUTH_URL!)
  const localHosts = ["localhost", "127.0.0.1", "[::1]"]
  assert.ok(localHosts.includes(origin.hostname) && localHosts.includes(new URL(getDatabaseUrl("application")).hostname), "Local app and database only")
  const { db, pool } = createDatabaseClient()
  const id = randomUUID(), email = `tefa-http-${id}@example.invalid`, password = `HTTP-fixture-${randomUUID()}`
  let cookie = ""
  const request = (path: string, body?: unknown, requestOrigin = origin.origin) => fetch(new URL(path, origin), {
    method: body === undefined ? "GET" : "POST", redirect: "manual",
    headers: { Origin: requestOrigin, ...(body === undefined ? {} : { "Content-Type": "application/json" }), ...(cookie ? { Cookie: cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  async function redirected(path: string, expected: string) {
    const response = await request(path)
    const location = response.headers.get("location")
    if (location) assert.equal(new URL(location, origin).pathname, expected)
    else assert.ok((await response.text()).includes(`NEXT_REDIRECT;replace;${expected};`), `Expected guard redirect for ${path}`)
  }
  try {
    await redirected("/tefa/dashboard", "/login")
    const passwordHash = await hashPassword(password)
    await db.transaction(async (tx) => {
      await tx.insert(users).values({ id, name: "TEFA HTTP Fixture", email, role: "tefa", isActive: true })
      await tx.insert(accounts).values({ userId: id, accountId: id, providerId: "credential", password: passwordHash })
    })
    const login = await request("/api/auth/sign-in/email", { email, password })
    assert.equal(login.status, 200, "Rebuild the app with TEFA auth configuration before this test")
    cookie = login.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ")
    assert.ok(cookie)
    await redirected("/", "/tefa/dashboard")
    await redirected("/login", "/tefa/dashboard")
    for (const page of ["dashboard", "laporan", "riwayat", "profil"]) assert.equal((await request(`/tefa/${page}`)).status, 200)
    for (const other of ["manajemen", "satpam", "teknisi", "pelapor"]) await redirected(`/${other}/dashboard`, "/tefa/dashboard")
    for (const path of ["/api/manajemen/users", "/api/manajemen/configuration", "/api/manajemen/reports", "/api/satpam/reports", "/api/teknisi/reports", "/api/pelapor/reports"]) assert.equal((await request(path)).status, 403, path)
    assert.equal((await request("/api/auth/sign-out", {}, "https://untrusted.example.invalid")).status, 403)
    // Keep the cookie deliberately: app authorization must not trust a stale role/status.
    await db.update(users).set({ isActive: false }).where(eq(users.id, id))
    await redirected("/tefa/dashboard", "/login")
    await db.update(users).set({ isActive: true, role: "pelapor" }).where(eq(users.id, id))
    await redirected("/tefa/dashboard", "/pelapor/dashboard")
    assert.equal((await request("/api/auth/sign-out", {})).status, 200)
    cookie = ""
    await redirected("/tefa/dashboard", "/login")
  } finally {
    try {
      await db.transaction(async (tx) => {
        await tx.delete(sessions).where(eq(sessions.userId, id))
        await tx.delete(accounts).where(eq(accounts.userId, id))
        await tx.delete(users).where(eq(users.id, id))
      })
      assert.equal((await db.select({ id: users.id }).from(users).where(eq(users.id, id))).length, 0)
    } finally { await pool.end() }
  }
})
