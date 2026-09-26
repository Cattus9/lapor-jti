export type SatpamHandoverHistoryItem = {
  id: string
  title: string
  itemCategory: string
  itemDescription: string
  lostTicket: string
  foundTicket: string
  lostPhotoUrl?: string
  foundPhotoUrl?: string
  recipient: string
  handler: string
  location: string
  matchedAt: string
  handedOverAt: string
  handedOverAtIso: string
  completedAt: string
  handoverNote: string
}

export const satpamHandoverHistory: SatpamHandoverHistoryItem[] = [
  {
    id: "match-001",
    title: "Kartu identitas mahasiswa",
    itemCategory: "Kartu identitas",
    itemDescription: "Lanyard hitam dan nama pemilik tercetak pada kartu.",
    lostTicket: "LJ-2026-00086",
    foundTicket: "LJ-2026-00091",
    recipient: "Nanda Prasetyo",
    handler: "Budi Santoso",
    location: "Pos Satpam Gedung JTI",
    matchedAt: "9 September 2026, 13.40",
    handedOverAt: "9 September 2026, 15.10",
    handedOverAtIso: "2026-09-09T15:10:00",
    completedAt: "9 September 2026, 15.15",
    handoverNote: "Barang diterima langsung oleh pelapor setelah identitas diverifikasi.",
  },
  {
    id: "match-002",
    title: "Tumbler stainless hitam",
    itemCategory: "Tumbler",
    itemDescription: "Permukaan hitam doff dan stiker petir pada badan.",
    lostTicket: "LJ-2026-00074",
    foundTicket: "LJ-2026-00079",
    recipient: "Rizky Maulana",
    handler: "Budi Santoso",
    location: "Pos Satpam Gedung JTI",
    matchedAt: "7 September 2026, 10.20",
    handedOverAt: "7 September 2026, 12.05",
    handedOverAtIso: "2026-09-07T12:05:00",
    completedAt: "7 September 2026, 12.10",
    handoverNote: "Barang diterima oleh pelapor dalam kondisi baik.",
  },
  {
    id: "match-003",
    title: "Kunci motor dengan lanyard biru",
    itemCategory: "Kunci kendaraan",
    itemDescription: "Remote hitam dan lanyard kain berwarna biru tua.",
    lostTicket: "LJ-2026-00063",
    foundTicket: "LJ-2026-00067",
    recipient: "Siti Rahma",
    handler: "Dedi Kurniawan",
    location: "Pos Satpam Gedung JTI",
    matchedAt: "3 September 2026, 16.15",
    handedOverAt: "4 September 2026, 08.45",
    handedOverAtIso: "2026-09-04T08:45:00",
    completedAt: "4 September 2026, 08.50",
    handoverNote: "Penyerahan dikonfirmasi setelah pelapor menyebutkan ciri kendaraan.",
  },
]
