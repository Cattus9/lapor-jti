import "server-only"
// [AUTH-SCHEMA] Akses database server bersama untuk identitas/role dan workflow aplikasi.
// Login Google Workspace tetap membutuhkan penyimpanan aplikasi, bukan pengganti koneksi PostgreSQL ini.
import { createDatabaseClient } from "./client"

// Reuse the pool across Next.js development hot reloads.
const databaseGlobal = globalThis as typeof globalThis & {
  aspirasiDatabase?: ReturnType<typeof createDatabaseClient>
}

export function getDb() {
  databaseGlobal.aspirasiDatabase ??= createDatabaseClient()
  return databaseGlobal.aspirasiDatabase.db
}
