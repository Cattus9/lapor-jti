import { technicianFacilityReports } from "@/features/facilities/mock/teknisi-dashboard"

export type MonitoringReportCategory = "Kehilangan & Temuan" | "Fasilitas" | "Layanan" | "Lainnya"

export type MonitoringReportStatus =
  | "Baru"
  | "Diverifikasi"
  | "Diproses"
  | "Barang teridentifikasi"
  | "Diserahkan"
  | "Sedang Diproses"
  | "Selesai"

export type MonitoringStatusFilter = MonitoringReportStatus | "semua" | "dalam-penanganan"

export type MonitoringReport = {
  ticket: string
  title: string
  category: MonitoringReportCategory
  status: MonitoringReportStatus
  handler: "Satpam" | "Teknisi" | "Manajemen Jurusan"
  reporter: string
  context: string
  location: string
  submittedAt: string
  reportedOn: string
  updatedAt: string
  description: string
  attachments: number
  daysAgo: number
}

export function isMonitoringReportInProgress(status: MonitoringReportStatus) {
  return status !== "Baru" && status !== "Selesai"
}

const crossRoleMonitoringReports: readonly MonitoringReport[] = [
  {
    ticket: "LJ-2026-00131",
    title: "Dompet kulit hitam",
    category: "Kehilangan & Temuan",
    status: "Baru",
    handler: "Satpam",
    reporter: "Raka Pratama",
    context: "Laporan kehilangan",
    location: "Gedung JTI, Ruang 3.2",
    submittedAt: "17 September 2026, 09.02",
    reportedOn: "2026-09-17",
    updatedAt: "8 menit lalu",
    description: "Dompet diduga tertinggal setelah kelas selesai. Laporan menunggu verifikasi awal dari petugas Satpam.",
    attachments: 0,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00129",
    title: "Kartu identitas mahasiswa ditemukan",
    category: "Kehilangan & Temuan",
    status: "Diproses",
    handler: "Satpam",
    reporter: "Nadia Putri",
    context: "Laporan temuan",
    location: "Lobi Gedung JTI",
    submittedAt: "17 September 2026, 08.40",
    reportedOn: "2026-09-17",
    updatedAt: "22 menit lalu",
    description: "Kartu identitas telah diterima di pos Satpam dan sedang dicocokkan dengan laporan kehilangan aktif.",
    attachments: 1,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00142",
    title: "Lampu ruang kelas mati",
    category: "Fasilitas",
    status: "Diverifikasi",
    handler: "Teknisi",
    reporter: "Ayu Santoso",
    context: "Fasilitas lampu",
    location: "Gedung JTI, Ruang 3.4",
    submittedAt: "17 September 2026, 09.08",
    reportedOn: "2026-09-17",
    updatedAt: "9 menit lalu",
    description: "Dua lampu di sisi tengah ruang kelas tidak menyala. Teknisi telah memverifikasi lokasi dan kondisi fasilitas.",
    attachments: 1,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00125",
    title: "Kursi kuliah rusak",
    category: "Fasilitas",
    status: "Selesai",
    handler: "Teknisi",
    reporter: "Maya Putri",
    context: "Fasilitas kursi",
    location: "Gedung JTI, Ruang 3.7",
    submittedAt: "16 September 2026, 13.45",
    reportedOn: "2026-09-16",
    updatedAt: "16 September 2026, 15.20",
    description: "Pengencang dudukan telah diganti dan kondisi kursi sudah diuji sebelum laporan ditutup.",
    attachments: 1,
    daysAgo: 1,
  },
  {
    ticket: "LJ-2026-00147",
    title: "Akses JTI E-Learning tidak dapat dibuka",
    category: "Layanan",
    status: "Baru",
    handler: "Manajemen Jurusan",
    reporter: "Nadia Putri",
    context: "JTI E-Learning",
    location: "Portal JTI E-Learning",
    submittedAt: "17 September 2026, 08.12",
    reportedOn: "2026-09-17",
    updatedAt: "12 menit lalu",
    description: "Halaman kelas Pemrograman Web tidak dapat dibuka setelah pengguna berhasil masuk ke portal JTI E-Learning.",
    attachments: 1,
    daysAgo: 0,
  },
  {
    ticket: "LJ-2026-00146",
    title: "Kendala pengajuan surat aktif kuliah",
    category: "Layanan",
    status: "Sedang Diproses",
    handler: "Manajemen Jurusan",
    reporter: "Salsa Amalia",
    context: "JTI Surat",
    location: "Portal JTI Surat",
    submittedAt: "16 September 2026, 07.15",
    reportedOn: "2026-09-16",
    updatedAt: "1 jam lalu",
    description: "Permohonan surat aktif kuliah sudah dikirim, tetapi status permohonan tidak berubah selama dua hari kerja.",
    attachments: 0,
    daysAgo: 1,
  },
  {
    ticket: "LJ-2026-00138",
    title: "Pembaruan informasi laboratorium",
    category: "Lainnya",
    status: "Baru",
    handler: "Manajemen Jurusan",
    reporter: "Andika Saputra",
    context: "Informasi Jurusan",
    location: "Website Jurusan JTI",
    submittedAt: "15 September 2026, 07.48",
    reportedOn: "2026-09-15",
    updatedAt: "36 menit lalu",
    description: "Informasi jadwal penggunaan Laboratorium Multimedia pada halaman jurusan belum sesuai dengan jadwal terbaru.",
    attachments: 1,
    daysAgo: 2,
  },
  {
    ticket: "LJ-2026-00135",
    title: "Usulan perlengkapan ruang baca",
    category: "Lainnya",
    status: "Sedang Diproses",
    handler: "Manajemen Jurusan",
    reporter: "Rahma Fitria",
    context: "Sarana Akademik",
    location: "Ruang Baca JTI",
    submittedAt: "6 September 2026, 07.22",
    reportedOn: "2026-09-06",
    updatedAt: "52 menit lalu",
    description: "Usulan penambahan stopkontak dan kursi kerja pada area belajar mandiri sedang dikoordinasikan dengan jurusan.",
    attachments: 2,
    daysAgo: 11,
  },
]

function facilityReportedOn(submittedAt: string) {
  if (submittedAt.startsWith("Hari ini")) return "2026-09-17"
  if (submittedAt.startsWith("Kemarin")) return "2026-09-16"

  const explicitDate = submittedAt.match(/^(\d{1,2}) September 2026/)
  return explicitDate ? `2026-09-${explicitDate[1].padStart(2, "0")}` : "2026-09-17"
}

export const monitoringReports: readonly MonitoringReport[] = [
  ...crossRoleMonitoringReports.filter((report) => report.category !== "Fasilitas"),
  ...technicianFacilityReports.map((report) => {
    const reportedOn = facilityReportedOn(report.submittedAt)

    return {
      ticket: report.ticket,
      title: report.title,
      category: "Fasilitas" as const,
      status: report.status,
      handler: "Teknisi" as const,
      reporter: report.reporter,
      context: `Fasilitas ${report.facility.toLowerCase()}`,
      location: report.location,
      submittedAt: report.submittedAt,
      reportedOn,
      updatedAt: report.updatedAt,
      description: report.description,
      attachments: report.attachments,
      daysAgo: reportedOn === "2026-09-17" ? 0 : reportedOn === "2026-09-16" ? 1 : 11,
    }
  }),
]
