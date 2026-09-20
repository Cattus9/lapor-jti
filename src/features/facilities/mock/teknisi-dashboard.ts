export type TechnicianReportStatus = "Baru" | "Diverifikasi" | "Diproses" | "Selesai"

export type TechnicianFacilityReport = {
  ticket: string
  title: string
  facility: string
  room: string
  location: string
  reporter: string
  submittedAt: string
  updatedAt: string
  status: TechnicianReportStatus
  description: string
  attachments: number
}

export type TechnicianFacilityPriority = {
  facility: string
  activeReports: number
  tickets: readonly string[]
}

export type TechnicianRoomPriority = {
  room: string
  location: string
  activeReports: number
  totalReports: number
  facilities: readonly TechnicianFacilityPriority[]
}

export const technicianFacilityReports: readonly TechnicianFacilityReport[] = [
  {
    ticket: "LJ-2026-00142",
    title: "Lampu ruang kelas mati",
    facility: "Lampu",
    room: "Ruang 3.4",
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
    room: "Lab Jaringan 2",
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
    room: "Ruang 3.2",
    location: "Gedung JTI, Ruang 3.2",
    reporter: "Nanda Prasetyo",
    submittedAt: "Hari ini, 07.45",
    updatedAt: "1 jam lalu",
    status: "Diproses",
    description: "Proyektor menyala, namun layar tidak menerima tampilan dari komputer pengajar.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00150",
    title: "Komputer baris belakang tidak terhubung jaringan",
    facility: "Komputer",
    room: "Lab Jaringan 2",
    location: "Lab Jaringan 2",
    reporter: "Rafi Maulana",
    submittedAt: "Hari ini, 09.24",
    updatedAt: "6 menit lalu",
    status: "Baru",
    description: "Empat komputer pada baris belakang tidak dapat mengakses jaringan lokal saat praktikum.",
    attachments: 2,
  },
  {
    ticket: "LJ-2026-00149",
    title: "Komputer instruktur gagal menyala",
    facility: "Komputer",
    room: "Lab Jaringan 2",
    location: "Lab Jaringan 2",
    reporter: "Siti Rahma",
    submittedAt: "Hari ini, 09.16",
    updatedAt: "14 menit lalu",
    status: "Baru",
    description: "Komputer instruktur tidak merespons tombol daya meskipun kabel listrik sudah diperiksa.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00145",
    title: "Proyektor laboratorium berkedip",
    facility: "LCD",
    room: "Lab Jaringan 2",
    location: "Lab Jaringan 2",
    reporter: "Bagas Pratama",
    submittedAt: "Hari ini, 08.55",
    updatedAt: "20 menit lalu",
    status: "Diproses",
    description: "Tampilan proyektor berkedip dan beberapa kali kehilangan sinyal selama praktikum.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00144",
    title: "TV presentasi tidak menerima input HDMI",
    facility: "TV",
    room: "Lab Multimedia",
    location: "Lab Multimedia",
    reporter: "Fajar Ramadhan",
    submittedAt: "Hari ini, 08.48",
    updatedAt: "25 menit lalu",
    status: "Diverifikasi",
    description: "TV menyala tetapi tidak mendeteksi perangkat yang terhubung melalui kabel HDMI.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00143",
    title: "Komputer penyuntingan sering mati mendadak",
    facility: "Komputer",
    room: "Lab Multimedia",
    location: "Lab Multimedia",
    reporter: "Putri Lestari",
    submittedAt: "Hari ini, 08.40",
    updatedAt: "28 menit lalu",
    status: "Baru",
    description: "Komputer nomor 12 mati mendadak ketika aplikasi penyuntingan video dijalankan.",
    attachments: 2,
  },
  {
    ticket: "LJ-2026-00141",
    title: "Proyektor laboratorium terlalu redup",
    facility: "LCD",
    room: "Lab Multimedia",
    location: "Lab Multimedia",
    reporter: "Dinda Larasati",
    submittedAt: "Hari ini, 08.18",
    updatedAt: "43 menit lalu",
    status: "Baru",
    description: "Tampilan proyektor tidak terbaca jelas meskipun pencahayaan ruangan sudah dikurangi.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00140",
    title: "AC ruang kelas mengeluarkan suara keras",
    facility: "AC",
    room: "Ruang 3.4",
    location: "Gedung JTI, Ruang 3.4",
    reporter: "Rizal Akbar",
    submittedAt: "Hari ini, 08.05",
    updatedAt: "48 menit lalu",
    status: "Diverifikasi",
    description: "Unit AC mengeluarkan suara getaran keras ketika digunakan selama perkuliahan.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00137",
    title: "TV ruang kelas tidak menyala",
    facility: "TV",
    room: "Ruang 3.4",
    location: "Gedung JTI, Ruang 3.4",
    reporter: "Nabila Putri",
    submittedAt: "Kemarin, 15.42",
    updatedAt: "2 jam lalu",
    status: "Baru",
    description: "TV tidak menunjukkan indikator daya setelah kabel dan stopkontak diperiksa.",
    attachments: 0,
  },
  {
    ticket: "LJ-2026-00131",
    title: "Kursi pengajar tidak stabil",
    facility: "Kursi",
    room: "Ruang 3.2",
    location: "Gedung JTI, Ruang 3.2",
    reporter: "Raka Pratama",
    submittedAt: "Kemarin, 14.10",
    updatedAt: "3 jam lalu",
    status: "Diverifikasi",
    description: "Kaki kursi pengajar bergoyang dan perlu diperiksa sebelum perkuliahan berikutnya.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00125",
    title: "Kursi kuliah rusak",
    facility: "Kursi",
    room: "Ruang 3.7",
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
    room: "Lab Multimedia",
    location: "Lab Multimedia",
    reporter: "Fajar Ramadhan",
    submittedAt: "16 September 2026, 09.20",
    updatedAt: "Kemarin, 11.05",
    status: "Selesai",
    description: "Salah satu kaki meja tidak stabil saat digunakan untuk praktikum desain.",
    attachments: 0,
  },
]

