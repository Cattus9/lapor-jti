"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { AlertTriangle, ArrowRight, ChartPie, Layers3, MapPin, Wrench } from "lucide-react"
import { Bar, BarChart, CartesianGrid, Label, LabelList, Pie, PieChart, XAxis, YAxis } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { technicianRoomPriorities } from "@/features/facilities/mock/teknisi-dashboard"
import { cn } from "cn"

const roomColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"]

const roomChartData = technicianRoomPriorities.map((room, index) => ({
  key: `room-${index + 1}`,
  room: room.room,
  activeReports: room.activeReports,
  fill: roomColors[index % roomColors.length],
}))

const roomChartConfig = {
  activeReports: { label: "Laporan aktif" },
  ...Object.fromEntries(roomChartData.map((room) => [room.key, { label: room.room, color: room.fill }])),
} satisfies ChartConfig

const facilityChartConfig = {
  activeReports: {
    label: "Laporan aktif",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig

const priorityClass = {
  utama: "border-destructive/25 bg-destructive/10 text-destructive",
  tinggi: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300",
  sedang: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300",
} as const

function getPriority(rank: number, reportCount: number) {
  if (rank === 0) return { label: "Prioritas utama", tone: "utama" as const }
  if (reportCount >= 3) return { label: "Prioritas tinggi", tone: "tinggi" as const }
  return { label: "Prioritas sedang", tone: "sedang" as const }
}

export function TechnicianPriorityAnalysis() {
  const [selectedRoomName, setSelectedRoomName] = useState(technicianRoomPriorities[0]?.room ?? "")
  const selectedRoom = technicianRoomPriorities.find((room) => room.room === selectedRoomName) ?? technicianRoomPriorities[0]
  const totalActiveReports = technicianRoomPriorities.reduce((total, room) => total + room.activeReports, 0)
  const facilityChartData = useMemo(() => selectedRoom?.facilities.map((facility) => ({
    facility: facility.facility,
    activeReports: facility.activeReports,
  })) ?? [], [selectedRoom])
  const primaryFacility = selectedRoom?.facilities[0]
  const leadingFacilities = selectedRoom?.facilities.filter((facility) => facility.activeReports === primaryFacility?.activeReports) ?? []
  const hasSharedFacilityPriority = leadingFacilities.length > 1

  if (!selectedRoom) return null

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
                <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted-foreground">Diurutkan dari jumlah laporan aktif, lalu dipecah menurut fasilitas yang paling sering dikeluhkan.</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="w-fit border-primary/20 bg-primary/10 text-primary" variant="outline">{totalActiveReports} laporan aktif</Badge>
              <Button nativeButton={false} variant="outline" size="sm" className="bg-card" render={<Link href="/teknisi/laporan-fasilitas?view=priority" />}>Buka prioritas<ArrowRight /></Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="grid xl:grid-cols-[minmax(0,1.08fr)_minmax(360px,0.92fr)]">
            <section className="border-b border-border/60 p-5 md:p-6 xl:border-r xl:border-b-0" aria-labelledby="room-priority-title">
              <div>
                <h3 id="room-priority-title" className="text-sm font-semibold text-foreground">Sebaran laporan aktif per ruang</h3>
                <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Pilih ruang dari daftar untuk melihat rincian fasilitas.</p>
              </div>

              <div className="mt-4 grid items-center gap-5 md:grid-cols-[minmax(220px,0.8fr)_minmax(0,1.2fr)]">
                <ChartContainer config={roomChartConfig} className="mx-auto aspect-square h-[230px] w-full max-w-[260px]">
                  <PieChart accessibilityLayer>
                    <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel nameKey="key" />} />
                    <Pie data={roomChartData} dataKey="activeReports" nameKey="key" innerRadius={64} outerRadius={92} paddingAngle={2} strokeWidth={0}>
                      <Label content={({ viewBox }) => {
                        if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                          return (
                            <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                              <tspan x={viewBox.cx} y={viewBox.cy} className="fill-foreground text-2xl font-semibold">{totalActiveReports}</tspan>
                              <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 20} className="fill-muted-foreground text-[11px]">tiket aktif</tspan>
                            </text>
                          )
                        }
                        return null
                      }} />
                    </Pie>
                  </PieChart>
                </ChartContainer>

                <div className="space-y-2">
                  {technicianRoomPriorities.map((room, index) => {
                    const priority = getPriority(index, room.activeReports)
                    const selected = room.room === selectedRoom.room

                    return (
                      <Button
                        key={room.room}
                        type="button"
                        variant={selected ? "secondary" : "ghost"}
                        className={cn("h-auto w-full justify-start gap-3 px-3 py-2.5 text-left", selected && "ring-1 ring-primary/20")}
                        onClick={() => setSelectedRoomName(room.room)}
                      >
                        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-xs font-semibold text-foreground">{index + 1}</span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium text-foreground">{room.room}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">{room.activeReports} laporan aktif</span>
                        </span>
                        <Badge className={cn("shrink-0", priorityClass[priority.tone])} variant="outline">{priority.label}</Badge>
                      </Button>
                    )
                  })}
                </div>
              </div>
            </section>

            <section className="p-5 md:p-6" aria-labelledby="facility-priority-title">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 id="facility-priority-title" className="text-sm font-semibold text-foreground">Keluhan di dalam ruang</h3>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />{selectedRoom.location}</p>
                </div>
                <Select value={selectedRoom.room} onValueChange={(value) => setSelectedRoomName(value as string)}>
                  <SelectTrigger className="w-full bg-background sm:w-44" aria-label="Pilih ruang"><SelectValue /></SelectTrigger>
                  <SelectContent>{technicianRoomPriorities.map((room) => <SelectItem key={room.room} value={room.room}>{room.room}</SelectItem>)}</SelectContent>
                </Select>
              </div>

              <div className="mt-4 rounded-xl border border-border/60 bg-background/40 p-3">
                <div className="flex items-start gap-3">
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-primary"><Wrench className="size-4" aria-hidden="true" /></span>
                  <div>
                    <p className="text-sm font-medium text-foreground">{primaryFacility ? hasSharedFacilityPriority ? "Keluhan memiliki prioritas yang sama" : `${primaryFacility.facility} menjadi fokus pertama` : "Belum ada keluhan"}</p>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{primaryFacility ? hasSharedFacilityPriority ? `${leadingFacilities.length} fasilitas masing-masing memiliki ${primaryFacility.activeReports} laporan aktif: ${leadingFacilities.map((facility) => facility.facility).join(", ")}.` : `${primaryFacility.activeReports} dari ${selectedRoom.activeReports} laporan aktif pada ruang ini berkaitan dengan ${primaryFacility.facility}.` : "Belum ada laporan aktif pada ruang ini."}</p>
                  </div>
                </div>
              </div>

              <ChartContainer config={facilityChartConfig} className="mt-5 h-[230px] w-full aspect-auto">
                <BarChart accessibilityLayer data={facilityChartData} layout="vertical" margin={{ left: 0, right: 28 }}>
                  <CartesianGrid horizontal={false} />
                  <XAxis type="number" dataKey="activeReports" hide />
                  <YAxis dataKey="facility" type="category" tickLine={false} tickMargin={8} axisLine={false} width={72} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                  <Bar dataKey="activeReports" fill="var(--color-activeReports)" radius={[0, 6, 6, 0]} maxBarSize={28}>
                    <LabelList dataKey="activeReports" position="right" className="fill-foreground text-xs" />
                  </Bar>
                </BarChart>
              </ChartContainer>
            </section>
          </div>

          <div className="flex items-start gap-2 border-t border-border/60 bg-muted/30 px-5 py-3.5 text-xs leading-relaxed text-muted-foreground md:px-6">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-600 dark:text-amber-400" aria-hidden="true" />
            <p>Prioritas ini adalah indikator konsentrasi laporan aktif. Tingkat risiko keselamatan, usia tiket, dan SLA belum menjadi bobot perhitungan.</p>
          </div>
        </CardContent>
      </div>
    </Card>
  )
}
