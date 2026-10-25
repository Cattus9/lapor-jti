"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Calendar, CalendarDays, ChevronDown, Clock, History, Loader2, ScanSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn } from "cn"
import type { ReportPage } from "../application/ports"
import type { ReportListItem } from "../types"
import { statusLabels } from "../domain/report"
import { hasReportFilters, reportListHref, type ReportListFilters } from "../domain/report-list-filters"
import { PelaporReportDetailDialog } from "./pelapor-report-detail-dialog"
import { ReportCategoryBadge, reportCategoryPresentation } from "./report-category-badge"

export function ReportRow({ report, selected }: { report: ReportListItem; selected?: string }) {
  const meta = reportCategoryPresentation[report.category]
  const Icon = meta.icon
  const isCompleted = report.status === "selesai"
  // Both values are formatted by the same server projection. Do not repeat a
  // timestamp if there is no visible change at the displayed minute precision.
  const hasVisibleUpdate = report.updatedAt !== report.submittedAt

  const cardTrigger = (
    <Card
      tabIndex={0}
      role="button"
      aria-label={`Buka detail laporan: ${report.title}, status ${statusLabels[report.status]}`}
      className={cn(
        "group w-full cursor-pointer gap-0 rounded-xl border border-border bg-report-surface p-4 text-left text-card-foreground shadow-none ring-0 transition duration-200 ease-out select-none hover:border-primary/40 hover:shadow-xs motion-safe:hover:-translate-y-0.5 md:p-5 motion-reduce:transition-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      )}
    >
      <div className="flex items-start gap-3 md:gap-4">
        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary sm:size-12">
          <Icon className="size-5 sm:size-6" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-col items-start gap-2 sm:flex-row sm:justify-between sm:gap-4">
            <h2 className="min-w-0 break-words text-sm font-semibold leading-snug md:text-base">{report.title}</h2>
            <StatusBadge className="shrink-0" status={statusLabels[report.status]} />
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
            <ReportCategoryBadge category={report.category} />
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <CalendarDays className="size-3.5 shrink-0" aria-hidden="true" />
              <span>Dikirim <time dateTime={report.submittedAtIso}>{report.submittedAt} WIB</time></span>
            </p>
          </div>
          {report.descriptionPreview || isCompleted ? (
            <div className="mt-2.5 flex items-center justify-between gap-4">
              {report.descriptionPreview ? <p className="min-w-0 flex-1 line-clamp-2 max-w-3xl break-words text-sm leading-relaxed text-muted-foreground">{report.descriptionPreview}</p> : null}
              {isCompleted ? (
                <span aria-hidden="true" className="pointer-events-none ml-auto flex size-12 shrink-0 items-center justify-center sm:size-16">
                  <Image src="/assets/DoneStatusIc.png" alt="" width={292} height={283} sizes="(min-width: 640px) 64px, 48px" className="h-auto w-full object-contain opacity-70 dark:opacity-80" />
                </span>
              ) : null}
            </div>
          ) : null}
          <div className="mt-3 flex flex-col items-start gap-2 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
            {hasVisibleUpdate ? (
              <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Clock className="size-3.5 shrink-0" aria-hidden="true" />
                <span>Diperbarui {report.updatedAt} WIB</span>
              </p>
            ) : null}
            <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-primary-action sm:ml-auto">
              Lihat detail <ArrowRight className="size-3.5" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </Card>
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
