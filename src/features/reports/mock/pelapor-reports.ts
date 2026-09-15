import type { ReportSummary } from "@/features/reports/types"

export const pelaporReports: ReportSummary[] = [
  {
    ticketNumber: "LJ-2026-00128",
    title: "Lampu ruang kelas mati",
    category: "fasilitas",
    status: "diproses",
    updatedAt: "12 menit lalu",
    detail: {
      incidentDate: "15 September 2026",
      incidentTime: "08.30",
      location: "Ruang 3.4",
      description: "Lampu di bagian depan ruang kelas tidak menyala sejak sesi perkuliahan pagi. Kondisi ruangan menjadi kurang terang saat proyektor digunakan.",
      fields: [{ label: "Jenis fasilitas", value: "Lampu" }, { label: "Area tambahan", value: "Lantai 3" }],
      attachments: [{ name: "kondisi-lampu-ruang-3-4.jpg", type: "image" }],
    },
  },
  {
    ticketNumber: "LJ-2026-00114",
    title: "Kartu identitas tertinggal",
    category: "kehilangan-temuan",
    status: "diverifikasi",
    updatedAt: "Kemarin",
    detail: {
      incidentDate: "14 September 2026",
      incidentTime: "13.15",
      location: "Gedung JTI, Ruang 3.4",
      description: "Kartu identitas diperkirakan tertinggal setelah perkuliahan siang. Mohon informasi apabila kartu ditemukan oleh petugas atau mahasiswa lain.",
      fields: [{ label: "Jenis laporan", value: "Kehilangan" }, { label: "Nama barang", value: "Kartu identitas mahasiswa" }, { label: "Ciri-ciri barang", value: "Kartu berwarna biru dengan tali lanyard hitam" }],
      attachments: [],
    },
  },
  {
    ticketNumber: "LJ-2026-00097",
    title: "Kendala akses JTI Surat",
    category: "layanan",
    status: "selesai",
    updatedAt: "3 hari lalu",
    detail: {
      incidentDate: "11 September 2026",
      incidentTime: "10.00",
      location: "Portal JTI Surat",
      description: "Halaman JTI Surat menampilkan pesan gagal memuat ketika mencoba mengakses dokumen pengajuan. Kendala terjadi melalui jaringan kampus.",
      fields: [{ label: "Jenis layanan", value: "JTI Surat" }, { label: "Unit atau program studi", value: "TIF" }],
      attachments: [{ name: "tangkapan-layar-kendala.png", type: "image" }],
    },
  },
]
