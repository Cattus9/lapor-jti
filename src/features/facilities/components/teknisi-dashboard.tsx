import Link from "next/link"
import { ArrowRight, Building2, ClipboardList, Clock3, CircleCheckBig, MapPin, ScanSearch, Wrench } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TechnicianPriorityAnalysis } from "@/features/facilities/components/technician-priority-analysis"
import { technicianOverview, technicianRepairQueue, technicianTasks } from "@/features/facilities/mock/teknisi-dashboard"
import type { CurrentUser } from "@/lib/auth/dummy-session"

export function TeknisiDashboard({ user }: { user: CurrentUser }) {
  return (
    <DashboardLayout role="teknisi">
      <ContentShell>
        <PageHeader
          title="Dashboard Teknisi"
          description={`Selamat datang, ${user.name}. Tinjau prioritas ruang dan kelola antrean fasilitas JTI.`}
          action={
            <Button render={<Link href="/teknisi/laporan-fasilitas" />} size="sm" className="shrink-0">
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
            detailTone="amber"
            href="/teknisi/laporan-fasilitas"
          />
          <KpiCard
            label="Dalam penanganan"
            value={technicianOverview.inProgress}
            icon={Wrench}
            detail="Perbaikan aktif"
            detailValue={`${technicianOverview.inProgress} pekerjaan`}
            detailTone="blue"
            href="/teknisi/laporan-fasilitas"
          />
          <KpiCard
            label="Ruang terdampak"
            value={technicianOverview.affectedRooms}
            icon={Building2}
            detail="Prioritas utama"
            detailValue={technicianOverview.priorityRoom}
            detailTone="red"
            href="/teknisi/laporan-fasilitas?view=priority"
          />
          <KpiCard
            label="Selesai hari ini"
            value={technicianOverview.completedToday}
            icon={CircleCheckBig}
            detail="Catatan tersimpan"
            detailValue={`${technicianOverview.completedToday} laporan`}
            detailTone="green"
            href="/teknisi/riwayat"
          />
        </div>

        <TechnicianPriorityAnalysis />

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
          <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
            <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
              <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-2">
                    <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-background text-primary">
                      <ClipboardList className="size-4" aria-hidden="true" />
                    </span>
                    <div>
                      <CardTitle className="text-base">Antrean perbaikan</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">Laporan fasilitas yang membutuhkan tindakan teknis.</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{technicianOverview.updatedAt}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-4 md:p-5">
                {technicianRepairQueue.map((item) => (
                  <article key={item.ticket} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
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
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <span className="text-xs text-muted-foreground">{item.updatedAt}</span>
                      <StatusBadge status={item.status} />
                    </div>
                  </article>
                ))}
                <Button render={<Link href="/teknisi/laporan-fasilitas" />} variant="outline" className="mt-2 w-full bg-card">
                  Lihat semua laporan fasilitas
                  <ArrowRight />
                </Button>
              </CardContent>
            </div>
          </Card>

          <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
            <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
              <CardHeader className="gap-3 p-5 pb-4 md:p-6 md:pb-5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs">
                  <Clock3 className="size-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base">Tugas hari ini</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Prioritas kerja untuk menjaga fasilitas tetap siap digunakan.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0 md:p-6 md:pt-0">
                {technicianTasks.map((task) => (
                  <div key={task.title} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{task.title}</p>
                      <span className="shrink-0 text-xs font-medium text-primary">{task.count}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{task.description}</p>
                  </div>
                ))}
              </CardContent>
            </div>
          </Card>
        </div>
      </ContentShell>
    </DashboardLayout>
  )
}
