import "dotenv/config"
// [AUTH-LOCAL] Seed akun dan kredensial email/password hanya untuk development, bukan penyediaan akun kampus.
// Saat Google Workspace aktif, hentikan penggunaan kredensial demo di production; role tetap di users.
// Seed selalu opsional dan tidak boleh membuka pendaftaran publik atau mereset kredensial yang sudah ada.
import { and, eq, sql } from "drizzle-orm"
import { hashPassword } from "better-auth/crypto"
import { createDatabaseClient } from "../src/db/client"
import { accounts, users, securityOfficers } from "../src/db/schema"
import { demoUsers } from "./fixtures/demo-users"
import { demoSecurityOfficers } from "./fixtures/security-officers"

async function main() {
  if (process.env.NODE_ENV !== "development") {
    throw new Error("Demo seed is only allowed in the development environment.")
  }
  const password = process.env.DEMO_USER_PASSWORD
  if (!password || password.length < 12 || password.length > 128) {
    throw new Error("Demo seed requires DEMO_USER_PASSWORD (12-128 characters).")
  }

  const { pool, db } = createDatabaseClient("migration")
  try {
    let newUsers = 0
    let newAccounts = 0
    for (const demo of Object.values(demoUsers)) {
      await db.transaction(async (tx) => {
        const inserted = await tx.insert(users).values({
          name: demo.name, email: demo.email.toLowerCase(), identifier: demo.identifier,
          role: demo.role, isActive: demo.status === "Aktif", username: demo.username,
          unit: demo.unit, studyProgram: demo.studyProgram,
        }).onConflictDoNothing().returning({ id: users.id })
        newUsers += inserted.length
        const [user] = await tx.select().from(users).where(sql`lower(${users.email}) = ${demo.email.toLowerCase()}`).limit(1)
        // Never attach known demo credentials to an unrelated pre-existing account.
        if (!user || user.identifier !== demo.identifier || user.role !== demo.role || !user.isActive) {
          throw new Error("Demo seed stopped: an existing user does not match the development fixture.")
        }
        // Backfill only empty profile fields on matching demos from the earlier seed.
        await tx.update(users).set({
          username: sql`coalesce(${users.username}, ${demo.username})`,
          unit: sql`coalesce(${users.unit}, ${demo.unit})`,
          studyProgram: sql`coalesce(${users.studyProgram}, ${demo.studyProgram})`,
        }).where(eq(users.id, user.id))
        const [credential] = await tx.select({ id: accounts.id }).from(accounts).where(and(eq(accounts.userId, user.id), eq(accounts.providerId, "credential"))).limit(1)
        if (credential) return
        const insertedAccounts = await tx.insert(accounts).values({
          userId: user.id, accountId: user.id, providerId: "credential", password: await hashPassword(password),
        }).onConflictDoNothing().returning({ id: accounts.id })
        newAccounts += insertedAccounts.length
      })
    }
    await db.insert(securityOfficers).values(demoSecurityOfficers.map((officer) => ({ ...officer }))).onConflictDoNothing()
    console.log(`Development seed completed (${newUsers} new users, ${newAccounts} new credential accounts). Existing credentials and officer records were preserved.`)
  } finally {
    await pool.end()
  }
}

main().catch((error: unknown) => {
  if (error instanceof Error && error.message.startsWith("Demo seed")) {
    console.error(error.message)
  } else {
    console.error("Development seed failed. Check the database configuration and migrations.")
  }
  process.exitCode = 1
})
