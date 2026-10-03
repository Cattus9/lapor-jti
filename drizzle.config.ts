import "dotenv/config"
// [AUTH-SCHEMA] Sumber migrasi ada di src/db/schema.ts, termasuk identitas/role dan tabel engine auth.
// Perubahan provider/engine harus ditinjau pada schema dan dibuat sebagai migrasi baru.
import { defineConfig } from "drizzle-kit"
import { getDatabaseUrl } from "./src/db/environment"

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema.ts",
  out: "./drizzle",
  dbCredentials: { url: getDatabaseUrl() },
  strict: true,
  verbose: false,
})
