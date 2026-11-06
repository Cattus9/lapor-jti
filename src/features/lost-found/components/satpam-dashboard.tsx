import { ArrowRight, ClipboardCheck, Clock3, Handshake, Inbox, PackageSearch, SearchCheck, ShieldCheck } from "lucide-react"
import Link from "next/link"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { UnopenedReportBadge } from "@/components/reports/report-opening"
import type { SatpamDashboardData, SatpamQueueReport } from "../types"
import type { CurrentUser } from "@/lib/auth/current-user"

function QueueReport({ report }: { report: SatpamQueueReport }) {
  const isFound = report.kind === "temuan"
  const type = isFound ? "Temuan" : "Kehilangan"
  const Icon = isFound ? Inbox : PackageSearch
  const isNew = report.status === "Baru"

  return (
    <Card className="gap-3 py-0 flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
            {isNew ? (
              <Badge variant="outline" tone="info" className="text-[10px] px-1.5 py-0">
                Belum ditindak
              </Badge>
            ) : null}
          </div>
          <p className="mt-1 truncate text-xs text-muted-foreground">
            {type} · {report.location}
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <span className="text-xs text-muted-foreground">Dikirim {report.submittedAt} WIB</span>
          <UnopenedReportBadge unseen={report.unopened} />
          <StatusBadge status={report.status} />
        </div>
        <Button
          nativeButton={false}
          variant="outline"
          size="xs"
          className="rounded-lg border-primary/20 bg-primary/5 text-primary-action-hover hover:bg-primary/10 hover:text-primary-action-hover dark:bg-primary/10 dark:text-primary dark:hover:bg-primary/15 dark:hover:text-primary"
          aria-label={`Lihat detail laporan ${report.title}, dikirim ${report.submittedAt}`}
          render={<Link href={`/satpam/kehilangan-temuan?ticket=${encodeURIComponent(report.ticket)}&detail=1`} />}
        >
          Detail
          <ArrowRight aria-hidden="true" />
        </Button>
      </div>
    </Card>
  )
}

export function SatpamPriorityQueue({
  queue,
  updatedAt,
  unhandledCount,
}: Pick<SatpamDashboardData, "queue" | "updatedAt"> & { unhandledCount?: number }) {
  return (
    <SectionCard
      title="Prioritas penanganan"
      icon={ClipboardCheck}
      meta={
        <span className="flex items-center gap-2">
          {unhandledCount ? (
            <Badge variant="outline" tone="info" className="text-[11px] font-normal">
              {unhandledCount} belum ditindak
            </Badge>
          ) : null}
          <span>Diperbarui {updatedAt}</span>
        </span>
      }
      className="xl:col-span-2"
    >
      <p className="mb-4 text-sm text-muted-foreground">
        Laporan kehilangan dan temuan baru yang belum ditindaklanjuti atau baru masuk, diprioritaskan untuk segera diperiksa.
      </p>
      {queue.length ? (
        <div className="space-y-2">
          {queue.map((report) => (
            <QueueReport key={report.ticket} report={report} />
          ))}
        </div>
      ) : (
        <CollectionEmptyState
          icon={ClipboardCheck}
          title="Tidak ada laporan aktif"
          description="Laporan kehilangan dan temuan yang perlu ditangani akan muncul di sini."
        />
      )}
    </SectionCard>
  )
}

export function SatpamDashboard({ user, data }: { user: CurrentUser; data: SatpamDashboardData }) {
  const newLossCount = data.newLossReports ?? 0
  const unhandledTotal = data.unhandledReports ?? (data.newFindings + newLossCount)

  return (
    <DashboardLayout role="satpam">
      <ContentShell>
        <PageHeader title="Dashboard Satpam" description={`Selamat datang, ${user.name}. Pantau laporan kehilangan dan temuan JTI.`} />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            href="/satpam/kehilangan-temuan"
            label="Laporan kehilangan"
            value={data.lostReports}
            icon={PackageSearch}
            iconTone="amber"
            detail={newLossCount > 0 ? "Belum ditindak" : "Belum selesai"}
            detailValue={newLossCount > 0 ? `${newLossCount} baru` : (data.lostReports ? "Aktif" : "Tidak ada")}
            detailTone="amber"
          />
          <KpiCard
            href="/satpam/kehilangan-temuan"
            label="Temuan baru"
            value={data.newFindings}
            icon={Inbox}
            detail="Menunggu penerimaan"
            detailValue={`${data.newFindings} item`}
            detailTone="blue"
          />
          <KpiCard
            href="/satpam/kehilangan-temuan"
            label="Pasangan siap diserahkan"
            value={data.readyForHandover}
            icon={Handshake}
            iconTone="green"
            detail="Menunggu pelapor"
            detailValue={`${data.readyForHandover} pasangan`}
            detailTone="green"
          />
          <KpiCard
            href="/satpam/inventaris"
            label="Barang tersimpan di pos"
            value={data.storedItems}
            icon={Inbox}
            detail="Inventaris fisik"
            detailValue={`${data.storedItems} barang`}
            detailTone="blue"
          />
        </div>
        <div className="grid items-start gap-6 xl:grid-cols-3">
          <SatpamPriorityQueue queue={data.queue} updatedAt={data.updatedAt} unhandledCount={unhandledTotal} />
          <SectionCard title="Fokus penanganan" icon={ShieldCheck} contentClassName="space-y-3">
            <p className="text-sm text-muted-foreground">Panduan penanganan kehilangan dan temuan.</p>
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <SearchCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="text-sm font-medium text-foreground">Terima temuan baru</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pastikan detail lokasi dan ciri-ciri barang sudah lengkap.</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="text-sm font-medium text-foreground">Cocokkan laporan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Bandingkan temuan dengan laporan kehilangan yang aktif.</p></div>
            </div>
            <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
              <Handshake className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
              <div><p className="text-sm font-medium text-foreground">Siapkan penyerahan</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Hubungi pelapor setelah barang cocok.</p></div>
            </div>
          </SectionCard>
        </div>
      </ContentShell>
    </DashboardLayout>
  )
}
