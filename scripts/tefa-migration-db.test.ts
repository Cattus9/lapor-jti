import "dotenv/config"
import test from "node:test"
import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { Pool } from "pg"
import { drizzle } from "drizzle-orm/node-postgres"
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { getDatabaseUrl } from "../src/db/environment"

test("Full migration journal installs TEFA routing on a new disposable local database", { skip: process.env.NODE_ENV !== "development" ? "Requires local migration credentials with CREATE DATABASE" : false }, async () => {
  const url = new URL(getDatabaseUrl("migration"))
  assert.ok(["localhost", "127.0.0.1", "[::1]"].includes(url.hostname), "Local development server only")
  const name = `tefa_migrate_${randomUUID().replaceAll("-", "_")}`
  assert.match(name, /^tefa_migrate_[a-f0-9_]{36}$/)
  assert.notEqual(decodeURIComponent(url.pathname.slice(1)), name)
  const control = new Pool({ connectionString: url.toString() })
  let fixture: Pool | undefined, created = false
  try {
    // Only this exact random database is created/dropped. Existing databases and
    // volumes are never reset, reused, or selected for cleanup.
    await control.query(`CREATE DATABASE "${name}"`)
    created = true
    const fixtureUrl = new URL(url)
    fixtureUrl.pathname = `/${name}`
    fixture = new Pool({ connectionString: fixtureUrl.toString() })
    await migrate(drizzle(fixture), { migrationsFolder: "./drizzle" })
    const mapping = await fixture.query("select id, handler_role from services order by id")
    assert.equal(mapping.rows.filter((row) => row.handler_role === "tefa").length, 4)
    assert.equal(mapping.rows.filter((row) => row.handler_role === "manajemen").length, 3)
    const values = await fixture.query("select enumlabel from pg_enum e join pg_type t on t.oid = e.enumtypid where t.typname = 'report_handler'")
    assert.ok(values.rows.some((row) => row.enumlabel === "tefa"))
    await fixture.query("insert into users (name,email,role) values ($1,$2,'tefa')", ["Migration Fixture", "tefa-migration@example.invalid"])
    await migrate(drizzle(fixture), { migrationsFolder: "./drizzle" })
    assert.equal((await fixture.query("select count(*)::int n from services")).rows[0].n, 7, "Rerunning migration preserves catalog")
  } finally {
    try {
      await fixture?.end()
      if (created) {
        assert.match(name, /^tefa_migrate_[a-f0-9_]{36}$/)
        await control.query(`DROP DATABASE "${name}"`)
        assert.equal((await control.query("select datname from pg_database where datname = $1", [name])).rows.length, 0)
      }
    } finally { await control.end() }
  }
})
