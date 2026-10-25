import { FileText, Headphones, PackageSearch, Wrench } from "lucide-react"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import type { ReportCategory } from "../types"

// Category identity stays softer than the shared lifecycle StatusBadge.
// Match the category colors used in the report form, including dark mode.
export const reportCategoryPresentation = {
  "kehilangan-temuan": { label: "Kehilangan & Temuan", icon: PackageSearch, tone: "info" },
  fasilitas: { label: "Kerusakan Fasilitas", icon: Wrench, tone: "success" },
  layanan: { label: "Layanan", icon: Headphones, tone: "violet" },
  lainnya: { label: "Lainnya", icon: FileText, tone: "warning" },
} satisfies Record<ReportCategory, { label: string; icon: typeof FileText; tone: BadgeTone }>

export function ReportCategoryBadge({ category }: { category: ReportCategory }) {
  const { label, icon: Icon, tone } = reportCategoryPresentation[category]
  return <Badge variant="outline" tone={tone}><Icon aria-hidden="true" /><span className="sr-only">Kategori: </span>{label}</Badge>
}
