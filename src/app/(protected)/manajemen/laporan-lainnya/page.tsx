import { redirect } from "next/navigation"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementOtherReportsPage() {
  await requireDummyRole("manajemen")

  redirect("/manajemen/laporan?category=lainnya")
}
