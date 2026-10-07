"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { ArrowRight, ChartPie, Info, Layers3, MapPin, Wrench } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import type { TechnicianRoomPriority } from "@/features/facilities/types"
import { TechnicianEmptyState } from "./technician-empty-state"
import { getTechnicianPrioritySummary } from "./technician-priority-summary"
import { cn } from "cn"

// Distinct chart colors identify rooms; they do not represent severity or status.
const roomColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]
const otherRoomsColor = "var(--border)"

export function TechnicianPriorityAnalysis({ rooms, unclassifiedReports = 0 }: { rooms: TechnicianRoomPriority[]; unclassifiedReports?: number }) {
  const { topRooms, totalRooms, totalActiveReports, remainingRooms, remainingActiveReports } = useMemo(() => getTechnicianPrioritySummary(rooms), [rooms])
  const [selectedRoomId, setSelectedRoomId] = useState("")
  // A completed room can disappear after refresh; keep the detail panel on a visible room.
  const selectedRoomIndex = Math.max(0, topRooms.findIndex((room) => room.id === selectedRoomId))
  const selectedRoom = topRooms[selectedRoomIndex]
  // Match the selected room's pie segment and legend, not its report status.
  const facilityChartConfig = {
    activeReports: {
      label: "Laporan aktif",
      color: roomColors[selectedRoomIndex],
    },
  } satisfies ChartConfig
  const roomChartData = useMemo(() => [
    ...topRooms.map((room, index) => ({ key: `room-${index + 1}`, room: room.room, activeReports: room.activeReports, fill: roomColors[index] })),
    ...(remainingRooms ? [{ key: "rooms-other", room: "Ruang lainnya", activeReports: remainingActiveReports, fill: otherRoomsColor }] : []),
  ], [topRooms, remainingRooms, remainingActiveReports])
  const roomChartConfig = {
    activeReports: { label: "Laporan aktif" },
    ...Object.fromEntries(roomChartData.map((room) => [room.key, { label: room.room, color: room.fill }])),
  } satisfies ChartConfig
  const facilityChartData = useMemo(() => selectedRoom?.facilities
    .filter((facility) => facility.activeReports > 0)
    .map((facility) => ({ facility: facility.facility, activeReports: facility.activeReports }))
    .sort((left, right) => right.activeReports - left.activeReports || left.facility.localeCompare(right.facility, "id")) ?? [], [selectedRoom])
  const primaryFacility = facilityChartData[0]
  const leadingFacilities = facilityChartData.filter((facility) => facility.activeReports === primaryFacility?.activeReports)
  const highestFacilityCount = primaryFacility?.activeReports ?? 1
  const facilityTicks = [...new Set([0, Math.ceil(highestFacilityCount / 2), highestFacilityCount])]
  const facilityChartHeight = Math.max(230, facilityChartData.length * 40 + 24)

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
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">{selectedRoom ? "Tinjau ruang dengan laporan aktif terbanyak dan objek fasilitas yang dikeluhkan." : "Laporan aktif dikelompokkan berdasarkan ruang dan objek fasilitas yang terdaftar."}</p>
              </div>
            </div>
            {selectedRoom ? <Button nativeButton={false} variant="outline" size="sm" className="w-fit shrink-0 bg-primary/5 text-primary-action-hover hover:bg-primary/10 dark:text-primary" render={<Link href="/teknisi/laporan-fasilitas?view=priority" />}>{remainingRooms ? `Lihat semua ${totalRooms} ruang` : "Buka prioritas"}<ArrowRight /></Button> : null}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {selectedRoom ? <>
            <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
              <section className="min-w-0 border-b border-border/60 p-5 md:p-6 xl:border-r xl:border-b-0" aria-labelledby="room-priority-title">
                <h3 id="room-priority-title" className="text-sm font-semibold text-foreground">Sebaran laporan aktif per ruang</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{remainingRooms ? `5 dari ${totalRooms} ruang dengan laporan terbanyak. Pilih ruang untuk melihat fasilitasnya.` : "Pilih ruang untuk melihat rincian fasilitasnya."}</p>

                <div className="mt-4 grid items-center gap-5 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                  <ChartContainer config={roomChartConfig} className="mx-auto h-[230px] w-full max-w-[260px] aspect-auto" initialDimension={{ width: 230, height: 230 }} aria-label={`${totalActiveReports} laporan aktif di ${totalRooms} ruang`}>
                    <PieChart accessibilityLayer>
                      <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                      <Pie data={roomChartData} dataKey="activeReports" nameKey="key" innerRadius={64} outerRadius={92} paddingAngle={2} strokeWidth={0} isAnimationActive="auto" animationBegin={0} animationDuration={600}>
                        <Label content={({ viewBox }) => {
                          if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                            return (
                              <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                                <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">{totalActiveReports}</tspan>
                                <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-[11px]">laporan aktif</tspan>
                              </text>
                            )
                          }
                          return null
                        }} />
                      </Pie>
                    </PieChart>
                  </ChartContainer>

                  <div className="min-w-0 space-y-1.5">
                    {topRooms.map((room, index) => {
                      const selected = room.id === selectedRoom.id
                      return (
                        <Button
                          key={room.id}
                          type="button"
                          variant="ghost"
                          className={cn("h-auto w-full justify-start gap-2.5 rounded-xl border border-transparent px-2.5 py-2.5 text-left", selected && "border-primary/25 bg-primary/5 hover:bg-primary/10")}
                          onClick={() => setSelectedRoomId(room.id)}
                          aria-pressed={selected}
                          aria-label={`Tinjau fasilitas di ${room.room}, ${room.activeReports} laporan aktif`}
                        >
                          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-card text-xs font-semibold text-muted-foreground">{index + 1}</span>
                          <span className="min-w-0 flex-1">
                            <span className={cn("block truncate text-sm font-medium", selected ? "text-primary-action-hover dark:text-primary" : "text-foreground")}>{room.room}</span>
                            <span className="mt-0.5 flex items-center gap-1.5 text-xs font-normal text-muted-foreground"><span className="size-2 shrink-0 rounded-sm" style={{ backgroundColor: roomColors[index] }} aria-hidden="true" />{room.activeReports} laporan aktif</span>
                          </span>
                          {room.activeReports === topRooms[0].activeReports ? <Badge className="shrink-0" tone="neutral" variant="outline">Terbanyak</Badge> : null}
                        </Button>
                      )
                    })}
                    {remainingRooms ? <p className="flex items-center gap-1.5 px-2.5 pt-2 text-xs leading-relaxed text-muted-foreground"><span className="size-2 shrink-0 rounded-sm bg-border" aria-hidden="true" />{remainingRooms} ruang lainnya · {remainingActiveReports} laporan aktif</p> : null}
                  </div>
                </div>
              </section>

              <section className="min-w-0 p-5 md:p-6" aria-labelledby="facility-priority-title">
                <h3 id="facility-priority-title" className="text-sm font-semibold text-foreground">Keluhan di dalam ruang</h3>
                <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5 shrink-0" aria-hidden="true" />{selectedRoom.location}</p>

                <div className="mt-4 flex items-start gap-3 rounded-xl border border-border/60 bg-background/40 p-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Wrench className="size-4" aria-hidden="true" /></span>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{primaryFacility ? leadingFacilities.length > 1 ? "Keluhan terbanyak" : `${primaryFacility.facility} paling banyak dilaporkan` : "Belum ada keluhan"}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{primaryFacility ? leadingFacilities.length > 1 ? `${leadingFacilities.map((facility) => facility.facility).join(", ")} · ${primaryFacility.activeReports} laporan masing-masing.` : `${primaryFacility.activeReports} dari ${selectedRoom.activeReports} laporan aktif di ruang ini.` : "Belum ada laporan aktif untuk objek fasilitas di ruang ini."}</p>
                  </div>
                </div>

                {facilityChartData.length ? <ChartContainer config={facilityChartConfig} className="mt-5 w-full aspect-auto" style={{ height: facilityChartHeight }} initialDimension={{ width: 320, height: facilityChartHeight }} aria-label={`Jumlah laporan aktif per fasilitas di ${selectedRoom.room}`}>
                  <BarChart accessibilityLayer data={facilityChartData} layout="vertical" margin={{ top: 0, bottom: 0, left: 0, right: 32 }}>
                    <CartesianGrid horizontal={false} />
                    <XAxis type="number" dataKey="activeReports" domain={[0, highestFacilityCount]} ticks={facilityTicks} allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} height={24} />
                    <YAxis dataKey="facility" type="category" tickLine={false} tickMargin={8} axisLine={false} width={72} />
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                    <Bar dataKey="activeReports" fill="var(--color-activeReports)" radius={[0, 6, 6, 0]} maxBarSize={28} isAnimationActive="auto" animationBegin={0} animationDuration={500}>
                      <LabelList dataKey="activeReports" position="right" className="fill-foreground text-xs" />
                    </Bar>
                  </BarChart>
                </ChartContainer> : null}
              </section>
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
