import { redirect } from "next/navigation"
import { requireDummyRole } from "@/lib/auth/require-role"

export default async function ManagementServiceReportsPage() {
  await requireDummyRole("manajemen")

  redirect("/manajemen/laporan?category=layanan")
}
