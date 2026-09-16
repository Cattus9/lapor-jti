export const satpamOverview = {
  lostReports: 8,
  newFindings: 3,
  readyForHandover: 2,
  updatedAt: "Diperbarui 5 menit lalu",
}

export const satpamQueue = [
  { ticket: "LJ-2026-00131", title: "Dompet kulit hitam", type: "Kehilangan", location: "Ruang 3.2", updatedAt: "8 menit lalu", status: "Baru" },
  { ticket: "LJ-2026-00129", title: "Kartu identitas mahasiswa", type: "Temuan", location: "Lobi Gedung JTI", updatedAt: "22 menit lalu", status: "Perlu diverifikasi" },
  { ticket: "LJ-2026-00118", title: "Kunci motor dengan lanyard biru", type: "Temuan", location: "Area parkir timur", updatedAt: "Kemarin", status: "Diserahkan" },
  { ticket: "LJ-2026-00107", title: "Tumbler stainless hitam", type: "Kehilangan", location: "Ruang 3.7", updatedAt: "Kemarin", status: "Dicocokkan" },
] as const
