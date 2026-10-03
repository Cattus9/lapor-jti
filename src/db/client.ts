import { drizzle } from "drizzle-orm/node-postgres"
// [AUTH-SCHEMA] Koneksi ini dipakai auth dan backend lain; bukan khusus login email/password.
// Pertahankan koneksi/database aplikasi ketika menambah Google Workspace atau mengganti engine auth.
import { Pool } from "pg"
import { getDatabaseUrl } from "./environment"
import * as schema from "./schema"

export function createDatabaseClient(role: "application" | "migration" = "application") {
  const pool = new Pool({
    connectionString: getDatabaseUrl(role),
    max: 10,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
  })
  pool.on("error", () => {
    console.error("An idle PostgreSQL connection failed; the pool will reconnect on the next query.")
  })
  return { pool, db: drizzle(pool, { schema }) }
}
