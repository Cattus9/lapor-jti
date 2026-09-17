export type TechnicianReportStatus = "Baru" | "Diverifikasi" | "Diproses" | "Selesai"

export type TechnicianFacilityReport = {
  ticket: string
  title: string
  facility: string
  location: string
  reporter: string
  submittedAt: string
  updatedAt: string
  status: TechnicianReportStatus
  description: string
  attachments: number
}

export const technicianOverview = {
  newReports: 4,
  inProgress: 3,
  completedToday: 2,
  updatedAt: "Diperbarui 7 menit lalu",
}

export const technicianRepairQueue: readonly TechnicianFacilityReport[] = [
  {
    ticket: "LJ-2026-00142",
    title: "Lampu ruang kelas mati",
    facility: "Lampu",
    location: "Gedung JTI, Ruang 3.4",
    reporter: "Ayu Santoso",
    submittedAt: "Hari ini, 09.08",
    updatedAt: "9 menit lalu",
    status: "Baru",
    description: "Dua lampu di sisi tengah ruang kelas tidak menyala saat perkuliahan berlangsung.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00139",
    title: "AC Laboratorium Jaringan tidak dingin",
    facility: "AC",
    location: "Lab Jaringan 2",
    reporter: "Dwi Kurniawan",
    submittedAt: "Hari ini, 08.32",
    updatedAt: "31 menit lalu",
    status: "Diverifikasi",
    description: "AC menyala tetapi tidak menghasilkan udara dingin. Kondisi ini mengganggu kegiatan praktikum.",
    attachments: 2,
  },
  {
    ticket: "LJ-2026-00133",
    title: "Proyektor tidak menampilkan gambar",
    facility: "LCD",
    location: "Gedung JTI, Ruang 3.2",
    reporter: "Nanda Prasetyo",
    submittedAt: "Hari ini, 07.45",
    updatedAt: "1 jam lalu",
    status: "Diproses",
    description: "Proyektor menyala, namun layar tidak menerima tampilan dari komputer pengajar.",
    attachments: 1,
  },
]

export const technicianTasks = [
  {
    title: "Verifikasi laporan masuk",
    description: "Periksa kelengkapan lokasi dan fasilitas pada laporan baru.",
    count: "4 laporan",
  },
  {
    title: "Tangani perbaikan aktif",
    description: "Lanjutkan pekerjaan yang sudah dijadwalkan hari ini.",
    count: "3 pekerjaan",
  },
  {
    title: "Lengkapi catatan pekerjaan",
    description: "Catat hasil penanganan sebelum laporan dinyatakan selesai.",
    count: "2 catatan",
  },
] as const

export const technicianFacilityReports: readonly TechnicianFacilityReport[] = [
  ...technicianRepairQueue,
  {
    ticket: "LJ-2026-00125",
    title: "Kursi kuliah rusak",
    facility: "Kursi",
    location: "Gedung JTI, Ruang 3.7",
    reporter: "Maya Putri",
    submittedAt: "16 September 2026, 13.45",
    updatedAt: "Kemarin, 15.20",
    status: "Selesai",
    description: "Dudukan kursi bagian kanan longgar dan tidak aman digunakan untuk perkuliahan.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00120",
    title: "Meja praktikum longgar",
    facility: "Meja",
    location: "Lab Multimedia",
    reporter: "Fajar Ramadhan",
    submittedAt: "16 September 2026, 09.20",
    updatedAt: "Kemarin, 11.05",
    status: "Selesai",
    description: "Salah satu kaki meja tidak stabil saat digunakan untuk praktikum desain.",
    attachments: 0,
  },
]

export const technicianRepairHistory = [
  {
    ticket: "LJ-2026-00125",
    title: "Kursi kuliah rusak",
    facility: "Kursi",
    location: "Gedung JTI, Ruang 3.7",
    completedAt: "16 September 2026, 15.20",
    note: "Pengencang dudukan diganti dan kondisi kursi sudah diuji.",
  },
  {
    ticket: "LJ-2026-00120",
    title: "Meja praktikum longgar",
    facility: "Meja",
    location: "Lab Multimedia",
    completedAt: "16 September 2026, 11.05",
    note: "Kaki meja dikencangkan kembali dan meja stabil digunakan.",
  },
] as const
