// [AUTH-SCHEMA] Parameter role di sini memilih kredensial koneksi database, bukan AppRole pengguna.
// Kredensial PostgreSQL terpisah dari kredensial OAuth Google Workspace dan tetap diperlukan untuk backend.
export function getDatabaseUrl(role: "application" | "migration" = "migration"): string {
  if (process.env.DATABASE_URL) {
    const url = new URL(process.env.DATABASE_URL)
    if (!["postgres:", "postgresql:"].includes(url.protocol)) {
      throw new Error("DATABASE_URL must use the postgres or postgresql protocol.")
    }
    return url.toString()
  }

  const user = process.env.PGUSER ?? (role === "application" ? process.env.APP_DB_USER : process.env.POSTGRES_USER)
  const password = process.env.PGPASSWORD ?? (role === "application" ? process.env.APP_DB_PASSWORD : process.env.POSTGRES_PASSWORD)
  const database = process.env.PGDATABASE ?? process.env.POSTGRES_DB
  const host = process.env.PGHOST ?? "127.0.0.1"
  const port = process.env.PGPORT ?? process.env.DB_PORT ?? "5432"

  if (!user || !password || !database) {
    throw new Error("Database configuration is missing. Set DATABASE_URL or PGUSER, PGPASSWORD, and PGDATABASE.")
  }
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    throw new Error("Database port must be an integer between 1 and 65535.")
  }

  const url = new URL(`postgresql://${host}:${port}`)
  url.username = encodeURIComponent(user)
  url.password = encodeURIComponent(password)
  url.pathname = `/${encodeURIComponent(database)}`
  return url.toString()
}
