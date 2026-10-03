import assert from "node:assert/strict"
import { afterEach, beforeEach, test } from "node:test"
import { getDatabaseUrl } from "../src/db/environment"

const keys = ["DATABASE_URL", "PGUSER", "PGPASSWORD", "PGDATABASE", "PGHOST", "PGPORT", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB", "DB_PORT", "APP_DB_USER", "APP_DB_PASSWORD"] as const
let original: Record<string, string | undefined>

beforeEach(() => {
  original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  for (const key of keys) delete process.env[key]
})

afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete process.env[key]
    else process.env[key] = original[key]
  }
})

test("credentials containing URL delimiters survive the connection URL", () => {
  process.env.PGUSER = "app user@example"
  process.env.PGPASSWORD = "p@ss:/#%? word"
  process.env.PGDATABASE = "aspirasi_jti"
  process.env.PGHOST = "db"
  const url = new URL(getDatabaseUrl())
  assert.equal(decodeURIComponent(url.username), process.env.PGUSER)
  assert.equal(decodeURIComponent(url.password), process.env.PGPASSWORD)
  assert.equal(url.hostname, "db")
})

test("an explicit PostgreSQL URL takes precedence over individual variables", () => {
  process.env.DATABASE_URL = "postgresql://override:password@remote:5433/example?sslmode=require"
  process.env.PGHOST = "db"
  assert.equal(getDatabaseUrl(), process.env.DATABASE_URL)
})

test("local CLI falls back to POSTGRES values and the host database port", () => {
  process.env.POSTGRES_USER = "owner"
  process.env.POSTGRES_PASSWORD = "local"
  process.env.POSTGRES_DB = "aspirasijti_dev"
  process.env.DB_PORT = "5433"
  const url = new URL(getDatabaseUrl())
  assert.equal(url.hostname, "127.0.0.1")
  assert.equal(url.port, "5433")
})

test("injected PG credentials take precedence over local bootstrap credentials", () => {
  process.env.PGUSER = "app"
  process.env.PGPASSWORD = "app_password"
  process.env.PGDATABASE = "runtime"
  process.env.POSTGRES_USER = "owner"
  process.env.POSTGRES_PASSWORD = "owner_password"
  const url = new URL(getDatabaseUrl())
  assert.equal(url.username, "app")
  assert.equal(url.password, "app_password")
})

test("application clients never fall back to the database owner account", () => {
  process.env.POSTGRES_USER = "owner"
  process.env.POSTGRES_PASSWORD = "owner_password"
  process.env.POSTGRES_DB = "database"
  assert.throws(() => getDatabaseUrl("application"), /configuration is missing/)
  process.env.APP_DB_USER = "app"
  process.env.APP_DB_PASSWORD = "app_password"
  assert.equal(new URL(getDatabaseUrl("application")).username, "app")
})

test("unsupported protocols and missing credentials fail before connecting", () => {
  assert.throws(() => getDatabaseUrl(), /configuration is missing/)
  process.env.DATABASE_URL = "https://example.org"
  assert.throws(() => getDatabaseUrl(), /protocol/)
})

test("invalid ports fail before connecting", () => {
  process.env.PGUSER = "app"
  process.env.PGPASSWORD = "password"
  process.env.PGDATABASE = "database"
  for (const port of ["0", "65536", "5432oops"]) {
    process.env.PGPORT = port
    assert.throws(() => getDatabaseUrl(), /port must be an integer/)
  }
})
