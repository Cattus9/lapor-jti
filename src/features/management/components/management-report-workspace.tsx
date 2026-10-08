"use client"

import { useState } from "react"
import { useSearchParams } from "next/navigation"
import { ClipboardList, MapPin, MessageSquareText, Search } from "lucide-react"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ManagementStatusBadge } from "./management-report-detail-dialog"
import { ManagementReportSession, type OpenManagementReport } from "./management-report-session"
import { ManagementFeedback } from "./management-feedback"
import { useManagementPage } from "./use-management-page"
import { statusLabels } from "../../reports/domain/report"
import { reportPeriods } from "../../reports/domain/report-list-filters"

const categories = [{ value: "semua", label: "Semua" }, { value: "layanan", label: "Laporan Layanan" }, { value: "lainnya", label: "Laporan Lainnya" }] as const
const statuses = ["baru", "diproses", "selesai", "ditolak"] as const
// Match the Satpam workspace without changing the shared Tabs primitive or other roles.
const workspaceTabClassName = "group/workspace-tab data-active:bg-accent data-active:text-accent-foreground data-active:font-semibold data-active:shadow-none data-active:inset-ring data-active:inset-ring-primary/25 motion-reduce:transition-none"
const workspaceTabCountClassName = "min-w-4 rounded-md bg-background px-1.5 py-0.5 text-center text-[11px] tabular-nums text-muted-foreground group-data-active/workspace-tab:bg-primary/10 group-data-active/workspace-tab:text-accent-foreground"

function ReportList({ page, openReport, retry }: { page: ReturnType<typeof useManagementPage>; openReport: OpenManagementReport; retry: () => void }) {
  return (
    <div className="space-y-2" aria-busy={page.loading}>
      <p className="min-h-4 text-xs text-muted-foreground" aria-live="polite">
        {page.hasData ? `${page.total} laporan ditemukan${page.loading ? " · Memperbarui…" : ""}` : page.loading ? "Memuat laporan…" : ""}
      </p>
      <div className={page.items.length ? "space-y-2" : "min-h-44 space-y-2"}>
        {page.items.map((report) => (
          <article key={report.id} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground">
                <MessageSquareText className="size-4" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{report.title}</p>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <MapPin className="size-3 shrink-0" aria-hidden="true" />
                  <span className="break-words">{report.ticket} · {report.context} · {report.location}</span>
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
              <span className="text-xs text-muted-foreground">{report.completedAt ? `Selesai ${report.completedAt}` : `Dikirim ${report.submittedAt}`}</span>
              <ManagementStatusBadge status={report.status} />
              <Button type="button" variant="outline" size="sm" className="shrink-0 bg-card" aria-haspopup="dialog" disabled={page.loading || Boolean(page.error)} onClick={(event) => openReport(report, event.currentTarget)}>Lihat detail</Button>
            </div>
          </article>
        ))}
        <ManagementFeedback loading={page.loading && !page.hasData} error={page.error} onRetry={retry} />
        {page.hasData && !page.items.length && !page.error ? (
          <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center">
            <ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Tidak ada laporan yang sesuai</p>
            <p className="mt-1 text-xs text-muted-foreground">Laporan Layanan dan Lainnya dari pelapor akan muncul di sini. Ubah filter jika diperlukan.</p>
          </div>
        ) : null}
      </div>
      {page.nextCursor ? <Button type="button" variant="outline" className="w-full bg-card" disabled={page.loading || Boolean(page.error)} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
    </div>
  )
}

function WorkspaceContent({ initialCategory, openReport, retry }: { initialCategory?: "Semua" | "Layanan" | "Lainnya"; openReport: OpenManagementReport; retry: () => void }) {
  const params = useSearchParams()
  const [category, setCategory] = useState(initialCategory === "Layanan" ? "layanan" : initialCategory === "Lainnya" ? "lainnya" : "semua")
  const initialStatus = params.get("status")
  const [status, setStatus] = useState<string>(initialStatus === "belum-selesai" || statuses.includes(initialStatus as typeof statuses[number]) ? initialStatus! : "semua")
  const [query, setQuery] = useState("")
  const [period, setPeriod] = useState(() => params.get("period") && params.get("period") !== "rentang" && Object.hasOwn(reportPeriods, params.get("period")!) ? params.get("period")! : "semua")
  const q = useDebouncedOperationalQuery(query)
  const search = new URLSearchParams({ category, status, q, period })
  if (status === "selesai" && params.get("date") === "completed") search.set("date", "completed")
  const page = useManagementPage(`/api/manajemen/reports?${search}`, { keepCategoryPreview: true })

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><MessageSquareText className="size-4 text-primary" aria-hidden="true" /><span>Daftar laporan</span></div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardContent className="p-4 md:p-5">
          <Tabs value={category} onValueChange={(value) => setCategory(value ?? "semua")} className="gap-4">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
              <div className="max-w-full overflow-x-auto pb-1">
                <TabsList aria-label="Filter kategori laporan" className="w-max max-w-none touch-pan-x [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {categories.map((item) => (
                    <TabsTrigger key={item.value} value={item.value} className={workspaceTabClassName}>
                      {item.label}<span className={workspaceTabCountClassName} aria-label={page.hasCounts ? undefined : "Memuat jumlah laporan"}>{page.hasCounts ? page.categoryCounts[item.value] : "…"}</span>
                    </TabsTrigger>
                  ))}
                </TabsList>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <div className="relative sm:w-68">
                  <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari tiket, laporan, atau pelapor" aria-label="Cari laporan Manajemen" className="h-9 bg-background pl-9" maxLength={200} />
                </div>
                <Select value={status} onValueChange={(value) => setStatus(value ?? "semua")}>
                  <SelectTrigger className="h-9 min-w-44 bg-background" aria-label="Filter status laporan"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua status</SelectItem>
                    <SelectItem value="belum-selesai">Belum selesai</SelectItem>
                    {statuses.map((value) => <SelectItem key={value} value={value}>{statusLabels[value]}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={period} onValueChange={(value) => setPeriod(value ?? "semua")}>
                  <SelectTrigger className="h-9 min-w-36 bg-background" aria-label="Filter periode laporan"><SelectValue /></SelectTrigger>
                  <SelectContent>{Object.entries(reportPeriods).filter(([value]) => value !== "rentang").map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            <TabsContent value={category}>
              <div key={category} className="motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-150">
                <ReportList page={page} openReport={openReport} retry={retry} />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </div>
    </Card>
  )
}

export function ManagementReportWorkspace({ initialCategory }: { initialCategory?: "Semua" | "Layanan" | "Lainnya" }) {
  const params = useSearchParams(), ticket = params.get("ticket")?.trim() ?? ""
  return <ManagementReportSession key={params.toString()} initialTicket={ticket}>{(openReport, retry) => <WorkspaceContent initialCategory={initialCategory} openReport={openReport} retry={retry} />}</ManagementReportSession>
}
