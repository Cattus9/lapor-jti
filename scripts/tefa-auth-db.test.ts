import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { eq } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { getDatabaseUrl } from "../src/db/environment"
import { accounts, sessions, users } from "../src/db/schema"
import { createAuth } from "../src/lib/auth/auth"
import { OperationsRepository } from "../src/features/operations/infrastructure/operations-repository"

test("TEFA provisioning, Better Auth login/logout, session revocation and manager-only administration on PostgreSQL", {
  skip: process.env.NODE_ENV !== "development" ? "Requires explicit development environment and local PostgreSQL" : false,
}, async () => {
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(new URL(getDatabaseUrl("application")).hostname), "Local development database only")
  const { db, pool } = createDatabaseClient()
  const managerId = randomUUID()
  const email = `tefa-test-${managerId}@example.invalid`
  const password = `Tefa-test-${randomUUID()}`
  const rollback = Symbol("rollback-tefa-auth")
  try {
    try {
      await db.transaction(async (tx) => {
        await tx.insert(users).values({ id: managerId, name: "TEFA Auth Test Manager", email: `manager-${managerId}@example.invalid`, role: "manajemen", isActive: true })
        const repository = new OperationsRepository(tx as unknown as ConstructorParameters<typeof OperationsRepository>[0])
        const manager = { id: managerId, role: "manajemen" }
        const created = await repository.saveUser(manager, { name: "TEFA Test Account", email, password, role: "tefa", isActive: true })
        assert.equal(created.user.role, "tefa")
        const [credential] = await tx.select().from(accounts).where(eq(accounts.userId, created.user.id))
        assert.equal(credential.providerId, "credential")
        assert.ok(credential.password && credential.password !== password)
        const auth = createAuth(tx as unknown as Parameters<typeof createAuth>[0])
        const origin = process.env.BETTER_AUTH_URL!
        const signIn = () => auth.api.signInEmail({ body: { email, password }, headers: new Headers({ Origin: origin }), asResponse: true })
        const response = await signIn()
        assert.equal(response.status, 200)
        const cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ")
        assert.ok(cookie)
        assert.ok(response.headers.getSetCookie().some((value) => /httponly/i.test(value)))
        const headers = new Headers({ Origin: origin, Cookie: cookie })
        const session = await auth.api.getSession({ headers })
        assert.equal(session?.user.role, "tefa")
        assert.equal(session?.user.id, created.user.id)
        assert.equal((await repository.listUsers(manager, { role: "tefa", q: email })).items[0]?.id, created.user.id)
        await assert.rejects(repository.listUsers({ id: created.user.id, role: "tefa" }, {}), (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 403))
        const forged = await auth.api.updateUser({ headers, body: { role: "manajemen" } as never, asResponse: true })
        assert.ok(forged.status >= 400)
        assert.equal((await auth.api.getSession({ headers }))?.user.role, "tefa")
        const saved = await repository.saveUser(manager, { ...created.user, isActive: false })
        assert.equal((await tx.select().from(sessions).where(eq(sessions.userId, created.user.id))).length, 0)
        assert.equal(await auth.api.getSession({ headers }), null)
        assert.ok((await signIn()).status >= 400, "Inactive TEFA cannot sign in")
        await repository.saveUser(manager, { ...saved.user, isActive: true })
        const second = await signIn()
        assert.equal(second.status, 200)
        const secondHeaders = new Headers({ Origin: origin, Cookie: second.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ") })
        assert.equal((await auth.api.signOut({ headers: secondHeaders, asResponse: true })).status, 200)
        assert.equal(await auth.api.getSession({ headers: secondHeaders }), null)
        throw rollback
      })
    } catch (error) { if (error !== rollback) throw error }
    assert.equal((await db.select().from(users).where(eq(users.id, managerId))).length, 0)
    assert.equal((await db.select().from(users).where(eq(users.email, email))).length, 0, "Successful auth checks must also roll back")
  } finally { await pool.end() }
})
