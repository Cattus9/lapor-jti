import "dotenv/config"
// [AUTH-LOCAL] Smoke check memakai akun development dan login email/password.
// Saat login Google menjadi metode utama, adaptasikan pengujian login tanpa menghapus tes session, logout, dan guard role.
import assert from "node:assert/strict"

// API/route authorization checks only. No browser or visual automation.
async function main() {
  if (process.env.NODE_ENV !== "development") throw new Error("Auth smoke checks require NODE_ENV=development.")
  const baseURL = process.env.BETTER_AUTH_URL
  const password = process.env.DEMO_USER_PASSWORD
  if (!baseURL || !password) throw new Error("Configure BETTER_AUTH_URL and DEMO_USER_PASSWORD, then run the optional development seed.")
  const origin = new URL(baseURL)
  if (!["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) throw new Error("Smoke checks are restricted to a local development server.")

  async function api(path: string, body?: Record<string, unknown>, cookie?: string, requestOrigin = baseURL!) {
    return fetch(new URL(`/api/auth/${path}`, baseURL), {
      method: body ? "POST" : "GET",
      headers: { "Content-Type": "application/json", Origin: requestOrigin, ...(cookie ? { Cookie: cookie } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      redirect: "manual",
    })
  }
  async function expectRedirect(path: string, target: string, cookie?: string) {
    const response = await fetch(new URL(path, baseURL), { headers: cookie ? { Cookie: cookie } : {}, redirect: "manual" })
    const location = response.headers.get("location")
    if (location) assert.equal(new URL(location, baseURL).pathname, target)
    else assert.match(await response.text(), new RegExp(`NEXT_REDIRECT;replace;${target};`))
  }
  assert.equal(await (await api("get-session")).json(), null)
  await expectRedirect("/manajemen/dashboard", "/login", "laporjti_dummy_email=manajemen%40gmail.com")
  console.log("PASS: anonymous access and forged legacy cookie rejected")

  const signup = await api("sign-up/email", { name: "Unauthorized registration", email: "unregistered@example.test", password, role: "admin" })
  assert.ok(signup.status >= 400 && signup.status < 500)
  console.log("PASS: public registration closed")
  const wrong = await api("sign-in/email", { email: "pelapor@gmail.com", password: "incorrect-test-password" })
  assert.equal(wrong.status, 401)
  console.log("PASS: incorrect password rejected")

  for (const role of ["pelapor", "satpam", "teknisi", "manajemen"] as const) {
    const signin = await api("sign-in/email", { email: `${role}@gmail.com`, password })
    assert.equal(signin.status, 200, `Sign-in failed for ${role}; check seed and rate-limit cooldown.`)
    const setCookies = signin.headers.getSetCookie()
    assert.ok(setCookies.some((value) => /httponly/i.test(value)))
    const cookie = setCookies.map((value) => value.split(";")[0]).join("; ")
    try {
      const session = await (await api("get-session", undefined, cookie)).json()
      assert.equal(session.user.role, role)
      assert.equal(session.user.email, `${role}@gmail.com`)
      await expectRedirect("/", `/${role}/dashboard`, cookie)
      await expectRedirect("/login", `/${role}/dashboard`, cookie)
      const other = role === "manajemen" ? "pelapor" : "manajemen"
      await expectRedirect(`/${other}/dashboard`, `/${role}/dashboard`, cookie)
      if (role === "pelapor") {
        const update = await api("update-user", { role: "admin", isActive: false }, cookie)
        assert.ok(update.status >= 400 && update.status < 500)
        assert.equal((await (await api("get-session", undefined, cookie)).json()).user.role, "pelapor")
        const csrf = await api("sign-out", {}, cookie, "https://untrusted.example.test")
        assert.equal(csrf.status, 403)
      }
    } finally {
      assert.equal((await api("sign-out", {}, cookie)).status, 200)
      assert.equal(await (await api("get-session", undefined, cookie)).json(), null)
    }
    console.log(`PASS: ${role} session, role redirect, and logout`)
  }
  const throttled = await api("sign-in/email", { email: "pelapor@gmail.com", password })
  assert.equal(throttled.status, 429)
  console.log("PASS: sign-in rate limit enforced")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "Auth smoke check failed.")
  process.exitCode = 1
})
