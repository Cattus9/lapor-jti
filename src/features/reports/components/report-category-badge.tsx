import { FileText, Headphones, PackageSearch, Wrench } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import type { ReportCategory } from "../types"

// Category identity stays softer than the shared lifecycle StatusBadge.
// Match the category colors used in the report form, including dark mode.
export const reportCategoryPresentation = {
  "kehilangan-temuan": { label: "Kehilangan & Temuan", icon: PackageSearch, className: "border-blue-200/70 bg-blue-50/70 text-blue-700 dark:border-blue-800/70 dark:bg-blue-950/40 dark:text-blue-300" },
  fasilitas: { label: "Fasilitas", icon: Wrench, className: "border-emerald-200/70 bg-emerald-50/70 text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-950/40 dark:text-emerald-300" },
  layanan: { label: "Layanan", icon: Headphones, className: "border-violet-200/70 bg-violet-50/70 text-violet-700 dark:border-violet-800/70 dark:bg-violet-950/40 dark:text-violet-300" },
  lainnya: { label: "Lainnya", icon: FileText, className: "border-orange-200/70 bg-orange-50/70 text-orange-700 dark:border-orange-800/70 dark:bg-orange-950/40 dark:text-orange-300" },
} satisfies Record<ReportCategory, { label: string; icon: typeof FileText; className: string }>

export function ReportCategoryBadge({ category }: { category: ReportCategory }) {
  const { label, icon: Icon, className } = reportCategoryPresentation[category]
  return <Badge variant="outline" className={className}><Icon aria-hidden="true" /><span className="sr-only">Kategori: </span>{label}</Badge>
}
