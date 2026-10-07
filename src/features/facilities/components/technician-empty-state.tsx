import type { ReactNode } from "react"
import { Building2, History, Inbox, Search } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

type EmptyContext = "priority" | "queue" | "reports" | "history" | "room-priority" | "room-reports"

function presentation(context: EmptyContext, filtered: boolean, unclassifiedReports: number) {
  switch (context) {
    case "queue":
      return { icon: Inbox, title: "Belum ada laporan dalam antrean", description: "Laporan baru dan yang sedang ditangani akan tampil di sini." }
    case "reports":
      return filtered
        ? { icon: Search, title: "Tidak ada laporan yang sesuai", description: "Ubah pencarian atau reset filter untuk melihat laporan lainnya." }
        : { icon: Inbox, title: "Belum ada laporan fasilitas aktif", description: "Laporan baru dan yang sedang ditangani akan tampil di sini. Laporan selesai dan ditolak tersedia di Riwayat." }
    case "history":
      return filtered
        ? { icon: Search, title: "Tidak ada riwayat yang sesuai", description: "Ubah pencarian atau reset filter untuk melihat riwayat lainnya." }
        : { icon: History, title: "Belum ada riwayat perbaikan", description: "Laporan selesai dan ditolak tersedia sebagai arsip penanganan." }
    case "room-priority":
      // The priority API only returns classified, active reports. Empty rooms do not imply an empty database.
      return filtered
        ? { icon: Building2, title: "Tidak ada ruang prioritas untuk status ini", description: "Prioritas ruang hanya mencakup laporan aktif. Pilih status lain atau buka Antrean laporan." }
        : { icon: Building2, title: "Belum ada ruang yang masuk prioritas", description: "Prioritas memerlukan laporan aktif dengan ruang dan objek terdaftar. Laporan dengan isian lainnya dapat dilihat di Antrean laporan." }
    case "room-reports":
      return filtered
        ? { icon: Search, title: "Tidak ada tiket aktif yang sesuai", description: "Pilih status lain atau muat ulang daftar untuk melihat kondisi terbaru." }
        : { icon: Inbox, title: "Belum ada tiket aktif di ruang ini", description: "Data ruang mungkin telah berubah. Muat ulang daftar untuk melihat kondisi terbaru." }
    case "priority":
      return unclassifiedReports > 0
        ? { icon: Building2, title: "Belum ada laporan yang bisa dikelompokkan", description: `${unclassifiedReports} laporan aktif memakai lokasi atau objek di luar daftar.` }
        : { icon: Building2, title: "Belum ada laporan fasilitas aktif", description: "Prioritas ruang akan muncul setelah laporan fasilitas diterima." }
  }
}

export function TechnicianEmptyState({ context, filtered = false, unclassifiedReports = 0, action }: {
  context: EmptyContext
  filtered?: boolean
  unclassifiedReports?: number
  action?: ReactNode
}) {
  const { icon: Icon, title, description } = presentation(context, filtered, unclassifiedReports)

  return (
    <Card className="gap-0 rounded-xl border border-dashed border-border bg-empty-surface py-0 shadow-none ring-0">
      <CardContent className="flex min-h-36 flex-col items-center justify-center gap-3 px-4 py-6 text-center sm:px-6">
        <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="max-w-md space-y-1" aria-live="polite">
          <p className="text-sm font-medium text-foreground">{title}</p>
          <p className="text-xs leading-relaxed text-muted-foreground">{description}</p>
        </div>
        {action}
      </CardContent>
    </Card>
  )
}
