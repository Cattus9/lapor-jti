import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { execFileSync } from "node:child_process"
import sharp from "sharp"
import { hashPassword } from "better-auth/crypto"
import { eq, inArray } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { accounts, sessions, satpamInventory, users } from "../src/db/schema"

// HTTP/server timing only, not browser automation or an LCP/INP benchmark.
// Optional split base/origin models a production backend behind a TLS reverse proxy.
test("Live TEFA responses and inventory pagination on a local built app", { skip: process.env.NODE_ENV !== "development" ? "Explicit local development environment required" : false }, async () => {
  const origin = new URL(process.env.PERF_TEST_ORIGIN ?? process.env.BETTER_AUTH_URL!)
  const base = new URL(process.env.PERF_TEST_BASE_URL ?? origin.origin)
  for (const url of [origin, base, new URL(getDatabaseUrl())]) assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Local targets only")
  const { db, pool } = createDatabaseClient(), ids = [randomUUID(), randomUUID()], run = randomUUID(), password = `Perf-fixture-${randomUUID()}`
  const container = process.env.PERF_TEST_CONTAINER
  if (container) assert.match(container, /^aspirasijti-perf-[0-9]{8}$/, "Only the temporary performance container may hold test files")
  const photoId = randomUUID(), storageKey = randomUUID()
  let photoCreated = false
  const source = await sharp({ create: { width: 1920, height: 1080, channels: 3, background: "green" } }).jpeg().toBuffer()
  const cookies = new Map<string, string>()
  async function request(path: string, cookie = "", body?: object) {
    const started = performance.now()
    const response = await fetch(new URL(path, base), { redirect: "manual", method: body === undefined ? "GET" : "POST", headers: { Origin: origin.origin, "X-Forwarded-Proto": origin.protocol.slice(0, -1), ...(cookie ? { Cookie: cookie } : {}), ...(body ? { "Content-Type": "application/json" } : {}) }, body: body === undefined ? undefined : JSON.stringify(body) })
    const text = await response.text()
    return { response, text, ms: Math.round(performance.now() - started) }
  }
  try {
    if (container) {
      // A fixture file in our temporary container's private volume, never a user upload.
      execFileSync("docker", ["exec", "-i", container, "node", "-e", 'const fs=require("fs"),path=require("path"); const key=process.argv[1]; if(!/^[0-9a-f-]{36}$/.test(key)||process.env.REPORT_UPLOAD_DIR!=="/app/storage/reports") throw Error("Invalid fixture path"); fs.mkdirSync(process.env.REPORT_UPLOAD_DIR,{recursive:true}); const chunks=[]; process.stdin.on("data",b=>chunks.push(b)); process.stdin.on("end",()=>fs.writeFileSync(path.join(process.env.REPORT_UPLOAD_DIR,key),Buffer.concat(chunks),{flag:"wx",mode:0o600}));', storageKey], { input: source })
      photoCreated = true
    }
    const hash = await hashPassword(password)
    await db.transaction(async (tx) => {
      for (const [index, role] of ["tefa", "satpam"].entries()) {
        await tx.insert(users).values({ id: ids[index], name: "Performance Fixture", email: `${role}-${run}@example.invalid`, role: role as "tefa" | "satpam", isActive: true })
        await tx.insert(accounts).values({ userId: ids[index], accountId: ids[index], providerId: "credential", password: hash })
      }
      await tx.insert(satpamInventory).values(Array.from({ length: 25 }, (_, i) => ({ id: i === 0 ? photoId : randomUUID(), itemName: `${run} ${i}`, registeredBy: ids[1], registeredByName: "Fixture", createdAt: new Date("2026-01-01T00:00:00Z"), ...(i === 0 && container ? { photoStorageKey: storageKey, photoMimeType: "image/jpeg", photoName: "performance-fixture.jpg" } : {}) })))
    })
    assert.equal((await request("/api/satpam/inventory")).response.status, 401)
    for (const role of ["tefa", "satpam"]) {
      const login = await request("/api/auth/sign-in/email", "", { email: `${role}-${run}@example.invalid`, password })
      assert.equal(login.response.status, 200)
      cookies.set(role, login.response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; "))
      assert.ok(cookies.get(role))
    }
    assert.equal((await request("/api/satpam/inventory", cookies.get("tefa"))).response.status, 403)
    const durations: Record<string, number[]> = {}
    for (let i = 0; i < 3; i++) for (const path of ["/tefa/dashboard", "/tefa/laporan", "/api/tefa/dashboard", "/api/tefa/reports?view=reports&status=semua"]) {
      const result = await request(path, cookies.get("tefa"))
      assert.equal(result.response.status, 200, path)
      ;(durations[path] ??= []).push(result.ms)
      if (path.startsWith("/api/")) assert.ok(Array.isArray(JSON.parse(result.text).services))
    }
    console.log(JSON.stringify({ serverTimingMs: durations }))
    const query = new URLSearchParams({ q: run, status: "tersimpan" })
    const first = await request(`/api/satpam/inventory?${query}`, cookies.get("satpam"))
    assert.equal(first.response.status, 200)
    const firstPage = JSON.parse(first.text)
    assert.equal(firstPage.total, 25); assert.equal(firstPage.items.length, 20); assert.ok(firstPage.nextCursor)
    query.set("cursor", firstPage.nextCursor)
    const second = await request(`/api/satpam/inventory?${query}`, cookies.get("satpam"))
    assert.equal(second.response.status, 200)
    const secondPage = JSON.parse(second.text)
    assert.equal(secondPage.items.length, 5); assert.equal(secondPage.total, 25); assert.equal(secondPage.nextCursor, null)
    assert.equal(new Set([...firstPage.items, ...secondPage.items].map((item) => item.id)).size, 25)
    assert.equal((await request("/api/satpam/inventory?cursor=bad", cookies.get("satpam"))).response.status, 400)
    if (container) {
      const path = `/api/satpam/inventory/${photoId}/photo`
      assert.equal((await request(`${path}?preview=1`, cookies.get("tefa"))).response.status, 403)
      for (const preview of [true, true, false]) {
        const response = await fetch(new URL(`${path}${preview ? "?preview=1" : ""}`, base), { headers: { Cookie: cookies.get("satpam")! } })
        assert.equal(response.status, 200)
        assert.equal(response.headers.get("cache-control"), "private, no-store")
        assert.equal(response.headers.get("content-type"), preview ? "image/webp" : "image/jpeg")
        const bytes = Buffer.from(await response.arrayBuffer()), meta = await sharp(bytes).metadata()
        if (preview) { assert.ok(meta.width! <= 640 && meta.height! <= 640); assert.ok(bytes.length < source.length); console.log(`Live private thumbnail: ${source.length} -> ${bytes.length} bytes`) }
        else assert.deepEqual(bytes, source)
      }
    }
  } finally {
    try {
      for (const cookie of cookies.values()) await request("/api/auth/sign-out", cookie, {})
    } finally {
      try {
        await db.transaction(async (tx) => {
          await tx.delete(satpamInventory).where(eq(satpamInventory.registeredBy, ids[1]))
          await tx.delete(sessions).where(inArray(sessions.userId, ids))
          await tx.delete(accounts).where(inArray(accounts.userId, ids))
          await tx.delete(users).where(inArray(users.id, ids))
        })
        assert.equal((await db.select({ id: users.id }).from(users).where(inArray(users.id, ids))).length, 0)
      } finally {
        try {
          if (photoCreated) execFileSync("docker", ["exec", container!, "node", "-e", 'const fs=require("fs"),path=require("path"); const key=process.argv[1]; if(!/^[0-9a-f-]{36}$/.test(key)||process.env.REPORT_UPLOAD_DIR!=="/app/storage/reports") throw Error("Invalid fixture path"); fs.unlinkSync(path.join(process.env.REPORT_UPLOAD_DIR,key));', storageKey])
        } finally { await pool.end() }
      }
    }
  }
})
