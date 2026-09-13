import { redirect } from "next/navigation"
import { getDummyUser, type CurrentUser } from "./dummy-session"
import type { AppRole } from "./roles"

export function requireDummyRole(role: AppRole): CurrentUser {
  const user = getDummyUser()

  if (user.role !== role) {
    redirect(`/${user.role}/dashboard`)
  }

  return user
}
