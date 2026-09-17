import type { NotificationItem } from "@/features/notifications/types"

export const technicianNotifications: NotificationItem[] = [
  {
    id: "teknisi-notif-001",
    kind: "status",
    title: "Laporan fasilitas baru masuk",
    description: "Laporan lampu ruang kelas mati menunggu verifikasi lokasi dan kondisi fasilitas.",
    ticketNumber: "LJ-2026-00142",
    reportTitle: "Lampu ruang kelas mati",
    createdAt: "9 menit lalu",
    group: "Hari ini",
    read: false,
  },
  {
    id: "teknisi-notif-002",
    kind: "response",
    title: "Perbaikan perlu dilanjutkan",
    description: "AC Laboratorium Jaringan sudah diverifikasi dan siap ditangani oleh Teknisi.",
    ticketNumber: "LJ-2026-00139",
    reportTitle: "AC Laboratorium Jaringan tidak dingin",
    createdAt: "31 menit lalu",
    group: "Hari ini",
    read: false,
  },
  {
    id: "teknisi-notif-003",
    kind: "status",
    title: "Laporan perbaikan selesai",
    description: "Riwayat perbaikan kursi kuliah telah dicatat dan dapat ditinjau kembali.",
    ticketNumber: "LJ-2026-00125",
    reportTitle: "Kursi kuliah rusak",
    createdAt: "Kemarin, 15.20",
    group: "Kemarin",
    read: true,
  },
]
