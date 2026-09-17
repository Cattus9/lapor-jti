export type ManagementReportStatus = "Baru" | "Sedang Diproses" | "Selesai"
export type ManagementReportCategory = "Layanan" | "Lainnya"

export type ManagementReport = {
  ticket: string
  title: string
  category: ManagementReportCategory
  service: string
  reporter: string
  reporterUnit: string
  location: string
  submittedAt: string
  updatedAt: string
  status: ManagementReportStatus
  description: string
  attachments: number
  daysAgo: number
}

export const managementReports: readonly ManagementReport[] = [
  {
    ticket: "LJ-2026-00142",
    title: "Akses JTI E-Learning tidak dapat dibuka",
    category: "Layanan",
    service: "JTI E-Learning",
    reporter: "Nadia Putri",
    reporterUnit: "Program Studi Teknik Informatika",
    location: "Portal JTI E-Learning",
    submittedAt: "17 September 2026, 08.12",
    updatedAt: "12 menit lalu",
    status: "Baru",
    description: "Halaman kelas Pemrograman Web tidak dapat dibuka setelah pengguna berhasil masuk ke portal JTI E-Learning.",
    attachments: 1,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00131",
    title: "Kendala pengajuan surat aktif kuliah",
    category: "Layanan",
    service: "JTI Surat",
    reporter: "Salsa Amalia",
    reporterUnit: "Program Studi Manajemen Informatika",
    location: "Portal JTI Surat",
    submittedAt: "17 September 2026, 07.15",
    updatedAt: "1 jam lalu",
    status: "Sedang Diproses",
    description: "Permohonan surat aktif kuliah sudah dikirim, tetapi status permohonan tidak berubah selama dua hari kerja.",
    attachments: 0,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00126",
    title: "Nilai evaluasi pembelajaran belum tampil",
    category: "Layanan",
    service: "JTI Evaluasi Pembelajaran",
    reporter: "Reno Mahardika",
    reporterUnit: "Program Studi Teknik Komputer",
    location: "JTIFORM",
    submittedAt: "16 September 2026, 13.40",
    updatedAt: "16 September 2026, 16.10",
    status: "Selesai",
    description: "Mahasiswa tidak dapat melihat hasil evaluasi pembelajaran untuk mata kuliah Jaringan Komputer.",
    attachments: 0,
    daysAgo: 1,
  },
  {
    ticket: "LJ-2026-00138",
    title: "Permohonan pembaruan informasi laboratorium",
    category: "Lainnya",
    service: "Informasi Jurusan",
    reporter: "Andika Saputra",
    reporterUnit: "Program Studi Teknologi Rekayasa Komputer",
    location: "Website Jurusan JTI",
    submittedAt: "17 September 2026, 07.48",
    updatedAt: "36 menit lalu",
    status: "Baru",
    description: "Informasi jadwal penggunaan Laboratorium Multimedia pada halaman jurusan belum sesuai dengan jadwal terbaru.",
    attachments: 1,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00135",
    title: "Usulan penambahan perlengkapan ruang baca",
    category: "Lainnya",
    service: "Sarana Akademik",
    reporter: "Rahma Fitria",
    reporterUnit: "Program Studi Teknik Informatika",
    location: "Ruang Baca JTI",
    submittedAt: "17 September 2026, 07.22",
    updatedAt: "52 menit lalu",
    status: "Sedang Diproses",
    description: "Pelapor mengusulkan penambahan stopkontak dan kursi kerja pada area belajar mandiri di Ruang Baca JTI.",
    attachments: 2,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00121",
    title: "Koordinasi jadwal kegiatan himpunan",
    category: "Lainnya",
    service: "Administrasi Jurusan",
    reporter: "Fikri Ananda",
    reporterUnit: "Himpunan Mahasiswa Teknologi Informasi",
    location: "Administrasi JTI",
    submittedAt: "16 September 2026, 10.05",
    updatedAt: "16 September 2026, 15.30",
    status: "Sedang Diproses",
    description: "Permohonan koordinasi penggunaan aula untuk kegiatan himpunan membutuhkan konfirmasi jadwal dari jurusan.",
    attachments: 1,
    daysAgo: 1,
  },
  {
    ticket: "LJ-2026-00117",
    title: "Saran penambahan papan informasi digital",
    category: "Lainnya",
    service: "Sarana Akademik",
    reporter: "Mila Kurnia",
    reporterUnit: "Program Studi Manajemen Informatika",
    location: "Lobi Gedung JTI",
    submittedAt: "6 September 2026, 09.10",
    updatedAt: "6 September 2026, 11.20",
    status: "Selesai",
    description: "Pelapor menyampaikan saran pemasangan papan informasi digital untuk pengumuman kegiatan akademik jurusan.",
    attachments: 0,
    daysAgo: 11,
  },
]

export const managementOverview = {
  newReports: managementReports.filter((report) => report.status === "Baru").length,
  inProgress: managementReports.filter((report) => report.status === "Sedang Diproses").length,
  completedThisMonth: managementReports.filter((report) => report.status === "Selesai").length,
  activeServiceReports: managementReports.filter((report) => report.category === "Layanan" && report.status !== "Selesai").length,
  updatedAt: "Diperbarui 8 menit lalu",
}

export const managementPriorityQueue = managementReports.filter((report) => report.status !== "Selesai").slice(0, 3)

export const managementFocus = [
  {
    title: "Tindak lanjuti laporan baru",
    description: "Pastikan pelapor menerima respons awal untuk setiap laporan yang masuk.",
    count: `${managementOverview.newReports} laporan`,
  },
  {
    title: "Perbarui tanggapan penanganan",
    description: "Sampaikan perkembangan agar pelapor mengetahui langkah yang sedang berjalan.",
    count: `${managementOverview.inProgress} aktif`,
  },
  {
    title: "Tinjau ringkasan operasional",
    description: "Gunakan Monitoring untuk melihat kondisi laporan lintas kategori dan periode.",
    count: "Hari ini",
  },
]
