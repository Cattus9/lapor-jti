import type { NotificationItem } from "@/features/notifications/types"

export const pelaporNotifications: NotificationItem[] = [
  {
    id: "notif-001",
    kind: "status",
    title: "Laporan sedang diproses",
    description: "Laporan fasilitas Anda sudah diteruskan kepada teknisi untuk ditangani.",
    ticketNumber: "LJ-2026-00128",
    reportTitle: "Lampu ruang kelas mati",
    createdAt: "12 menit lalu",
    group: "Hari ini",
    read: false,
  },
  {
    id: "notif-002",
    kind: "response",
    title: "Laporan berhasil diverifikasi",
    description: "Pengelola telah memeriksa informasi laporan dan mulai menindaklanjuti temuan.",
    ticketNumber: "LJ-2026-00114",
    reportTitle: "Kartu identitas tertinggal",
    createdAt: "Kemarin, 14.20",
    group: "Kemarin",
    read: false,
  },
  {
    id: "notif-003",
    kind: "status",
    title: "Laporan telah selesai",
    description: "Kendala layanan yang Anda laporkan telah dinyatakan selesai oleh pengelola.",
    ticketNumber: "LJ-2026-00097",
    reportTitle: "Kendala akses JTI Surat",
    createdAt: "11 September 2026",
    group: "Sebelumnya",
    read: true,
  },
]
