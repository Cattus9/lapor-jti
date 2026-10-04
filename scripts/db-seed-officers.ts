import "dotenv/config"
import { createDatabaseClient } from "../src/db/client"
import { securityOfficers } from "../src/db/schema"
import { demoSecurityOfficers } from "./fixtures/security-officers"

async function main() {
  if (process.env.NODE_ENV !== "development") throw new Error("Officer examples are only allowed in development.")
  const { pool, db } = createDatabaseClient("migration")
  try {
    await db.insert(securityOfficers).values(demoSecurityOfficers.map((officer) => ({ ...officer }))).onConflictDoNothing()
    console.log("Development officer examples prepared. Existing officers were preserved; no login accounts were modified.")
  } finally { await pool.end() }
}
main().catch(() => { console.error("Officer seed failed. Check the development environment and database migrations."); process.exitCode = 1 })
