import type { NotificationItem } from "@/features/notifications/types"

export const satpamNotifications: NotificationItem[] = [
  {
    id: "satpam-notif-001",
    kind: "status",
    title: "Temuan baru perlu diverifikasi",
    description: "Satu kartu identitas mahasiswa telah diserahkan ke Pos Satpam Gedung JTI.",
    ticketNumber: "LJ-2026-00129",
    reportTitle: "Kartu identitas mahasiswa",
    createdAt: "22 menit lalu",
    group: "Hari ini",
    read: false,
  },
  {
    id: "satpam-notif-002",
    kind: "response",
    title: "Pencocokan barang berhasil dicatat",
    description: "Laporan kehilangan dan temuan kartu identitas telah terhubung. Lanjutkan ke proses penyerahan.",
    ticketNumber: "LJ-2026-00126",
    reportTitle: "Kartu identitas mahasiswa",
    createdAt: "Hari ini, 10.10",
    group: "Hari ini",
    read: false,
  },
  {
    id: "satpam-notif-003",
    kind: "status",
    title: "Penyerahan barang selesai",
    description: "Kunci motor dengan lanyard biru sudah diterima pelapor dan dipindahkan ke Riwayat.",
    ticketNumber: "LJ-2026-00118",
    reportTitle: "Kunci motor dengan lanyard biru",
    createdAt: "Kemarin, 16.30",
    group: "Kemarin",
    read: true,
  },
]
