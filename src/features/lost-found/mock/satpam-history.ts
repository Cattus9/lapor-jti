export type SatpamHandoverHistoryItem = {
  id: string
  title: string
  lostTicket: string
  foundTicket: string
  recipient: string
  handler: string
  location: string
  matchedAt: string
  handedOverAt: string
  completedAt: string
  characteristics: string[]
  handoverNote: string
}

export const satpamHandoverHistory: SatpamHandoverHistoryItem[] = [
  {
    id: "match-001",
    title: "Kartu identitas mahasiswa",
    lostTicket: "LJ-2026-00086",
    foundTicket: "LJ-2026-00091",
    recipient: "Nanda Prasetyo",
    handler: "Budi Santoso",
    location: "Pos Satpam Gedung JTI",
    matchedAt: "9 September 2026, 13.40",
    handedOverAt: "9 September 2026, 15.10",
    completedAt: "9 September 2026, 15.15",
    characteristics: ["Nama pemilik pada kartu sesuai", "Lanyard hitam tercantum pada laporan", "Lokasi temuan masih di Gedung JTI"],
    handoverNote: "Barang diterima langsung oleh pelapor setelah identitas diverifikasi.",
  },
  {
    id: "match-002",
    title: "Tumbler stainless hitam",
    lostTicket: "LJ-2026-00074",
    foundTicket: "LJ-2026-00079",
    recipient: "Rizky Maulana",
    handler: "Budi Santoso",
    location: "Pos Satpam Gedung JTI",
    matchedAt: "7 September 2026, 10.20",
    handedOverAt: "7 September 2026, 12.05",
    completedAt: "7 September 2026, 12.10",
    characteristics: ["Warna hitam doff sesuai", "Stiker petir pada badan tumbler sesuai", "Lokasi kelas dan waktu kejadian berdekatan"],
    handoverNote: "Barang diterima oleh pelapor dalam kondisi baik.",
  },
  {
    id: "match-003",
    title: "Kunci motor dengan lanyard biru",
    lostTicket: "LJ-2026-00063",
    foundTicket: "LJ-2026-00067",
    recipient: "Siti Rahma",
    handler: "Dedi Kurniawan",
    location: "Pos Satpam Gedung JTI",
    matchedAt: "3 September 2026, 16.15",
    handedOverAt: "4 September 2026, 08.45",
    completedAt: "4 September 2026, 08.50",
    characteristics: ["Jumlah anak kunci sesuai", "Remote motor hitam sesuai", "Lanyard biru tua sesuai laporan"],
    handoverNote: "Penyerahan dikonfirmasi setelah pelapor menyebutkan ciri kendaraan.",
  },
]
