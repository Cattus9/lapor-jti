import type { NotificationItem } from "@/features/notifications/types"

export const managementNotifications: NotificationItem[] = [
  {
    id: "manajemen-notif-001",
    kind: "status",
    title: "Laporan layanan baru masuk",
    description: "Kendala akses JTI E-Learning membutuhkan respons awal dari Manajemen Jurusan.",
    ticketNumber: "LJ-2026-00142",
    reportTitle: "Akses JTI E-Learning tidak dapat dibuka",
    createdAt: "12 menit lalu",
    group: "Hari ini",
    read: false,
  },
  {
    id: "manajemen-notif-002",
    kind: "response",
    title: "Laporan menunggu pembaruan",
    description: "Pelapor menunggu tindak lanjut untuk kendala pengajuan surat aktif kuliah.",
    ticketNumber: "LJ-2026-00131",
    reportTitle: "Kendala pengajuan surat aktif kuliah",
    createdAt: "1 jam lalu",
    group: "Hari ini",
    read: false,
  },
  {
    id: "manajemen-notif-003",
    kind: "status",
    title: "Laporan telah selesai",
    description: "Tanggapan akhir untuk nilai evaluasi pembelajaran telah dicatat pada tiket pelapor.",
    ticketNumber: "LJ-2026-00126",
    reportTitle: "Nilai evaluasi pembelajaran belum tampil",
    createdAt: "Kemarin, 16.10",
    group: "Kemarin",
    read: true,
  },
]
