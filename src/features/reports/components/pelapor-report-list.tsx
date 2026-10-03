import Link from "next/link"
import { ClipboardList, FilePlus2, FileText, Headphones, PackageSearch, Wrench, type LucideIcon } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { ReportPage } from "../application/ports"
import type { ReportCategory, ReportListItem } from "../types"
import { lifecycleByCategory, statusLabels } from "../domain/report"
import { PelaporReportDetailDialog } from "./pelapor-report-detail-dialog"

// [AUTH-ROLE] Presentation only. Pages/APIs enforce role and repository queries enforce ownership.
const categoryMeta: Record<ReportCategory, { label: string; icon: LucideIcon }> = {
  "kehilangan-temuan": { label: "Kehilangan & Temuan", icon: PackageSearch },
  fasilitas: { label: "Fasilitas", icon: Wrench },
  layanan: { label: "Layanan", icon: Headphones },
  lainnya: { label: "Lainnya", icon: FileText },
}
function ReportRow({ report, selected }: { report: ReportListItem; selected?: string }) {
  const meta = categoryMeta[report.category]
  const Icon = meta.icon
  const stages = lifecycleByCategory[report.category]
  const stageLabel = report.status === "ditolak" ? "Laporan ditolak" : `Tahap ${Math.max(0, stages.indexOf(report.status)) + 1} dari ${stages.length}`
  return <article className="rounded-xl border border-border bg-background/60 p-4 md:p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold md:text-base">{report.title}</h2><p className="mt-1 text-xs text-muted-foreground">{report.ticketNumber} · {meta.label}</p></div></div>
      <StatusBadge status={statusLabels[report.status]} />
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{stageLabel} · Diperbarui {report.updatedAt}</p><PelaporReportDetailDialog key={`${report.id}:${report.ticketNumber === selected}`} report={report} defaultOpen={report.ticketNumber === selected} /></div>
  </article>
}
export function PelaporReportList({ user, data, selectedTicket, paginated = false }: { user: CurrentUser; data: ReportPage; selectedTicket?: string; paginated?: boolean }) {
  const selectedOutsidePage = data.selected && !data.items.some((item) => item.id === data.selected?.id) ? data.selected : null
  return <DashboardLayout role="pelapor"><ContentShell>
    <PageHeader title="Laporan Saya" description={`Seluruh riwayat laporan milik ${user.name}.`} action={<Button nativeButton={false} render={<Link href="/pelapor/buat-laporan" />}><FilePlus2 />Buat Laporan</Button>} />
    {data.drafts.length ? <Card className="gap-1 rounded-2xl bg-sidebar p-1.5"><div className="rounded-xl border border-border/60 bg-card p-4 md:p-5"><h2 className="text-sm font-semibold">Draft tersimpan</h2><p className="mt-1 text-xs text-muted-foreground">Draft belum dikirim dan tidak dihitung sebagai laporan. Menampilkan maksimal 20 draft per halaman.</p><div className="mt-3 space-y-2">{data.drafts.map((draft) => <Link key={draft.id} href={`/pelapor/buat-laporan?draft=${draft.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted"><span className="truncate">{draft.payload.title || "Draft tanpa judul"}</span><span className="shrink-0 text-xs text-primary">Lanjutkan</span></Link>)}</div>{data.nextDraftCursor ? <Button variant="outline" nativeButton={false} className="mt-3" render={<Link href={`/pelapor/laporan-saya?draftCursor=${encodeURIComponent(data.nextDraftCursor)}`} />}>Draft berikutnya</Button> : null}</div></Card> : null}
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ClipboardList className="size-4 text-primary" aria-hidden="true" />Riwayat tiket<span className="ml-auto">{data.items.length} laporan pada halaman ini</span></div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="space-y-3 p-4 md:p-5">
        {selectedOutsidePage ? <ReportRow report={selectedOutsidePage} selected={selectedTicket} /> : null}
        {data.items.map((report) => <ReportRow key={report.id} report={report} selected={selectedTicket} />)}
        {!data.items.length ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center"><ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">Belum ada laporan yang dikirim</p><p className="mt-1 text-xs text-muted-foreground">Draft tersimpan akan menjadi laporan setelah Anda mengirimnya.</p></div> : null}
      </CardContent></div>
    </Card>
    {paginated || data.nextCursor ? <div className="flex items-center justify-between gap-3">{paginated ? <Button variant="outline" nativeButton={false} render={<Link href="/pelapor/laporan-saya" />}>Kembali ke terbaru</Button> : <span />}{data.nextCursor ? <Button variant="outline" nativeButton={false} render={<Link href={`/pelapor/laporan-saya?cursor=${encodeURIComponent(data.nextCursor)}`} />}>Laporan berikutnya</Button> : null}</div> : null}
  </ContentShell></DashboardLayout>
}
