export type SatpamReportKind = "kehilangan" | "temuan"

export type SatpamReportStatus =
  | "Baru"
  | "Diverifikasi"
  | "Diproses"
  | "Barang teridentifikasi"
  | "Diserahkan"
  | "Selesai"
  | "Ditolak"

export type SatpamLostFoundReport = {
  ticket: string
  kind: SatpamReportKind
  title: string
  reporter: string
  location: string
  eventDate: string
  eventTime: string
  submittedAt: string
  updatedAt: string
  status: SatpamReportStatus
  description: string
  characteristics: string
  attachments: number
  photoUrl?: string
}

export type SatpamPendingHandover = {
  lossTicket: string
  foundTicket: string
  title: string
  reporter: string
  matchedAt: string
}

export const satpamPendingHandovers: SatpamPendingHandover[] = [
  {
    lossTicket: "LJ-2026-00107",
    foundTicket: "LJ-2026-00108",
    title: "Tumbler stainless hitam",
    reporter: "Dimas Aditya",
    matchedAt: "13 September 2026, 17.25",
  },
]

export const satpamLostFoundReports: SatpamLostFoundReport[] = [
  {
    ticket: "LJ-2026-00131",
    kind: "kehilangan",
    title: "Dompet kulit hitam",
    reporter: "Raka Pratama",
    location: "Ruang 3.2",
    eventDate: "15 September 2026",
    eventTime: "10.15",
    submittedAt: "Hari ini, 09.02",
    updatedAt: "8 menit lalu",
    status: "Baru",
    description: "Dompet diduga tertinggal setelah kelas selesai. Di dalamnya terdapat kartu mahasiswa dan beberapa kartu akses.",
    characteristics: "Kulit warna hitam, lipatan dua, terdapat jahitan cokelat pada sisi luar.",
    attachments: 0,
  },
  {
    ticket: "LJ-2026-00126",
    kind: "kehilangan",
    title: "Kartu identitas mahasiswa",
    reporter: "Ayu Santoso",
    location: "Gedung JTI, Ruang 3.4",
    eventDate: "14 September 2026",
    eventTime: "13.15",
    submittedAt: "Kemarin, 14.10",
    updatedAt: "22 menit lalu",
    status: "Diproses",
    description: "Kartu identitas diperkirakan tertinggal setelah perkuliahan siang. Pelapor meminta informasi apabila ada temuan yang sesuai.",
    characteristics: "Kartu berwarna biru dengan tali lanyard hitam dan nama Ayu Santoso.",
    attachments: 0,
  },
  {
    ticket: "LJ-2026-00107",
    kind: "kehilangan",
    title: "Tumbler stainless hitam",
    reporter: "Dimas Aditya",
    location: "Ruang 3.7",
    eventDate: "13 September 2026",
    eventTime: "16.30",
    submittedAt: "13 September, 17.10",
    updatedAt: "Kemarin",
    status: "Barang teridentifikasi",
    description: "Tumbler tertinggal di meja bagian belakang kelas setelah sesi praktikum.",
    characteristics: "Stainless hitam doff, tutup ulir, terdapat stiker kecil berbentuk petir.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00129",
    kind: "temuan",
    title: "Kartu identitas mahasiswa",
    reporter: "Nadia Putri",
    location: "Lobi Gedung JTI",
    eventDate: "15 September 2026",
    eventTime: "12.50",
    submittedAt: "Hari ini, 08.40",
    updatedAt: "22 menit lalu",
    status: "Diproses",
    description: "Kartu ditemukan di area tempat duduk dekat pintu masuk lobi dan telah diserahkan ke pos Satpam.",
    characteristics: "Kartu berwarna biru dengan tali lanyard hitam. Nama pada kartu: Ayu Santoso.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00108",
    kind: "temuan",
    title: "Tumbler stainless hitam",
    reporter: "Nadia Putri",
    location: "Ruang 3.7",
    eventDate: "13 September 2026",
    eventTime: "17.00",
    submittedAt: "13 September, 17.15",
    updatedAt: "13 September",
    status: "Barang teridentifikasi",
    description: "Tumbler ditemukan setelah sesi praktikum dan disimpan di pos Satpam.",
    characteristics: "Stainless hitam doff, tutup ulir, dan stiker kecil berbentuk petir.",
    attachments: 1,
  },
  {
    ticket: "LJ-2026-00118",
    kind: "temuan",
    title: "Kunci motor dengan lanyard biru",
    reporter: "Petugas parkir JTI",
    location: "Area parkir timur",
    eventDate: "14 September 2026",
    eventTime: "17.05",
    submittedAt: "Kemarin, 17.30",
    updatedAt: "Kemarin",
    status: "Diserahkan",
    description: "Satu set kunci motor ditemukan di dekat parkiran baris timur dan disimpan di pos Satpam.",
    characteristics: "Dua anak kunci, remote hitam, lanyard kain warna biru tua.",
    attachments: 2,
  },
  {
    ticket: "LJ-2026-00099",
    kind: "temuan",
    title: "Dompet kulit cokelat",
    reporter: "Rendi Akbar",
    location: "Koridor lantai 2",
    eventDate: "13 September 2026",
    eventTime: "11.25",
    submittedAt: "13 September, 11.45",
    updatedAt: "2 hari lalu",
    status: "Baru",
    description: "Dompet ditemukan di koridor lantai dua dan langsung diserahkan kepada petugas Satpam.",
    characteristics: "Kulit cokelat tua, lipatan dua, tanpa kartu identitas yang terlihat.",
    attachments: 1,
  },
]
