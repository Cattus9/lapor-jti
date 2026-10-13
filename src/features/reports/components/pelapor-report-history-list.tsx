"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, CalendarDays, CheckCircle2, ChevronDown, Clock, History, Loader2, ScanSearch, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "cn"
import type { ReportPage } from "../application/ports"
import type { ReportListItem } from "../types"
import { lifecycleByCategory, statusLabels } from "../domain/report"
import { hasReportFilters, reportListHref, type ReportListFilters } from "../domain/report-list-filters"
import { PelaporReportDetailDialog } from "./pelapor-report-detail-dialog"
import { ReportCategoryBadge, reportCategoryPresentation } from "./report-category-badge"

export function ReportRow({ report, selected }: { report: ReportListItem; selected?: string }) {
  const isDone = report.status === "selesai"
  const isRejected = report.status === "ditolak"
  const isProcessing = !isDone && !isRejected

  const meta = reportCategoryPresentation[report.category]
  const Icon = meta.icon
  const stages = lifecycleByCategory[report.category]
  const activeIndex = Math.max(0, stages.indexOf(report.status))
  const totalStages = stages.length

  const cardTrigger = (
    <article
      tabIndex={0}
      role="button"
      aria-label={`Buka detail laporan: ${report.title}`}
      className={cn(
        "group relative w-full overflow-hidden rounded-xl border p-4 text-left transition-all duration-200 cursor-pointer select-none md:p-5",
        "hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isDone && "border-emerald-500/30 bg-card/95 hover:border-emerald-500/60 dark:border-emerald-500/40",
        isRejected && "border-destructive/30 bg-card/95 hover:border-destructive/60 dark:border-destructive/40",
        isProcessing && "border-border bg-card/90 hover:border-primary/50 dark:border-border"
      )}
    >
      {/* Ambient background glow & done watermark on the right edge */}
      {isDone ? (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-12 top-1/2 size-44 -translate-y-1/2 rounded-full bg-emerald-500/15 blur-2xl dark:bg-emerald-400/20"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 top-1/2 size-24 -translate-y-1/2 rounded-full bg-emerald-500/20 blur-xl dark:bg-emerald-400/25"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-4 top-1/2 size-32 -translate-y-1/2 opacity-20 blur-[2px] transition-all duration-300 group-hover:scale-105 group-hover:opacity-30 dark:opacity-25 sm:size-40"
          >
            <Image
              src="/assets/DoneIcon.png"
              alt=""
              fill
              sizes="(min-width: 640px) 160px, 128px"
              className="object-contain"
            />
          </div>
        </>
      ) : isRejected ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-1/2 size-40 -translate-y-1/2 rounded-full bg-destructive/10 blur-2xl dark:bg-destructive/15"
        />
      ) : (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-12 top-1/2 size-36 -translate-y-1/2 rounded-full bg-primary/10 blur-2xl dark:bg-primary/15"
        />
      )}

      {/* Main card info */}
      <div className="relative flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={cn(
              "flex size-10 shrink-0 items-center justify-center rounded-xl border transition-colors",
              isDone
                ? "border-emerald-500/30 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-950/40 dark:text-emerald-300"
                : isRejected
                ? "border-destructive/30 bg-destructive/5 text-destructive dark:border-destructive/30 dark:bg-destructive/15"
                : "border-border bg-card text-primary"
            )}
          >
            <Icon className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <h2 className="truncate text-sm font-semibold transition-colors group-hover:text-primary md:text-base">
              {report.title}
            </h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-2">
              <ReportCategoryBadge category={report.category} />
            </div>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="mt-px size-3.5 shrink-0" aria-hidden="true" />
              <span>Dikirim <time dateTime={report.submittedAtIso}>{report.submittedAt} WIB</time></span>
            </p>
          </div>
        </div>

        {/* Status pill & hover detail affordance */}
        <div className="flex flex-row items-center justify-between sm:flex-col sm:items-end gap-2 shrink-0">
          <StatusBadge status={statusLabels[report.status]} />
          <div className="flex items-center gap-1 text-xs font-medium text-primary opacity-80 transition-all duration-200 sm:translate-x-1 sm:opacity-0 sm:group-hover:translate-x-0 sm:group-hover:opacity-100">
            <span>Lihat detail</span>
            <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
          </div>
        </div>
      </div>

      {/* Mini Stepper at bottom */}
      <div className="relative mt-4 border-t border-border/60 pt-3.5">
        {!isRejected ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs">
                {isDone ? (
                  <>
                    <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                    <span className="font-semibold text-emerald-700 dark:text-emerald-300">Semua tahap selesai</span>
                  </>
                ) : (
                  <>
                    <span className="font-semibold text-primary">Tahap {activeIndex + 1} dari {totalStages}</span>
                    <span className="text-muted-foreground/60">·</span>
                    <span className="font-medium text-foreground">{statusLabels[report.status]}</span>
                  </>
                )}
              </div>
              <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <Clock className="size-3 shrink-0 text-muted-foreground/80" aria-hidden="true" />
                <span>Terakhir diperbarui {report.updatedAt} WIB</span>
              </p>
            </div>

            {/* Segmented Stepper Bar */}
            <div className="flex items-center gap-1.5 w-full pt-0.5" aria-label={`Progress: tahap ${activeIndex + 1} dari ${totalStages}`}>
              {stages.map((stage, idx) => {
                const isPast = idx < activeIndex || isDone
                const isCurrent = idx === activeIndex && !isDone
                return (
                  <div key={stage} className="flex-1 flex flex-col gap-1 min-w-0">
                    <div
                      className={cn(
                        "h-1.5 rounded-full transition-all duration-300",
                        isDone
                          ? "bg-emerald-500"
                          : isPast
                          ? "bg-primary"
                          : isCurrent
                          ? "bg-primary ring-2 ring-primary/25"
                          : "bg-muted-foreground/20"
                      )}
                    />
                    <span
                      className={cn(
                        "truncate text-[10px] leading-tight hidden sm:block",
                        isCurrent
                          ? "font-semibold text-foreground"
                          : isPast
                          ? "text-muted-foreground"
                          : "text-muted-foreground/50"
                      )}
                    >
                      {statusLabels[stage]}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 text-xs text-destructive font-medium">
              <XCircle className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Laporan ditolak oleh pengelola</span>
            </div>
            <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
              <Clock className="size-3 shrink-0 text-muted-foreground/80" aria-hidden="true" />
              <span>Terakhir diperbarui {report.updatedAt} WIB</span>
            </p>
          </div>
        )}
      </div>
    </article>
  )

  return (
    <PelaporReportDetailDialog
      key={`${report.id}:${report.ticketNumber === selected}`}
      report={report}
      defaultOpen={report.ticketNumber === selected}
      trigger={cardTrigger}
    />
  )
}

type MonthGroup = {
  month: string
  monthLabel: string
  isCurrentMonth: boolean
  items: ReportListItem[]
  nextCursor: string | null
  hasMoreInMonth: boolean
  previousMonth: string | null
  previousMonthLabel: string | null
}

export function PelaporReportHistoryList({
  data,
  filters,
  selectedTicket,
  cursor,
  draftCursor,
}: {
  data: ReportPage
  filters: ReportListFilters
  selectedTicket?: string
  cursor?: string
  draftCursor?: string
}) {
  const isMonthSegmented = Boolean(data.month)
  const filtered = hasReportFilters(filters)

  const [monthGroups, setMonthGroups] = useState<MonthGroup[]>(() => {
    if (!data.month) return []
    return [
      {
        month: data.month,
        monthLabel: data.monthLabel || data.month,
        isCurrentMonth: Boolean(data.isCurrentMonth),
        items: data.items,
        nextCursor: data.nextCursor,
        hasMoreInMonth: Boolean(data.hasMoreInMonth),
        previousMonth: data.previousMonth ?? null,
        previousMonthLabel: data.previousMonthLabel ?? null,
      },
    ]
  })

  const [loadingMonth, setLoadingMonth] = useState<string | null>(null)
  const [loadingOlder, setLoadingOlder] = useState(false)
  const [, startTransition] = useTransition()

  const allItems = isMonthSegmented
    ? monthGroups.flatMap((group) => group.items)
    : data.items

  const selectedOutsidePage =
    data.selected && !allItems.some((item) => item.id === data.selected?.id)
      ? data.selected
      : null

  function buildApiParams(month?: string, pageCursor?: string) {
    const params = new URLSearchParams()
    if (filters.q) params.set("q", filters.q)
    if (filters.category !== "semua") params.set("category", filters.category)
    if (filters.status) params.set("status", filters.status)
    if (filters.period) params.set("period", filters.period)
    if (filters.from) params.set("from", filters.from)
    if (filters.to) params.set("to", filters.to)
    if (month) params.set("month", month)
    if (pageCursor) params.set("cursor", pageCursor)
    return params.toString()
  }

  async function loadMoreInMonth(group: MonthGroup) {
    if (!group.nextCursor || loadingMonth) return
    setLoadingMonth(group.month)
    try {
      const query = buildApiParams(group.month, group.nextCursor)
      const res = await fetch(`/api/pelapor/reports?${query}`)
      if (!res.ok) throw new Error("Gagal memuat laporan.")
      const result: ReportPage = await res.json()
      startTransition(() => {
        setMonthGroups((current) =>
          current.map((item) => {
            if (item.month !== group.month) return item
            return {
              ...item,
              items: [...item.items, ...result.items],
              nextCursor: result.nextCursor,
              hasMoreInMonth: Boolean(result.hasMoreInMonth),
            }
          })
        )
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingMonth(null)
    }
  }

  async function loadPreviousMonth(targetMonth: string) {
    if (loadingOlder) return
    setLoadingOlder(true)
    try {
      const query = buildApiParams(targetMonth)
      const res = await fetch(`/api/pelapor/reports?${query}`)
      if (!res.ok) throw new Error("Gagal memuat laporan bulan sebelumnya.")
      const result: ReportPage = await res.json()
      startTransition(() => {
        setMonthGroups((current) => [
          ...current,
          {
            month: result.month || targetMonth,
            monthLabel: result.monthLabel || targetMonth,
            isCurrentMonth: false,
            items: result.items,
            nextCursor: result.nextCursor,
            hasMoreInMonth: Boolean(result.hasMoreInMonth),
            previousMonth: result.previousMonth ?? null,
            previousMonthLabel: result.previousMonthLabel ?? null,
          },
        ])
      })
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingOlder(false)
    }
  }

  const lastGroup = monthGroups.at(-1)

  return (
    <div className="space-y-4">
      {selectedOutsidePage ? (
        <div className="space-y-2 border-b border-border/60 pb-4">
          <p className="text-xs text-muted-foreground">Laporan yang dibuka dari tautan, di luar hasil pada halaman ini.</p>
          <ReportRow report={selectedOutsidePage} selected={selectedTicket} />
        </div>
      ) : null}

      {/* Month segmented presentation */}
      {isMonthSegmented ? (
        <div className="space-y-6">
          {monthGroups.map((group) => (
            <section key={group.month} aria-label={`Laporan bulan ${group.monthLabel}`} className="space-y-3">
              <div className="flex items-center justify-between border-b border-border/50 pb-2 pt-1">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-primary" aria-hidden="true" />
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {group.monthLabel} {group.isCurrentMonth ? "· Bulan ini" : ""}
                  </h3>
                </div>
                <span className="text-xs text-muted-foreground">
                  {group.items.length} laporan
                </span>
              </div>

              {group.items.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border/60 py-6 px-4 text-center">
                  <p className="text-xs text-muted-foreground">
                    Tidak ada laporan pada bulan {group.monthLabel}.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {group.items.map((report) => (
                    <ReportRow key={report.id} report={report} selected={selectedTicket} />
                  ))}
                </div>
              )}

              {group.hasMoreInMonth ? (
                <div className="flex justify-center pt-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => loadMoreInMonth(group)}
                    disabled={loadingMonth === group.month}
                    className="h-8 gap-1.5 text-xs font-medium"
                  >
                    {loadingMonth === group.month ? (
                      <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden="true" />
                    )}
                    {loadingMonth === group.month
                      ? `Memuat laporan ${group.monthLabel}...`
                      : `Tampilkan lebih banyak dari bulan ${group.isCurrentMonth ? "ini" : group.monthLabel}`}
                  </Button>
                </div>
              ) : null}
            </section>
          ))}

          {/* Older month affordance */}
          {lastGroup?.previousMonth && !lastGroup.hasMoreInMonth ? (
            <div className="flex flex-col items-center justify-center gap-2.5 border-t border-border/60 pt-5 pb-2">
              <p className="text-xs text-muted-foreground">Tersedia riwayat laporan dari bulan sebelumnya</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => loadPreviousMonth(lastGroup.previousMonth!)}
                disabled={loadingOlder}
                className="h-9 gap-2 text-xs font-medium"
              >
                {loadingOlder ? (
                  <Loader2 className="size-4 animate-spin text-primary" aria-hidden="true" />
                ) : (
                  <History className="size-4 text-primary" aria-hidden="true" />
                )}
                {loadingOlder
                  ? `Memuat bulan ${lastGroup.previousMonthLabel}...`
                  : `Tampilkan bulan ${lastGroup.previousMonthLabel}`}
              </Button>
            </div>
          ) : !lastGroup?.previousMonth && allItems.length > 0 ? (
            <div className="border-t border-border/40 pt-4 text-center">
              <p className="text-xs text-muted-foreground">Semua riwayat laporan telah ditampilkan</p>
            </div>
          ) : null}

          {allItems.length === 0 && !lastGroup?.previousMonth ? (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
              <ScanSearch className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">{filtered ? "Tidak ada laporan yang sesuai" : "Belum ada laporan yang dikirim"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {filtered ? "Ubah pencarian atau gunakan Reset pada filter untuk melihat laporan lainnya." : "Draft tersimpan akan menjadi laporan setelah Anda mengirimnya."}
              </p>
            </div>
          ) : null}
        </div>
      ) : (
        /* Flat presentation for 'belum-selesai' or specific period */
        <div className="space-y-3">
          {data.items.map((report) => (
            <ReportRow key={report.id} report={report} selected={selectedTicket} />
          ))}

          {!data.items.length ? (
            <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed p-5 text-center">
              <ScanSearch className="size-6 text-muted-foreground" aria-hidden="true" />
              <p className="mt-3 text-sm font-medium">
                {filtered ? "Tidak ada laporan yang sesuai" : cursor ? "Tidak ada laporan berikutnya" : filters.status === "belum-selesai" ? "Tidak ada laporan dalam proses" : "Belum ada laporan yang dikirim"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {filtered
                  ? "Ubah pencarian atau pilih 'Semua' pada filter proses untuk melihat seluruh riwayat."
                  : cursor
                  ? "Kembali ke laporan terbaru untuk melihat riwayat Anda."
                  : filters.status === "belum-selesai"
                  ? "Semua laporan Anda telah selesai ditangani atau belum ada laporan baru. Pilih 'Semua' pada filter proses untuk melihat seluruh riwayat."
                  : "Draft tersimpan akan menjadi laporan setelah Anda mengirimnya."}
              </p>
            </div>
          ) : null}

          {cursor || data.nextCursor ? (
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border/60">
              {cursor ? (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={reportListHref(filters, { draftCursor })} />}>
                  Kembali ke terbaru
                </Button>
              ) : (
                <span />
              )}
              {data.nextCursor ? (
                <Button variant="outline" size="sm" nativeButton={false} render={<Link href={reportListHref(filters, { cursor: data.nextCursor, draftCursor })} />}>
                  Laporan berikutnya
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      )}
    </div>
  )
}
