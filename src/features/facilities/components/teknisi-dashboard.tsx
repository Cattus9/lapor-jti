import Link from "next/link"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.
import { ArrowRight, Building2, ClipboardList, CircleCheckBig, MapPin, ScanSearch, Wrench } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TechnicianPriorityAnalysis } from "@/features/facilities/components/technician-priority-analysis"
import { TechnicianEmptyState } from "./technician-empty-state"
import type { TechnicianDashboardData } from "@/features/facilities/types"
import type { CurrentUser } from "@/lib/auth/current-user"

export function TeknisiDashboard({ user, data: technicianOverview }: { user: CurrentUser; data: TechnicianDashboardData }) {
  const technicianRepairQueue = technicianOverview.queue
  return (
    <DashboardLayout role="teknisi">
      <ContentShell>
        <PageHeader
          title="Dashboard Teknisi"
          description={`Selamat datang, ${user.name}. Tinjau prioritas ruang dan kelola antrean fasilitas JTI.`}
          action={
            <Button nativeButton={false} render={<Link href="/teknisi/laporan-fasilitas" />} size="sm" className="shrink-0">
              <ClipboardList />
              Kelola laporan
            </Button>
          }
        />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <KpiCard
            label="Laporan baru"
            value={technicianOverview.newReports}
            icon={ScanSearch}
            detail="Perlu diverifikasi"
            detailValue={`${technicianOverview.newReports} laporan`}
            href="/teknisi/laporan-fasilitas"
          />
          <KpiCard
            label="Dalam penanganan"
            value={technicianOverview.inProgress}
            icon={Wrench}
            iconTone="amber"
            detail="Perbaikan aktif"
            detailValue={`${technicianOverview.inProgress} pekerjaan`}
            href="/teknisi/laporan-fasilitas"
          />
          <KpiCard
            label="Ruang terdampak"
            value={technicianOverview.affectedRooms}
            icon={Building2}
            iconTone="red"
            detail={technicianOverview.priorities.length ? "Prioritas utama" : "Prioritas ruang"}
            detailValue={technicianOverview.priorities.length ? technicianOverview.priorityRoom : technicianOverview.unclassifiedReports ? "Belum terpetakan" : "Belum ada"}
            href="/teknisi/laporan-fasilitas?view=priority"
          />
          <KpiCard
            label="Selesai hari ini"
            value={technicianOverview.completedToday}
            icon={CircleCheckBig}
            iconTone="green"
            detail="Catatan tersimpan"
            detailValue={`${technicianOverview.completedToday} laporan`}
            href="/teknisi/riwayat"
          />
        </div>

        <TechnicianPriorityAnalysis rooms={technicianOverview.priorities} unclassifiedReports={technicianOverview.unclassifiedReports} />

        <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
          <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
            <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                    <ClipboardList className="size-4" aria-hidden="true" />
                  </span>
                  <div>
                    <CardTitle className="text-base">Antrean perbaikan</CardTitle>
                    <p className="mt-1 text-sm text-muted-foreground">Laporan fasilitas yang membutuhkan tindakan teknis.</p>
                  </div>
                </div>
                <Button nativeButton={false} render={<Link href="/teknisi/laporan-fasilitas?view=queue" />} variant="link" size="sm" className="self-end px-0 text-primary-action-hover sm:self-auto dark:text-primary" aria-label="Lihat semua laporan dalam antrean perbaikan">
                  Lihat semua
                  <ArrowRight aria-hidden="true" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2 p-4 md:p-5">
              {technicianRepairQueue.map((item) => (
                <article key={item.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                      <Wrench className="size-4" aria-hidden="true" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-foreground">{item.title}</p>
                      <p className="mt-1 flex min-w-0 items-center gap-1.5 truncate text-xs text-muted-foreground">
                        <MapPin className="size-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{item.ticket} · {item.facility} - {item.location}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-muted-foreground">{item.updatedAt}</span>
                    <StatusBadge status={item.status} />
                    <Button nativeButton={false} render={<Link href={`/teknisi/laporan-fasilitas?ticket=${encodeURIComponent(item.ticket)}`} />} variant="outline" size="xs" className="bg-primary/5 text-primary-action-hover hover:bg-primary/10 dark:text-primary">Detail<ArrowRight className="size-3.5" /></Button>
                  </div>
                </article>
              ))}
              {!technicianRepairQueue.length ? <TechnicianEmptyState context="queue" /> : null}
              {technicianRepairQueue.length ? <p className="border-t border-border/60 pt-3 text-xs text-muted-foreground">Maksimal 5 laporan aktif terbaru.</p> : null}
            </CardContent>
          </div>
        </Card>

      </ContentShell>
    </DashboardLayout>
  )
}
