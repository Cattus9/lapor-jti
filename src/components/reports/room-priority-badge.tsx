import { Badge } from "@/components/ui/badge"

/** Relative report concentration, not technical severity or a persisted lifecycle status. */
export function RoomPriorityBadge({ count, highest, historical = false }: { count: number; highest: number; historical?: boolean }) {
  if (count <= 0) return null
  const primary = count > 0 && count === highest
  const label = primary ? "Prioritas utama" : "Prioritas berikutnya"

  return (
    <Badge variant="outline" tone={primary ? "destructive" : "neutral"} className="shrink-0" title={`${label} berdasarkan ${historical ? "total laporan seluruh status pada periode terpilih" : "jumlah laporan aktif"}, bukan tingkat risiko teknis.`}>
      {label}
    </Badge>
  )
}
