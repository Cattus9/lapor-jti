import { Archive, BellRing, ChartColumnIncreasing, ChartNoAxesCombined, ClipboardCheck, FileSpreadsheet, Inbox, LifeBuoy, MapPinned, Settings2, UserRoundCog, UsersRound, Wrench } from "lucide-react"
// [AUTH-ROLE] Pemetaan navigasi menurut role internal aplikasi, independen dari metode login.
// Menyembunyikan menu tidak mengamankan endpoint; pertahankan pemeriksaan role di server.
import type { AppRole } from "@/lib/auth/roles"
import type { NavigationItem } from "./nav-types"

const common = [
  { title: "Notifikasi", url: "#", icon: BellRing },
  { title: "Profil", url: "#", icon: UserRoundCog },
]

export const navigationByRole: Record<AppRole, NavigationItem[]> = {
  pelapor: [
    { title: "Ringkasan", url: "/pelapor/dashboard", icon: ChartNoAxesCombined },
    { title: "Buat Laporan", url: "/pelapor/buat-laporan", icon: ClipboardCheck },
    { title: "Laporan Saya", url: "/pelapor/laporan-saya", icon: Archive },
    { title: "Notifikasi", url: "/pelapor/notifikasi", icon: BellRing },
    { title: "Profil", url: "/pelapor/profil", icon: UserRoundCog },
  ],
  satpam: [
    { title: "Ringkasan", url: "/satpam/dashboard", icon: ChartNoAxesCombined },
    { title: "Kehilangan & Temuan", url: "/satpam/kehilangan-temuan", icon: Inbox },
    { title: "Riwayat", url: "/satpam/riwayat", icon: Archive },
    { title: "Notifikasi", url: "/satpam/notifikasi", icon: BellRing },
    { title: "Profil", url: "/satpam/profil", icon: UserRoundCog },
  ],
  teknisi: [
    { title: "Ringkasan", url: "/teknisi/dashboard", icon: ChartNoAxesCombined },
    { title: "Laporan Fasilitas", url: "/teknisi/laporan-fasilitas", icon: Wrench },
    { title: "Riwayat Perbaikan", url: "/teknisi/riwayat", icon: Archive },
    { title: "Notifikasi", url: "/teknisi/notifikasi", icon: BellRing },
    { title: "Profil", url: "/teknisi/profil", icon: UserRoundCog },
  ],
  manajemen: [
    { title: "Ringkasan", url: "/manajemen/dashboard", icon: ChartNoAxesCombined, group: "Operasional" },
    { title: "Kelola Laporan", url: "/manajemen/laporan", icon: ClipboardCheck, group: "Operasional" },
    { title: "Monitoring", url: "/manajemen/monitoring", icon: MapPinned, group: "Operasional" },
    { title: "Statistik", url: "/manajemen/statistik", icon: ChartColumnIncreasing, group: "Analisis" },
    { title: "Rekap Laporan", url: "/manajemen/rekap-laporan", icon: FileSpreadsheet, group: "Analisis" },
    { title: "Kelola Pengguna", url: "/manajemen/pengguna", icon: UsersRound, group: "Administrasi" },
    { title: "Pengaturan Operasional", url: "/manajemen/pengaturan", icon: Settings2, group: "Administrasi" },
    { title: "Notifikasi", url: "/manajemen/notifikasi", icon: BellRing, group: "Akun" },
    { title: "Profil", url: "/manajemen/profil", icon: UserRoundCog, group: "Akun" },
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
