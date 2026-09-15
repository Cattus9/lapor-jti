import { cookies } from "next/headers"
import { dummyUser, dummyUsers, type CurrentUser } from "./dummy-session"

const DUMMY_EMAIL_COOKIE = "laporjti_dummy_email"

export async function getDummySessionUser(): Promise<CurrentUser> {
  const email = (await cookies()).get(DUMMY_EMAIL_COOKIE)?.value?.toLowerCase()
  return (email && dummyUsers[email]) || dummyUser
}
