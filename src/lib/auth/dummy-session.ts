import type { AppRole } from "./roles"

export type CurrentUser = {
  id: string
  name: string
  email: string
  identifier: string
  role: AppRole
}

export const dummyUser: CurrentUser = {
  id: "dummy-user-001",
  name: "Ayu Santoso",
  email: "ayu.santoso@example.com",
  identifier: "DUMMY-001",
  role: "pelapor",
}

export function getDummyUser(): CurrentUser {
  return dummyUser
}
