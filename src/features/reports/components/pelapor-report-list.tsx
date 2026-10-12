import Link from "next/link"
import { ClipboardList, FilePlus2 } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { ReportPage } from "../application/ports"
import { PelaporReportFilters } from "./pelapor-report-filters"
import { PelaporReportHistoryList } from "./pelapor-report-history-list"
import { hasReportFilters, reportListHref, type ReportListFilters } from "../domain/report-list-filters"

export function PelaporReportList({
  user,
  data,
  filters,
  selectedTicket,
  cursor,
  draftCursor,
}: {
  user: CurrentUser
  data: ReportPage
  filters: ReportListFilters
  selectedTicket?: string
  cursor?: string
  draftCursor?: string
}) {
  const filtered = hasReportFilters(filters)

  return (
    <DashboardLayout role="pelapor">
      <ContentShell>
        <PageHeader
          title="Laporan Saya"
          description={`Seluruh riwayat laporan milik ${user.name}.`}
          action={
            <Button nativeButton={false} render={<Link href="/pelapor/buat-laporan" />}>
              <FilePlus2 />
              Buat Laporan
            </Button>
          }
        />

        {data.drafts.length || draftCursor ? (
          <Card className="gap-1 rounded-2xl bg-sidebar p-1.5">
            <div className="rounded-xl border border-border/60 bg-card p-4 md:p-5">
              <h2 className="text-sm font-semibold">Draft tersimpan</h2>
              <p className="mt-1 text-xs text-muted-foreground">
                Draft belum dikirim dan tidak mengikuti filter riwayat. Menampilkan maksimal 20 draft per halaman.
              </p>
              <div className="mt-3 space-y-2">
                {data.drafts.map((draft) => (
                  <Link
                    key={draft.id}
                    href={`/pelapor/buat-laporan?draft=${draft.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg border p-3 text-sm hover:bg-muted"
                  >
                    <span className="truncate">{draft.payload.title || "Draft tanpa judul"}</span>
                    <span className="shrink-0 text-xs text-primary">Lanjutkan</span>
                  </Link>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {draftCursor ? (
                  <Button variant="outline" nativeButton={false} render={<Link href={reportListHref(filters, { cursor })} />}>
                    Draft terbaru
                  </Button>
                ) : null}
                {data.nextDraftCursor ? (
                  <Button
                    variant="outline"
                    nativeButton={false}
                    render={<Link href={reportListHref(filters, { cursor, draftCursor: data.nextDraftCursor })} />}
                  >
                    Draft berikutnya
                  </Button>
                ) : null}
              </div>
            </div>
          </Card>
        ) : null}

        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
            <ClipboardList className="size-4 text-primary" aria-hidden="true" />
            {data.month ? "Riwayat laporan per bulan" : filters.status === "belum-selesai" ? "Laporan dalam proses" : "Riwayat laporan"}
            <span className="ml-auto">
              {data.month
                ? `Bulan ${data.monthLabel}`
                : filters.status === "belum-selesai"
                ? `${data.items.length} laporan aktif`
                : `${data.items.length} laporan${filtered ? " sesuai filter" : ""}`}
            </span>
          </div>
          <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardContent className="space-y-3 p-4 md:p-5">
              <PelaporReportFilters filters={filters} />
              <PelaporReportHistoryList
                key={`${data.month ?? "flat"}:${filters.q}:${filters.category}:${filters.status}:${filters.period}:${filters.from}:${filters.to}`}
                data={data}
                filters={filters}
                selectedTicket={selectedTicket}
                cursor={cursor}
                draftCursor={draftCursor}
              />
            </CardContent>
          </div>
        </Card>
      </ContentShell>
    </DashboardLayout>
  )
}
