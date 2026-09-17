import { ClipboardList, FileText, Gauge, ListChecks, MessageSquareText, TimerReset } from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { managementFocus, managementOverview, managementPriorityQueue } from "@/features/management/mock/manajemen-dashboard"
import type { CurrentUser } from "@/lib/auth/dummy-session"

const statusClass: Record<string, string> = {
  Baru: "border-slate-200 bg-slate-100 text-slate-700",
  "Sedang Diproses": "border-blue-200 bg-blue-50 text-blue-700",
}

const categoryClass: Record<string, string> = {
  Layanan: "border-violet-200 bg-violet-50 text-violet-700",
  Lainnya: "border-amber-200 bg-amber-50 text-amber-700",
}

export function ManajemenDashboard({ user }: { user: CurrentUser }) {
  return (
    <DashboardLayout role="manajemen" user={user}>
      <ContentShell>
        <PageHeader
          title="Dashboard Manajemen"
          description={`Selamat datang, ${user.name}. Pantau penanganan layanan dan laporan umum JTI.`}
        />

        <div className="grid gap-4 sm:grid-cols-2 2xl:grid-cols-4">
          <KpiCard
            label="Laporan baru"
            value={managementOverview.newReports}
            icon={ClipboardList}
            detail="Perlu respons awal"
            detailValue={`${managementOverview.newReports} laporan`}
            detailTone="amber"
          />
          <KpiCard
            label="Sedang diproses"
            value={managementOverview.inProgress}
            icon={TimerReset}
            detail="Menunggu pembaruan"
            detailValue={`${managementOverview.inProgress} laporan`}
            detailTone="blue"
          />
          <KpiCard
            label="Selesai bulan ini"
            value={managementOverview.completedThisMonth}
            icon={ListChecks}
            detail="Tercatat periode ini"
            detailValue={`${managementOverview.completedThisMonth} laporan`}
            detailTone="green"
          />
          <KpiCard
            label="Layanan aktif"
            value={managementOverview.activeServiceReports}
            icon={MessageSquareText}
            detail="Layanan internal JTI"
            detailValue="Perlu dipantau"
            detailTone="blue"
          />
        </div>

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
                      <CardTitle className="text-base">Antrean prioritas</CardTitle>
                      <p className="mt-1 text-sm text-muted-foreground">Laporan layanan dan lainnya yang perlu diperhatikan terlebih dahulu.</p>
                    </div>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">{managementOverview.updatedAt}</span>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 p-4 md:p-5">
                {managementPriorityQueue.map((report) => (
                  <article key={report.ticket} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex min-w-0 items-start gap-3">
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                        <FileText className="size-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-foreground">{report.title}</p>
                        <p className="mt-1 truncate text-xs text-muted-foreground">{report.ticket} · {report.reporter}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <span className="text-xs text-muted-foreground">{report.updatedAt}</span>
                      <Badge className={categoryClass[report.category]} variant="outline">{report.category}</Badge>
                      <Badge className={statusClass[report.status]} variant="outline">{report.status}</Badge>
                    </div>
                  </article>
                ))}
              </CardContent>
            </div>
          </Card>

          <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
            <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
              <CardHeader className="gap-3 p-5 pb-4 md:p-6 md:pb-5">
                <div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs">
                  <Gauge className="size-5 text-primary" aria-hidden="true" />
                </div>
                <div>
                  <CardTitle className="text-base">Fokus operasional</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">Urutan tindak lanjut untuk menjaga kualitas layanan internal.</p>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 p-5 pt-0 md:p-6 md:pt-0">
                {managementFocus.map((focus) => (
                  <div key={focus.title} className="rounded-xl border border-border/60 bg-background/40 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-sm font-medium text-foreground">{focus.title}</p>
                      <span className="shrink-0 text-xs font-medium text-primary">{focus.count}</span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{focus.description}</p>
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
