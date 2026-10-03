import "dotenv/config"
// [AUTH-SCHEMA] Memeriksa koneksi/tabel pengguna saja, bukan memvalidasi login atau session.
// Tetap relevan untuk database aplikasi ketika metode login menjadi Google Workspace.
import { sql } from "drizzle-orm"
import { createDatabaseClient } from "../src/db/client"
import { users } from "../src/db/schema"

async function main() {
  const { pool, db } = createDatabaseClient()
  try {
    await db.execute(sql`select 1`)
    const [{ total }] = await db.select({ total: sql<number>`count(*)::int` }).from(users)
    console.log(`PostgreSQL connection and users table are ready (${total} users).`)
  } finally {
    await pool.end()
  }
}

main().catch(() => {
  console.error("Database check failed. Check credentials, connectivity, and applied migrations.")
  process.exitCode = 1
})
