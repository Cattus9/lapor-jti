import { ImageIcon } from "lucide-react"
import { Card, CardContent } from "@/components/ui/card"

// Preserve the canonical Satpam attachment treatment across operational report modals.
export function ReportAttachmentsEmptyState() {
  return (
    <Card className="min-h-24 gap-0 rounded-xl border border-dashed border-border bg-muted/30 py-0 shadow-none ring-0">
      <CardContent className="flex flex-1 items-center gap-3 p-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground">
          <ImageIcon className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground">Tidak ada lampiran</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pelapor tidak menambahkan foto atau dokumen pendukung.</p>
        </div>
      </CardContent>
    </Card>
  )
}
