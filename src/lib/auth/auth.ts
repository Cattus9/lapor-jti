import "server-only"
// [AUTH-LOCAL] Engine Better Auth saat ini memakai email/password untuk akun yang disiapkan pengelola.
// [AUTH-SSO] Google Workspace belum dikonfigurasi. Provider Google dapat ditambahkan pada engine ini;
// tinjau penautan identitas ke users yang sudah ada sebelum menonaktifkan login lokal.
// [AUTH-ROLE] Role/isActive tetap milik database aplikasi, bukan input pengguna atau klaim provider.
import { betterAuth, APIError } from "better-auth"
import { drizzleAdapter } from "better-auth/adapters/drizzle"
import { eq } from "drizzle-orm"
import { getDb } from "@/db"
import { accounts, sessions, users, verifications } from "@/db/schema"
import { getAuthEnvironment } from "./environment"
import { appRoles } from "./roles"

function createAuth() {
  const environment = getAuthEnvironment()
  const db = getDb()
  return betterAuth({
    appName: "AspirasiJTI",
    ...environment,
    trustedOrigins: [environment.baseURL],
    database: drizzleAdapter(db, { provider: "pg", schema: { user: users, session: sessions, account: accounts, verification: verifications } }),
    emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12, maxPasswordLength: 128 },
    user: {
      additionalFields: {
        role: { type: [...appRoles], defaultValue: "pelapor", required: true, input: false },
        isActive: { type: "boolean", defaultValue: true, required: true, input: false },
        identifier: { type: "string", required: false, input: false },
        username: { type: "string", required: false, input: false },
        unit: { type: "string", required: false, input: false },
        studyProgram: { type: "string", required: false, input: false },
      },
    },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    rateLimit: { enabled: true, window: 60, max: 100, storage: "memory", customRules: { "/sign-in/email": { window: 60, max: 5 } } },
    advanced: { database: { generateId: "uuid" } },
    databaseHooks: {
      session: {
        create: {
          before: async (session) => {
            const [user] = await db.select({ isActive: users.isActive }).from(users).where(eq(users.id, session.userId)).limit(1)
            if (!user?.isActive) throw new APIError("UNAUTHORIZED", { message: "Akun tidak dapat digunakan." })
            return { data: session }
          },
        },
      },
    },
  })
}

// Lazy initialization keeps runtime secrets out of Docker/Next.js builds.
let instance: ReturnType<typeof createAuth> | undefined
export function getAuth() {
  instance ??= createAuth()
  return instance
}
