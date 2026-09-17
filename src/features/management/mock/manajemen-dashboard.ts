export type ManagementReportStatus = "Baru" | "Sedang Diproses" | "Selesai"

export const managementOverview = {
  newReports: 7,
  inProgress: 11,
  completedThisMonth: 32,
  activeServiceReports: 8,
  updatedAt: "Diperbarui 8 menit lalu",
}

export const managementPriorityQueue: {
  ticket: string
  title: string
  category: "Layanan" | "Lainnya"
  reporter: string
  updatedAt: string
  status: Exclude<ManagementReportStatus, "Selesai">
}[] = [
  {
    ticket: "LJ-2026-00142",
    title: "Akses JTI E-Learning tidak dapat dibuka",
    category: "Layanan",
    reporter: "Nadia Putri",
    updatedAt: "12 menit lalu",
    status: "Baru",
  },
  {
    ticket: "LJ-2026-00138",
    title: "Permohonan pembaruan informasi laboratorium",
    category: "Lainnya",
    reporter: "Andika Saputra",
    updatedAt: "36 menit lalu",
    status: "Baru",
  },
  {
    ticket: "LJ-2026-00131",
    title: "Kendala pengajuan surat aktif kuliah",
    category: "Layanan",
    reporter: "Salsa Amalia",
    updatedAt: "1 jam lalu",
    status: "Sedang Diproses",
  },
]

export const managementFocus = [
  {
    title: "Tindak lanjuti laporan baru",
    description: "Pastikan pelapor menerima respons awal untuk setiap laporan yang masuk.",
    count: "7 laporan",
  },
  {
    title: "Perbarui tanggapan penanganan",
    description: "Sampaikan perkembangan agar pelapor mengetahui langkah yang sedang berjalan.",
    count: "11 aktif",
  },
  {
    title: "Tinjau ringkasan operasional",
    description: "Gunakan Monitoring untuk melihat kondisi laporan lintas kategori dan periode.",
    count: "Hari ini",
  },
]
