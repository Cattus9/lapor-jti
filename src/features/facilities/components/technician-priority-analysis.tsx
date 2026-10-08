"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Armchair, ArrowRight, ChartPie, Info, LampCeiling, Layers3, MapPin, Monitor, Snowflake, Table2, Tv, Wrench, type LucideIcon } from "lucide-react"
import { Pie, PieChart } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, useStablePieTooltip, type ChartConfig } from "@/components/ui/chart"
import { RoomPriorityBadge } from "@/components/reports/room-priority-badge"
import type { TechnicianRoomPriority } from "@/features/facilities/types"
import { TechnicianEmptyState } from "./technician-empty-state"
import { getTechnicianPrioritySummary } from "./technician-priority-summary"
import { cn } from "cn"

const facilityIcons: Record<string, LucideIcon> = { AC: Snowflake, Komputer: Monitor, Kursi: Armchair, Lampu: LampCeiling, LCD: Monitor, Meja: Table2, TV: Tv }
const OBJECT_CHART_LIMIT = 5

function TechnicianFacilityComposition({ room }: { room: TechnicianRoomPriority }) {
  const pieTooltip = useStablePieTooltip()
  const [showAllObjects, setShowAllObjects] = useState(false)
  const facilities = useMemo(() => room.facilities
    .filter((facility) => facility.activeReports > 0)
    .sort((left, right) => right.activeReports - left.activeReports || left.facility.localeCompare(right.facility, "id")), [room.facilities])
  // A ticket may mention multiple objects. This is not the room's ticket count.
  const objectMentions = facilities.reduce((total, facility) => total + facility.activeReports, 0)
  const objectChartData = facilities.map((facility, index) => ({
    key: `object-${index}`,
    name: facility.facility,
    value: facility.activeReports,
    fill: `var(--chart-${index % OBJECT_CHART_LIMIT + 1})`,
  }))
  const objectChartConfig: ChartConfig = Object.fromEntries(objectChartData.map((item) => [item.key, { label: item.name, color: item.fill }]))
  const manyObjects = facilities.length > OBJECT_CHART_LIMIT
  const displayedObjects = showAllObjects ? facilities : facilities.slice(0, OBJECT_CHART_LIMIT)

  return (
    <section className="min-w-0 bg-muted/15 p-5 md:p-6" aria-labelledby="facility-priority-title">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 id="facility-priority-title" className="text-sm font-semibold text-foreground">Objek di {room.room}</h3>
          <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden="true" />{room.location}</p>
        </div>
        <Badge variant="outline" tone="primary" className="shrink-0">{room.activeReports} laporan aktif</Badge>
      </div>
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">Komposisi objek pada laporan aktif.</p>

      {manyObjects ? (
        <div className="mt-4 space-y-3">
          <div className={cn("space-y-2", showAllObjects && "max-h-80 overflow-y-auto pr-1")}>
            {displayedObjects.map((facility) => {
              const Icon = facilityIcons[facility.facility] ?? Wrench
              return (
                <div key={facility.facility} className="rounded-lg border border-border/60 bg-card px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <Icon className="size-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 break-words text-sm font-medium text-foreground">{facility.facility}</span>
                    <span className="shrink-0 text-xs font-semibold tabular-nums text-foreground">{facility.activeReports} laporan</span>
                    <span className="w-8 shrink-0 text-right text-xs tabular-nums text-muted-foreground">{Math.round(facility.activeReports / objectMentions * 100)}%</span>
                  </div>
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                    <div className="h-full rounded-full bg-primary/75" style={{ width: `${facility.activeReports / facilities[0].activeReports * 100}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
          <Button type="button" variant="ghost" size="sm" className="text-primary-action-hover dark:text-primary" aria-expanded={showAllObjects} onClick={() => setShowAllObjects((current) => !current)}>{showAllObjects ? "Tampilkan 5 teratas" : `Lihat semua ${facilities.length} objek`}</Button>
        </div>
      ) : facilities.length ? (
        <div className="mt-5 grid items-center gap-5 sm:grid-cols-[180px_minmax(0,1fr)] lg:grid-cols-1 2xl:grid-cols-[180px_minmax(0,1fr)]">
          <div className="relative mx-auto size-[180px]">
            <ChartContainer config={objectChartConfig} className="size-[180px] aspect-auto" initialDimension={{ width: 180, height: 180 }} aria-label={`Komposisi objek fasilitas di ${room.room}, ${objectMentions} objek dilaporkan`} {...pieTooltip.containerProps}>
              <PieChart accessibilityLayer>
                <ChartTooltip active={pieTooltip.tooltipActive} defaultIndex={pieTooltip.tooltipActive ? 0 : undefined} wrapperStyle={{ zIndex: 10 }} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                <Pie data={objectChartData} dataKey="value" nameKey="name" innerRadius={54} outerRadius={80} paddingAngle={2} strokeWidth={0} isAnimationActive="auto" animationBegin={0} animationDuration={500} animationEasing="ease-out" />
              </PieChart>
            </ChartContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-2xl font-semibold tabular-nums text-foreground">{objectMentions}</span>
              <span className="text-[11px] text-muted-foreground">objek dilaporkan</span>
            </div>
          </div>
          <dl className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/60 bg-card" aria-label="Jumlah laporan per objek fasilitas">
            {facilities.map((facility, index) => {
              const Icon = facilityIcons[facility.facility] ?? Wrench
              return (
                <div key={facility.facility} className="flex items-center gap-2.5 px-3 py-2.5">
                  <dt className="flex min-w-0 flex-1 items-center gap-2.5">
                    <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: objectChartData[index].fill }} aria-hidden="true" />
                    <Icon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                    <span className="break-words text-sm font-medium text-foreground">{facility.facility}</span>
                  </dt>
                  <dd className="flex shrink-0 items-center gap-3 tabular-nums">
                    <span className="text-xs font-semibold text-foreground">{facility.activeReports}<span className="sr-only"> laporan</span></span>
                    <span className="w-8 text-right text-xs text-muted-foreground">{Math.round(facility.activeReports / objectMentions * 100)}%</span>
                  </dd>
                </div>
              )
            })}
          </dl>
        </div>
      ) : <Card className="mt-4 rounded-xl border-dashed border-border bg-empty-surface shadow-none"><CardContent className="py-8 text-center"><p className="text-sm font-medium">Belum ada objek fasilitas aktif</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Rincian objek akan muncul setelah data laporan diperbarui.</p></CardContent></Card>}
    </section>
  )
}

export function TechnicianPriorityAnalysis({ rooms, unclassifiedReports = 0 }: { rooms: TechnicianRoomPriority[]; unclassifiedReports?: number }) {
  const { topRooms, totalRooms, totalActiveReports, remainingRooms, remainingActiveReports } = useMemo(() => getTechnicianPrioritySummary(rooms), [rooms])
  const [selectedRoomId, setSelectedRoomId] = useState("")
  // A completed room can disappear after refresh; keep the detail panel on a visible room.
  const selectedRoom = topRooms.find((room) => room.id === selectedRoomId) ?? topRooms[0]
  const maximumRoomReports = topRooms[0]?.activeReports ?? 1

  return (
    <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground">
        <ChartPie className="size-4 text-primary" aria-hidden="true" />
        Analisis fasilitas
      </div>
      <div className="overflow-hidden rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <CardHeader className="gap-3 border-b border-border/60 p-5 md:p-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary">
                <Layers3 className="size-5" aria-hidden="true" />
              </span>
              <div>
                <CardTitle className="text-base">Ruang prioritas untuk ditinjau</CardTitle>
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{selectedRoom ? `${totalActiveReports} laporan aktif di ${totalRooms} ruang. Pilih ruang untuk melihat objek fasilitasnya.` : "Laporan aktif dikelompokkan berdasarkan ruang dan objek fasilitas yang terdaftar."}</p>
              </div>
            </div>
            {selectedRoom ? <Button nativeButton={false} variant="outline" size="sm" className="w-fit shrink-0 bg-primary/5 text-primary-action-hover hover:bg-primary/10 dark:text-primary" render={<Link href="/teknisi/laporan-fasilitas?view=priority" />}>{remainingRooms ? `Lihat semua ${totalRooms} ruang` : "Buka prioritas"}<ArrowRight /></Button> : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {selectedRoom ? <>
            <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
              <section className="min-w-0 border-b border-border/60 p-5 md:p-6 lg:border-r lg:border-b-0" aria-labelledby="room-priority-title">
                <h3 id="room-priority-title" className="text-sm font-semibold text-foreground">Prioritas ruang aktif</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{remainingRooms ? `${topRooms.length} dari ${totalRooms} ruang dengan laporan terbanyak.` : "Diurutkan berdasarkan jumlah laporan aktif."}</p>
                <div className="mt-4 space-y-1.5">
                  {topRooms.map((room, index) => {
                    const selected = room.id === selectedRoom.id
                    return (
                      <Button
                        key={room.id}
                        type="button"
                        variant="ghost"
                        className={cn("h-auto w-full justify-start gap-3 rounded-xl border px-3 py-3 text-left whitespace-normal", selected ? "border-primary/25 bg-primary/5 hover:bg-primary/10" : "border-transparent hover:border-border/60 hover:bg-muted/50")}
                        onClick={() => setSelectedRoomId(room.id)}
                        aria-pressed={selected}
                        aria-label={`${room.activeReports === maximumRoomReports ? "Prioritas utama" : "Prioritas berikutnya"}: ${room.room}, ${room.activeReports} laporan aktif. Tinjau objek fasilitas.`}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-xs font-semibold tabular-nums text-muted-foreground">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
                            <span className={cn("min-w-0 break-words text-sm font-medium", selected ? "text-primary-action-hover dark:text-primary" : "text-foreground")}>{room.room}</span>
                            <span className="shrink-0 text-xs font-normal tabular-nums text-muted-foreground"><span className="font-semibold text-foreground">{room.activeReports}</span> laporan aktif</span>
                            <RoomPriorityBadge count={room.activeReports} highest={maximumRoomReports} />
                          </span>
                          <span className="mt-2 block h-1 overflow-hidden rounded-full bg-muted" aria-hidden="true">
                            <span className="block h-full rounded-full bg-primary/75" style={{ width: `${room.activeReports / maximumRoomReports * 100}%` }} />
                          </span>
                        </span>
                      </Button>
                    )
                  })}
                </div>
                {remainingRooms ? <p className="mt-3 text-xs leading-relaxed text-muted-foreground">{remainingRooms} ruang lainnya · {remainingActiveReports} laporan aktif</p> : null}
              </section>
              {/* Remount room-local disclosure and chart state when the selected room changes. */}
              <TechnicianFacilityComposition key={selectedRoom.id} room={selectedRoom} />
            </div>
            <div className="flex items-start gap-2 border-t border-border/60 bg-background/40 px-5 py-2.5 text-xs leading-relaxed text-muted-foreground md:px-6">
              <Info className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
              <p>Prioritas berdasarkan laporan aktif, bukan risiko. Jumlah per objek bukan total tiket.{unclassifiedReports > 0 ? ` ${unclassifiedReports} laporan di luar grafik ada di antrean.` : ""}</p>
            </div>
          </> : <div className="p-4 md:p-5">
            <TechnicianEmptyState context="priority" unclassifiedReports={unclassifiedReports} action={unclassifiedReports > 0 ? <Button nativeButton={false} variant="outline" size="sm" className="bg-card" render={<Link href="/teknisi/laporan-fasilitas?view=queue" />}>Tinjau laporan<ArrowRight /></Button> : undefined} />
          </div>}
        </CardContent>
      </div>
    </Card>
  )
}
