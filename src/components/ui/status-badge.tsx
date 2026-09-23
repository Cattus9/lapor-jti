import type { ComponentProps, ReactNode } from "react"
import { Badge, type BadgeTone } from "@/components/ui/badge"

const statusTones: Record<string, BadgeTone> = {
  Baru: "neutral",
  baru: "neutral",
  "Perlu diverifikasi": "warning",
  Diverifikasi: "warning",
  diverifikasi: "warning",
  Diproses: "info",
  diproses: "info",
  "Sedang Diproses": "info",
  "Barang teridentifikasi": "cyan",
  Ditemukan: "cyan",
  Dicocokkan: "cyan",
  Diserahkan: "success",
  Selesai: "success",
  selesai: "success",
  Ditolak: "destructive",
}

type StatusBadgeProps = Omit<ComponentProps<typeof Badge>, "children" | "tone"> & {
  status: string
  children?: ReactNode
}

function StatusBadge({ status, children, ...props }: StatusBadgeProps) {
  return (
    <Badge variant="outline" tone={statusTones[status] ?? "neutral"} {...props}>
      {children ?? status}
    </Badge>
  )
}

export { StatusBadge }
