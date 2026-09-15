import { redirect } from "next/navigation"
import { getDummySessionUser } from "./server-session"
import type { CurrentUser } from "./dummy-session"
import type { AppRole } from "./roles"

export async function requireDummyRole(role: AppRole): Promise<CurrentUser> {
  const user = await getDummySessionUser()

  if (user.role !== role) {
    redirect(`/${user.role}/dashboard`)
  }

  return user
}
