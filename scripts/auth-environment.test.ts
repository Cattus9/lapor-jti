import assert from "node:assert/strict"
// [AUTH-SESSION] Tes konfigurasi engine Better Auth; tetap relevan bila engine ini memakai provider Google.
// Tambahkan tes kredensial OAuth/origin saat integrasi SSO; jangan melemahkan aturan secret dan HTTPS.
import { afterEach, beforeEach, test } from "node:test"
import { getAuthEnvironment } from "../src/lib/auth/environment"

const keys = ["BETTER_AUTH_SECRET", "BETTER_AUTH_URL", "NODE_ENV"] as const
const mutableEnv: Record<string, string | undefined> = process.env
let original: Record<string, string | undefined>
beforeEach(() => {
  original = Object.fromEntries(keys.map((key) => [key, process.env[key]]))
  process.env.BETTER_AUTH_SECRET = "a-test-only-secret-with-at-least-32-characters"
  process.env.BETTER_AUTH_URL = "http://localhost:3001"
  mutableEnv.NODE_ENV = "development"
})
afterEach(() => {
  for (const key of keys) {
    if (original[key] === undefined) delete mutableEnv[key]
    else mutableEnv[key] = original[key]
  }
})

test("development uses the exact configured origin and port", () => {
  assert.equal(getAuthEnvironment().baseURL, "http://localhost:3001")
})
test("missing and short secrets are rejected", () => {
  delete process.env.BETTER_AUTH_SECRET
  assert.throws(getAuthEnvironment, /BETTER_AUTH_SECRET/)
  process.env.BETTER_AUTH_SECRET = "short"
  assert.throws(getAuthEnvironment, /BETTER_AUTH_SECRET/)
})
test("missing origin is rejected", () => {
  delete process.env.BETTER_AUTH_URL
  assert.throws(getAuthEnvironment, /BETTER_AUTH_URL/)
})
test("credentials, paths, queries, fragments, and non-HTTP origins are rejected", () => {
  for (const origin of ["https://user:password@example.org", "https://example.org/login", "https://example.org?x=1", "https://example.org#x", "ftp://example.org"]) {
    process.env.BETTER_AUTH_URL = origin
    assert.throws(getAuthEnvironment, /BETTER_AUTH_URL/)
  }
})
test("production rejects HTTP and permits HTTPS", () => {
  mutableEnv.NODE_ENV = "production"
  assert.throws(getAuthEnvironment, /HTTPS/)
  process.env.BETTER_AUTH_URL = "https://aspirasi.example.ac.id"
  assert.equal(getAuthEnvironment().baseURL, "https://aspirasi.example.ac.id")
})
