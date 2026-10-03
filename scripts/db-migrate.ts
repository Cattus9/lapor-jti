import "dotenv/config"
// [AUTH-SCHEMA] Menerapkan migrasi schema aplikasi, termasuk auth; tidak membuat akun atau password demo.
// Saat engine auth diganti, tambahkan migrasi baru; jangan hapus riwayat/SQL yang sudah diterapkan.
import { migrate } from "drizzle-orm/node-postgres/migrator"
import { createDatabaseClient } from "../src/db/client"

async function main() {
  const { pool, db } = createDatabaseClient("migration")
  try {
    await migrate(db, { migrationsFolder: "./drizzle" })
    console.log("Database migrations completed.")
  } finally {
    await pool.end()
  }
}

main().catch(() => {
  console.error("Database migration failed. Check database availability, credentials, and migration files.")
  process.exitCode = 1
})
