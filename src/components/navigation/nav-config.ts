import {
  Archive,
  BellRing,
  ChartNoAxesCombined,
  ClipboardCheck,
  Inbox,
  LifeBuoy,
  MapPinned,
  Settings2,
  UserRoundCog,
} from "lucide-react"
import type { AppRole } from "@/lib/auth/roles"
import type { NavigationItem } from "./nav-types"

const common = [
  { title: "Notifikasi", url: "#", icon: BellRing },
  { title: "Profil", url: "#", icon: UserRoundCog },
]

export const navigationByRole: Record<AppRole, NavigationItem[]> = {
  pelapor: [
    { title: "Ringkasan", url: "/pelapor/dashboard", icon: ChartNoAxesCombined },
    { title: "Laporan Masuk", url: "#", icon: Inbox },
    { title: "Buat Laporan", url: "#", icon: ClipboardCheck },
    { title: "Laporan Saya", url: "#", icon: Archive },
    ...common,
  ],
  satpam: [
    { title: "Ringkasan", url: "/satpam/dashboard", icon: ChartNoAxesCombined },
    { title: "Kehilangan & Temuan", url: "#", icon: Inbox },
    { title: "Riwayat", url: "#", icon: Archive },
    ...common,
  ],
  teknisi: [
    { title: "Ringkasan", url: "/teknisi/dashboard", icon: ChartNoAxesCombined },
    { title: "Laporan Fasilitas", url: "#", icon: ClipboardCheck },
    { title: "Riwayat Perbaikan", url: "#", icon: Archive },
    ...common,
  ],
  manajemen: [
    { title: "Ringkasan", url: "/manajemen/dashboard", icon: ChartNoAxesCombined },
    { title: "Laporan Layanan", url: "#", icon: Inbox },
    { title: "Laporan Lainnya", url: "#", icon: Archive },
    { title: "Monitoring", url: "#", icon: MapPinned },
    { title: "Statistik", url: "#", icon: ChartNoAxesCombined },
    ...common,
  ],
  admin: [
    { title: "Ringkasan", url: "/admin/dashboard", icon: ChartNoAxesCombined },
    { title: "Pengguna", url: "#", icon: UserRoundCog },
    { title: "Kategori Laporan", url: "#", icon: ClipboardCheck },
    { title: "Lokasi", url: "#", icon: MapPinned },
    { title: "Pengaturan Sistem", url: "#", icon: Settings2 },
    { title: "Log Aktivitas", url: "#", icon: Archive },
    ...common,
  ],
}

export const helpNavigation = [{ title: "Pusat Bantuan", url: "#", icon: LifeBuoy }]
