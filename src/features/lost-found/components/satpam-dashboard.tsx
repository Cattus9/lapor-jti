"use client"

import { useId, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
// [AUTH-ROLE] CurrentUser/AppRole dipakai untuk presentasi setelah validasi pada halaman server.
// Komponen ini bukan guard akses; role database dan pemeriksaan server tetap diperlukan saat memakai Google Workspace.
import {
  ArrowRight,
  ChevronDown,
  ClipboardCheck,
  Clock3,
  Handshake,
  Inbox,
  PackageSearch,
  RotateCcw,
  Search,
  SearchCheck,
  ShieldCheck,
  SlidersHorizontal,
} from "lucide-react"
import { KpiCard } from "@/components/dashboard/kpi-card"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { UnopenedReportBadge } from "@/components/reports/report-opening"
import { cn } from "cn"
import type { SatpamDashboardData, SatpamQueueReport } from "../types"
import type { CurrentUser } from "@/lib/auth/current-user"

function QueueReport({ report }: { report: SatpamQueueReport }) {
  const isFound = report.kind === "temuan"
  const type = isFound ? "Temuan" : "Kehilangan"
  const Icon = isFound ? Inbox : PackageSearch
  const isNew = report.status === "Baru"
  const isDone = report.status === "Selesai"
  const isInProgress = ["Diproses", "Barang teridentifikasi", "Diserahkan"].includes(report.status)

  return (
    <Card className="group relative gap-3 py-0 flex flex-col gap-3 overflow-hidden rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between">
      {/* Blurry corner half-circle glow with fading gradient */}
      {isDone ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-emerald-500/20 blur-2xl transition-opacity dark:bg-emerald-500/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 size-24 rounded-bl-full bg-gradient-to-bl from-emerald-500/15 via-emerald-500/5 to-transparent transition-opacity"
          />
        </>
      ) : isInProgress ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-blue-500/20 blur-2xl transition-opacity dark:bg-blue-500/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute right-0 top-0 size-24 rounded-bl-full bg-gradient-to-bl from-blue-500/15 via-blue-500/5 to-transparent transition-opacity"
          />
        </>
      ) : null}

      <div className="relative z-10 flex min-w-0 flex-1 items-start gap-3">
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
      <div className="relative z-10 flex flex-wrap items-center justify-between gap-3 sm:shrink-0 sm:justify-end">
        <div className="flex flex-wrap items-center gap-2 sm:flex-col sm:items-end">
          <span className="text-xs text-muted-foreground">Dikirim {report.submittedAt} WIB</span>
          <UnopenedReportBadge unseen={report.unopened} />
          {isDone ? (
            <span className="relative size-5 shrink-0 drop-shadow-xs">
              <Image
                src="/assets/DoneStatusIc.png"
                alt="Selesai"
                fill
                sizes="20px"
                className="object-contain"
                unoptimized
              />
            </span>
          ) : null}
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
  className,
}: Pick<SatpamDashboardData, "queue" | "updatedAt"> & { unhandledCount?: number; className?: string }) {
  const id = useId()
  const [filterOpen, setFilterOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [kindFilter, setKindFilter] = useState<"semua" | "kehilangan" | "temuan">("semua")
  const [statusFilter, setStatusFilter] = useState<string>("semua")
  const [sortOrder, setSortOrder] = useState<"terbaru" | "terlama">("terbaru")

  const activeFilterCount =
    Number(Boolean(search.trim())) +
    Number(kindFilter !== "semua") +
    Number(statusFilter !== "semua") +
    Number(sortOrder !== "terbaru")

  function handleResetFilters() {
    setSearch("")
    setKindFilter("semua")
    setStatusFilter("semua")
    setSortOrder("terbaru")
  }

  const filteredQueue = useMemo(() => {
    let list = [...queue]

    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.location.toLowerCase().includes(q) ||
          r.ticket.toLowerCase().includes(q)
      )
    }

    if (kindFilter !== "semua") {
      list = list.filter((r) => r.kind === kindFilter)
    }

    if (statusFilter !== "semua") {
      list = list.filter((r) => {
        const s = r.status.toLowerCase().replace(/_/g, " ")
        if (statusFilter === "baru") return s === "baru"
        if (statusFilter === "diproses") return s === "diproses"
        if (statusFilter === "barang_teridentifikasi") return s === "barang teridentifikasi"
        if (statusFilter === "diserahkan") return s === "diserahkan"
        return true
      })
    }

    if (sortOrder === "terlama") {
      list = list.slice().reverse()
    }

    return list
  }, [queue, search, kindFilter, statusFilter, sortOrder])

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
      className={cn("w-full", className)}
    >
      <div className="space-y-4">
        <div>
          <p className="text-sm text-muted-foreground">
            Laporan kehilangan dan temuan baru yang belum ditindaklanjuti atau baru masuk, diprioritaskan untuk segera diperiksa.
          </p>
        </div>

        {/* Collapsible Filter Card */}
        <Collapsible
          open={filterOpen}
          onOpenChange={setFilterOpen}
          className="group/collapsible overflow-hidden rounded-xl border border-border/70 bg-muted/20 shadow-2xs"
        >
          <div className="flex flex-wrap items-center justify-between gap-3 p-3 sm:px-4 sm:py-3">
            <div className="flex items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <SlidersHorizontal className="size-4" aria-hidden="true" />
              </span>
              <div>
                <p className="text-sm font-semibold text-foreground">Filter Antrean Laporan</p>
                <p className="text-xs text-muted-foreground">Saring laporan berdasarkan pencarian, jenis, status, atau urutan.</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeFilterCount > 0 ? (
                <Badge variant="outline" tone="info" className="text-xs font-normal">
                  {activeFilterCount} filter aktif
                </Badge>
              ) : null}
              <CollapsibleTrigger
                render={
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    aria-label={filterOpen ? "Tutup panel filter" : "Buka panel filter"}
                  />
                }
              >
                <span>{filterOpen ? "Tutup Filter" : "Buka Filter"}</span>
                <ChevronDown
                  className={cn("size-3.5 transition-transform duration-200", filterOpen && "rotate-180")}
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
            </div>
          </div>

          <CollapsibleContent className="border-t border-border/60 bg-background/50 p-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Field className="space-y-1">
                <FieldLabel htmlFor={`${id}-filter-search`} className="text-xs text-muted-foreground">
                  Pencarian
                </FieldLabel>
                <div className="relative">
                  <Search
                    className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
                    aria-hidden="true"
                  />
                  <Input
                    id={`${id}-filter-search`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari judul, lokasi, tiket..."
                    className="h-8 bg-background pl-8 text-xs"
                  />
                </div>
              </Field>

              <Field className="space-y-1">
                <FieldLabel htmlFor={`${id}-filter-kind`} className="text-xs text-muted-foreground">
                  Jenis laporan
                </FieldLabel>
                <Select
                  value={kindFilter}
                  onValueChange={(val) => setKindFilter((val ?? "semua") as "semua" | "kehilangan" | "temuan")}
                >
                  <SelectTrigger id={`${id}-filter-kind`} className="h-8 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua jenis</SelectItem>
                    <SelectItem value="kehilangan">Kehilangan</SelectItem>
                    <SelectItem value="temuan">Temuan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="space-y-1">
                <FieldLabel htmlFor={`${id}-filter-status`} className="text-xs text-muted-foreground">
                  Status laporan
                </FieldLabel>
                <Select
                  value={statusFilter}
                  onValueChange={(val) => setStatusFilter(val ?? "semua")}
                >
                  <SelectTrigger id={`${id}-filter-status`} className="h-8 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua status aktif</SelectItem>
                    <SelectItem value="baru">Baru (Belum ditindak)</SelectItem>
                    <SelectItem value="diproses">Diproses</SelectItem>
                    <SelectItem value="barang_teridentifikasi">Barang teridentifikasi</SelectItem>
                    <SelectItem value="diserahkan">Diserahkan</SelectItem>
                  </SelectContent>
                </Select>
              </Field>

              <Field className="space-y-1">
                <FieldLabel htmlFor={`${id}-filter-sort`} className="text-xs text-muted-foreground">
                  Urutan pengiriman
                </FieldLabel>
                <Select
                  value={sortOrder}
                  onValueChange={(val) => setSortOrder((val ?? "terbaru") as "terbaru" | "terlama")}
                >
                  <SelectTrigger id={`${id}-filter-sort`} className="h-8 bg-background text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="terbaru">Terbaru (WIB)</SelectItem>
                    <SelectItem value="terlama">Terlama (WIB)</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-border/50 pt-3">
              <p className="text-xs text-muted-foreground">
                Menampilkan <span className="font-medium text-foreground">{filteredQueue.length}</span> dari{" "}
                <span className="font-medium text-foreground">{queue.length}</span> laporan antrean
              </p>
              <Button
                type="button"
                variant="ghost"
                size="xs"
                className="h-7 gap-1 text-xs text-muted-foreground hover:text-foreground"
                disabled={activeFilterCount === 0}
                onClick={handleResetFilters}
              >
                <RotateCcw className="size-3" aria-hidden="true" />
                Reset Filter
              </Button>
            </div>
          </CollapsibleContent>
        </Collapsible>

        {/* Content list or Empty State */}
        {!queue.length ? (
          <CollectionEmptyState
            icon={ClipboardCheck}
            title="Tidak ada laporan aktif"
            description="Laporan kehilangan dan temuan yang perlu ditangani akan muncul di sini."
          />
        ) : !filteredQueue.length ? (
          <CollectionEmptyState
            icon={SearchCheck}
            title="Tidak ada laporan yang sesuai filter"
            description="Ubah kata kunci pencarian atau reset filter untuk melihat laporan lainnya."
            action={
              <Button type="button" variant="outline" size="sm" onClick={handleResetFilters}>
                <RotateCcw className="size-3.5" aria-hidden="true" />
                Reset Filter
              </Button>
            }
          />
        ) : (
          <div className="space-y-2.5">
            {filteredQueue.map((report) => (
              <QueueReport key={report.ticket} report={report} />
            ))}
          </div>
        )}
      </div>
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

        {/* Full-width Priority Queue / Table */}
        <div className="space-y-6">
          <SatpamPriorityQueue
            queue={data.queue}
            updatedAt={data.updatedAt}
            unhandledCount={unhandledTotal}
            className="w-full"
          />

          {/* Fokus Penanganan (Horizontal 3-column layout) */}
          <SectionCard title="Fokus penanganan" icon={ShieldCheck} contentClassName="space-y-3">
            <p className="text-sm text-muted-foreground">Panduan penanganan kehilangan dan temuan.</p>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5">
                <SearchCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">1. Terima temuan baru</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pastikan detail lokasi dan ciri-ciri barang sudah lengkap.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5">
                <Clock3 className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">2. Cocokkan laporan</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Bandingkan temuan dengan laporan kehilangan yang aktif.</p>
                </div>
              </div>
              <div className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5">
                <Handshake className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <p className="text-sm font-medium text-foreground">3. Siapkan penyerahan</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Hubungi pelapor setelah barang cocok.</p>
                </div>
              </div>
            </div>
          </SectionCard>
        </div>
      </ContentShell>
    </DashboardLayout>
  )
}