export function aggregateTechnicianRoomPriorities(reports: readonly TechnicianFacilityReport[]) {
  const activeReports = reports.filter((report) => report.status !== "Selesai")
  const rooms = new Map<string, TechnicianFacilityReport[]>()

  activeReports.forEach((report) => {
    rooms.set(report.room, [...(rooms.get(report.room) ?? []), report])
  })

  return [...rooms.entries()]
    .map(([room, roomReports]): TechnicianRoomPriority => {
      const facilities = new Map<string, TechnicianFacilityReport[]>()

      roomReports.forEach((report) => {
        facilities.set(report.facility, [...(facilities.get(report.facility) ?? []), report])
      })

      return {
        room,
        location: roomReports[0]?.location ?? room,
        activeReports: roomReports.length,
        totalReports: reports.filter((report) => report.room === room).length,
        facilities: [...facilities.entries()]
          .map(([facility, facilityReports]) => ({
            facility,
            activeReports: facilityReports.length,
            tickets: facilityReports.map((report) => report.ticket),
          }))
          .sort((first, second) => second.activeReports - first.activeReports || first.facility.localeCompare(second.facility)),
      }
    })
    .sort((first, second) => second.activeReports - first.activeReports || first.room.localeCompare(second.room))
}

export const technicianRoomPriorities = aggregateTechnicianRoomPriorities(technicianFacilityReports)

const activeReports = technicianFacilityReports.filter((report) => report.status !== "Selesai")
const roomPriority = new Map(technicianRoomPriorities.map((room, index) => [room.room, index]))

export const technicianOverview = {
  newReports: activeReports.filter((report) => report.status === "Baru").length,
  inProgress: activeReports.filter((report) => report.status === "Diverifikasi" || report.status === "Diproses").length,
  completedToday: technicianFacilityReports.filter((report) => report.status === "Selesai").length,
  affectedRooms: technicianRoomPriorities.length,
  priorityRoom: technicianRoomPriorities[0]?.room ?? "Belum ada",
  priorityRoomReports: technicianRoomPriorities[0]?.activeReports ?? 0,
  updatedAt: "Diperbarui 7 menit lalu",
}

export const technicianRepairQueue: readonly TechnicianFacilityReport[] = [...activeReports]
  .sort((first, second) => (roomPriority.get(first.room) ?? 99) - (roomPriority.get(second.room) ?? 99))
  .slice(0, 4)

export const technicianTasks = [
  {
    title: `Tinjau ${technicianOverview.priorityRoom}`,
    description: "Ruang dengan konsentrasi laporan aktif tertinggi saat ini.",
    count: `${technicianOverview.priorityRoomReports} laporan`,
  },
  {
    title: "Verifikasi laporan masuk",
    description: "Periksa kelengkapan lokasi dan fasilitas pada laporan baru.",
    count: `${technicianOverview.newReports} laporan`,
  },
  {
    title: "Lanjutkan perbaikan aktif",
    description: "Tangani laporan yang sudah diverifikasi atau sedang diproses.",
    count: `${technicianOverview.inProgress} pekerjaan`,
  },
] as const

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
