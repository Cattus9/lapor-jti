// [AUTH-SESSION] Secret dan origin ini milik engine Better Auth, tetap diperlukan bila memakai provider Google.
// Saat beralih ke Google Workspace, tambahkan kredensial OAuth server-only tanpa mengganti role aplikasi.
export function getAuthEnvironment() {
  const secret = process.env.BETTER_AUTH_SECRET
  if (!secret || secret.length < 32) throw new Error("BETTER_AUTH_SECRET must contain at least 32 characters.")
  const value = process.env.BETTER_AUTH_URL
  if (!value) throw new Error("BETTER_AUTH_URL is required.")
  const url = new URL(value)
  if (!(["http:", "https:"].includes(url.protocol)) || url.username || url.password || url.pathname !== "/" || url.search || url.hash) {
    throw new Error("BETTER_AUTH_URL must be an HTTP(S) origin without credentials, path, query, or fragment.")
  }
  if (process.env.NODE_ENV === "production" && url.protocol !== "https:") throw new Error("BETTER_AUTH_URL must use HTTPS in production.")
  return { secret, baseURL: url.origin }
}
