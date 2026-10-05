import Link from "next/link"
import { CalendarDays, ClipboardList, FilePlus2, ScanSearch } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { ReportPage } from "../application/ports"
import type { ReportListItem } from "../types"
import { lifecycleByCategory, statusLabels } from "../domain/report"
import { PelaporReportDetailDialog } from "./pelapor-report-detail-dialog"
import { ReportCategoryBadge, reportCategoryPresentation } from "./report-category-badge"
import { PelaporReportFilters } from "./pelapor-report-filters"
import { hasReportFilters, reportListHref, type ReportListFilters } from "../domain/report-list-filters"

// [AUTH-ROLE] Presentation only. Pages/APIs enforce role and repository queries enforce ownership.
function ReportRow({ report, selected }: { report: ReportListItem; selected?: string }) {
  const meta = reportCategoryPresentation[report.category]
  const Icon = meta.icon
  const stages = lifecycleByCategory[report.category]
  const stageLabel = report.status === "ditolak" ? "Laporan ditolak" : `Tahap ${Math.max(0, stages.indexOf(report.status)) + 1} dari ${stages.length}`
  return <article className="rounded-xl border border-border bg-background/60 p-4 md:p-5">
    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
      <div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-card"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold md:text-base">{report.title}</h2><div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2"><span className="text-xs text-muted-foreground">{report.ticketNumber}</span><ReportCategoryBadge category={report.category} /></div><p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground"><CalendarDays className="mt-px size-3.5 shrink-0" aria-hidden="true" /><span>Dikirim <time dateTime={report.submittedAtIso}>{report.submittedAt} WIB</time></span></p></div></div>
      <StatusBadge status={statusLabels[report.status]} />
    </div>
    <div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-muted-foreground">{stageLabel} · Terakhir diperbarui {report.updatedAt} WIB</p><PelaporReportDetailDialog key={`${report.id}:${report.ticketNumber === selected}`} report={report} defaultOpen={report.ticketNumber === selected} /></div>
  </article>
}
export function PelaporReportList({ user, data, filters, selectedTicket, cursor, draftCursor }: { user: CurrentUser; data: ReportPage; filters: ReportListFilters; selectedTicket?: string; cursor?: string; draftCursor?: string }) {
  const selectedOutsidePage = data.selected && !data.items.some((item) => item.id === data.selected?.id) ? data.selected : null
  const filtered = hasReportFilters(filters)
  return <DashboardLayout role="pelapor"><ContentShell>
    <PageHeader title="Laporan Saya" description={`Seluruh riwayat laporan milik ${user.name}.`} action={<Button nativeButton={false} render={<Link href="/pelapor/buat-laporan" />}><FilePlus2 />Buat Laporan</Button>} />
    {data.drafts.length || draftCursor ? <Card className="gap-1 rounded-2xl bg-sidebar p-1.5"><div className="rounded-xl border border-border/60 bg-card p-4 md:p-5"><h2 className="text-sm font-semibold">Draft tersimpan</h2><p className="mt-1 text-xs text-muted-foreground">Draft belum dikirim dan tidak mengikuti filter riwayat. Menampilkan maksimal 20 draft per halaman.</p><div className="mt-3 space-y-2">{data.drafts.map((draft) => <Link key={draft.id} href={`/pelapor/buat-laporan?draft=${draft.id}`} className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted"><span className="truncate">{draft.payload.title || "Draft tanpa judul"}</span><span className="shrink-0 text-xs text-primary">Lanjutkan</span></Link>)}</div><div className="mt-3 flex flex-wrap gap-2">{draftCursor ? <Button variant="outline" nativeButton={false} render={<Link href={reportListHref(filters, { cursor })} />}>Draft terbaru</Button> : null}{data.nextDraftCursor ? <Button variant="outline" nativeButton={false} render={<Link href={reportListHref(filters, { cursor, draftCursor: data.nextDraftCursor })} />}>Draft berikutnya</Button> : null}</div></div></Card> : null}
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ClipboardList className="size-4 text-primary" aria-hidden="true" />Riwayat tiket<span className="ml-auto">{data.items.length} laporan{filtered ? " sesuai filter" : ""} pada halaman ini</span></div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="space-y-3 p-4 md:p-5">
        <PelaporReportFilters filters={filters} />
        {selectedOutsidePage ? <div className="space-y-2 border-b border-border/60 pb-4"><p className="text-xs text-muted-foreground">Tiket yang dibuka dari tautan, di luar hasil pada halaman ini.</p><ReportRow report={selectedOutsidePage} selected={selectedTicket} /></div> : null}
        {data.items.map((report) => <ReportRow key={report.id} report={report} selected={selectedTicket} />)}
        {!data.items.length ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center"><ScanSearch className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium">{filtered ? "Tidak ada laporan yang sesuai" : cursor ? "Tidak ada laporan berikutnya" : "Belum ada laporan yang dikirim"}</p><p className="mt-1 text-xs text-muted-foreground">{filtered ? "Ubah pencarian atau gunakan Reset pada filter untuk melihat laporan lainnya." : cursor ? "Kembali ke laporan terbaru untuk melihat riwayat Anda." : "Draft tersimpan akan menjadi laporan setelah Anda mengirimnya."}</p></div> : null}
      </CardContent></div>
    </Card>
    {cursor || data.nextCursor ? <div className="flex flex-wrap items-center justify-between gap-3">{cursor ? <Button variant="outline" nativeButton={false} render={<Link href={reportListHref(filters, { draftCursor })} />}>Kembali ke terbaru</Button> : <span />}{data.nextCursor ? <Button variant="outline" nativeButton={false} render={<Link href={reportListHref(filters, { cursor: data.nextCursor, draftCursor })} />}>Laporan berikutnya</Button> : null}</div> : null}
  </ContentShell></DashboardLayout>
}
