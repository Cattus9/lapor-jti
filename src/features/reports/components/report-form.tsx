"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type { DraftView, PublicAttachment } from "../application/ports"
import type { ReportPayload } from "../domain/report"
import { parsePayload } from "../domain/report"
import { createReportSubmissionSnapshot, reportSubmissionBody, type ReportSubmissionSnapshot } from "./report-submission-state"
import { ReportSubmissionPreview } from "./report-submission-preview"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { formatCalendarDate, getTodayInWib } from "../domain/report-date"
import { facilityLocationGroups, facilityObjectGroups, serviceNames as services, studyPrograms } from "../domain/catalog"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  FileText,
  Headphones,
  ImagePlus,
  MapPin,
  PackageSearch,
  Save,
  Send,
  ShieldCheck,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Checkbox } from "@/components/ui/checkbox"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "cn"

const categories = [
  { value: "kehilangan-temuan", label: "Kehilangan & Temuan", icon: PackageSearch, hint: "Barang hilang atau barang yang ditemukan", iconClassName: "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300" },
  { value: "fasilitas", label: "Laporan Fasilitas", icon: Wrench, hint: "Kerusakan atau masalah fasilitas JTI", iconClassName: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300" },
  { value: "layanan", label: "Laporan Layanan", icon: Headphones, hint: "Kendala layanan internal JTI", iconClassName: "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/60 dark:text-violet-300" },
  { value: "lainnya", label: "Laporan Lainnya", icon: FileText, hint: "Laporan umum di luar kategori utama", iconClassName: "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/60 dark:text-orange-300" },
]

const facilities = facilityObjectGroups.flatMap((group) => group.facilities)

function SelectField({ id, label, placeholder, value, onValueChange, options, description }: { id: string; label: string; placeholder: string; value: string; onValueChange: (value: string) => void; options: string[]; description?: string }) {
  return (
    <Field>
      <FieldLabel>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}>
        <SelectTrigger id={id} aria-label={label} className="!h-11 w-full bg-background/70"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  )
}

function FacilityLocationSelectField({ value, onValueChange, otherLocation, onOtherLocationChange }: { value: string; onValueChange: (value: string) => void; otherLocation: string; onOtherLocationChange: (value: string) => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeLocationGroup, setActiveLocationGroup] = useState(facilityLocationGroups[0].label)
  const selectedLocationGroup = facilityLocationGroups.find((group) => group.locations.includes(value))?.label
  const activeLocationOptions = facilityLocationGroups.find((group) => group.label === activeLocationGroup) ?? facilityLocationGroups[0]

  function selectLocation(nextLocation: string) {
    onValueChange(nextLocation)
    if (nextLocation !== "Lainnya") onOtherLocationChange("")
    setMobileOpen(false)
  }

  function handleMobileOpenChange(nextOpen: boolean) {
    if (nextOpen) setActiveLocationGroup(selectedLocationGroup ?? facilityLocationGroups[0].label)
    setMobileOpen(nextOpen)
  }

  return (
    <Field>
      <FieldLabel>Lokasi fasilitas</FieldLabel>
      <input type="hidden" name="facility-location" value={value} />
      <Button type="button" variant="outline" aria-label="Pilih lokasi fasilitas" className="h-11 w-full justify-between bg-background/70 text-left font-normal sm:hidden" onClick={() => handleMobileOpenChange(true)}><span className={value ? "truncate text-foreground" : "truncate text-muted-foreground/70"}>{value || "Pilih lokasi fasilitas"}</span><ChevronDown className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" /></Button>
      <Sheet open={mobileOpen} onOpenChange={handleMobileOpenChange}>
        <SheetContent side="bottom" className="h-[66.6667dvh] overflow-hidden gap-0 rounded-t-2xl p-0 sm:hidden">
          <SheetHeader className="border-b border-border/60 px-5 py-4 pr-12"><SheetTitle>Pilih lokasi fasilitas</SheetTitle><SheetDescription>Pilih ruang, area bersama, sanitasi, atau area luar yang terdampak.</SheetDescription></SheetHeader>
          <div className="border-b border-border/60 px-5 py-3"><div className="flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Kategori lokasi">{facilityLocationGroups.map((group) => <Button key={group.label} type="button" size="sm" variant="outline" aria-pressed={activeLocationGroup === group.label} className={cn("h-8 shrink-0 rounded-full px-3 text-xs font-medium", activeLocationGroup === group.label ? "border-primary/35 bg-primary/10 text-primary hover:bg-primary/10" : "bg-card text-muted-foreground")} onClick={() => setActiveLocationGroup(group.label)}>{group.label}</Button>)}</div></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"><section className="space-y-3"><h3 className="text-sm font-semibold text-foreground">{activeLocationOptions.label}</h3><div className="grid gap-2">{activeLocationOptions.locations.map((location) => { const selected = value === location; return <Button key={location} type="button" variant="outline" aria-pressed={selected} className={cn("h-auto min-h-11 justify-between px-3 py-2.5 text-left font-normal", selected ? "border-primary/35 bg-primary/5 text-foreground" : "bg-card text-foreground")} onClick={() => selectLocation(location)}><span className="min-w-0 flex-1 truncate">{location}</span>{selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}</Button> })}</div></section></div>
        </SheetContent>
      </Sheet>
      <div className="hidden sm:block"><Select value={value} onValueChange={(nextValue) => selectLocation(nextValue ?? "")}>
        <SelectTrigger id="facility-location" aria-label="Lokasi fasilitas" className="!h-11 w-full bg-background/70"><SelectValue placeholder="Pilih lokasi fasilitas" /></SelectTrigger>
        <SelectContent matchTriggerWidth={false} className="w-[min(44rem,calc(100vw-2rem))] p-2" listClassName="grid max-h-[min(30rem,calc(100dvh-10rem))] grid-cols-1 gap-2 overflow-y-auto sm:grid-cols-3">
          {facilityLocationGroups.map((group) => (
            <SelectGroup key={group.label} className="rounded-lg border border-border/60 bg-muted/30 p-1.5">
              <SelectLabel className="px-1.5 pt-1.5 pb-2 font-medium text-foreground">{group.label}</SelectLabel>
              {group.locations.map((location) => <SelectItem key={location} value={location}>{location}</SelectItem>)}
            </SelectGroup>
          ))}
        </SelectContent>
      </Select></div>
      <FieldDescription>Pilih ruang, area bersama, sanitasi, atau area luar yang terdampak.</FieldDescription>
      {value === "Lainnya" ? <div className="space-y-2"><FieldLabel htmlFor="facility-location-detail">Detail lokasi</FieldLabel><Input id="facility-location-detail" name="facility-location-detail" value={otherLocation} onChange={(event) => onOtherLocationChange(event.target.value)} className="h-11 bg-background/70" placeholder="Contoh: Samping pintu masuk Gedung JTI" required /><FieldDescription>Jelaskan titik lokasi agar petugas dapat menemukan fasilitasnya.</FieldDescription></div> : null}
    </Field>
  )
}

function FacilityMultiSelectField({ value, onValueChange, otherFacility, onOtherFacilityChange }: { value: string[]; onValueChange: (value: string[]) => void; otherFacility: string; onOtherFacilityChange: (value: string) => void }) {
  const [desktopOpen, setDesktopOpen] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [activeObjectGroup, setActiveObjectGroup] = useState(facilityObjectGroups[0].label)
  const summary = value.length === 0 ? "Pilih satu atau lebih objek" : value.length <= 2 ? value.join(", ") : `${value.slice(0, 2).join(", ")} +${value.length - 2}`
  const activeObjectOptions = facilityObjectGroups.find((group) => group.label === activeObjectGroup) ?? facilityObjectGroups[0]

  function toggleFacility(facility: string, checked: boolean) {
    onValueChange(checked ? [...value, facility] : value.filter((item) => item !== facility))
    if (facility === "Lainnya" && !checked) onOtherFacilityChange("")
  }

  function clearFacilities() {
    onValueChange([])
    onOtherFacilityChange("")
  }

  function handleMobileOpenChange(nextOpen: boolean) {
    if (nextOpen) setActiveObjectGroup(facilityObjectGroups.find((group) => group.facilities.some((facility) => value.includes(facility)))?.label ?? facilityObjectGroups[0].label)
    setMobileOpen(nextOpen)
  }

  return (
    <Field>
      <FieldLabel>Objek fasilitas</FieldLabel>
      <input type="hidden" name="facilities" value={value.join(",")} />
      <Button type="button" variant="outline" aria-label="Pilih objek fasilitas" className="h-11 w-full justify-between bg-background/70 text-left font-normal sm:hidden" onClick={() => handleMobileOpenChange(true)}><span className={value.length ? "truncate text-foreground" : "truncate text-muted-foreground/70"}>{summary}</span><span className="flex shrink-0 items-center gap-2"><span className="text-xs text-muted-foreground">{value.length || ""}</span><ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" /></span></Button>
      <Sheet open={mobileOpen} onOpenChange={handleMobileOpenChange}>
        <SheetContent side="bottom" className="h-[66.6667dvh] overflow-hidden gap-0 rounded-t-2xl p-0 sm:hidden">
          <SheetHeader className="border-b border-border/60 px-5 py-4 pr-12"><SheetTitle>Pilih objek fasilitas</SheetTitle><SheetDescription>Centang satu atau beberapa objek yang terdampak.</SheetDescription></SheetHeader>
          <div className="border-b border-border/60 px-5 py-3"><div className="flex touch-pan-x gap-2 overflow-x-auto overscroll-x-contain [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" role="group" aria-label="Kategori objek fasilitas">{facilityObjectGroups.map((group) => { const selectedCount = group.facilities.filter((facility) => value.includes(facility)).length; return <Button key={group.label} type="button" size="sm" variant="outline" aria-pressed={activeObjectGroup === group.label} className={cn("h-8 shrink-0 rounded-full px-3 text-xs font-medium", activeObjectGroup === group.label ? "border-primary/35 bg-primary/10 text-primary hover:bg-primary/10" : "bg-card text-muted-foreground")} onClick={() => setActiveObjectGroup(group.label)}>{group.label}{selectedCount ? ` (${selectedCount})` : ""}</Button> })}</div></div>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4"><section className="space-y-3"><h3 className="text-sm font-semibold text-foreground">{activeObjectOptions.label}</h3><div className={cn("grid gap-2", activeObjectOptions.facilities.length === 1 ? "grid-cols-1" : "grid-cols-2")}>{activeObjectOptions.facilities.map((facility) => { const checked = value.includes(facility); return <Button key={facility} type="button" variant="outline" aria-pressed={checked} className={cn("h-auto min-h-14 justify-between px-3 py-2.5 text-left font-normal", checked ? "border-primary/35 bg-primary/5 text-foreground" : "bg-card text-foreground")} onClick={() => toggleFacility(facility, !checked)}><span className="min-w-0 flex-1 truncate">{facility}</span>{checked ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}</Button> })}</div></section></div>
          <SheetFooter className="flex-row items-center justify-between border-t border-border/60 px-5 py-3"><p className="text-xs text-muted-foreground">{value.length ? `${value.length} objek dipilih` : "Belum ada objek dipilih"}</p><div className="flex items-center gap-2">{value.length ? <Button type="button" size="sm" variant="ghost" onClick={clearFacilities}>Bersihkan</Button> : null}<Button type="button" size="sm" onClick={() => setMobileOpen(false)}>Selesai</Button></div></SheetFooter>
        </SheetContent>
      </Sheet>
      <div className="hidden sm:block"><Popover open={desktopOpen} onOpenChange={setDesktopOpen}>
        <PopoverTrigger render={<Button id="facility-type" type="button" variant="outline" aria-label="Objek fasilitas" className="h-11 w-full justify-between bg-background/70 text-left font-normal" />}>
          <span className={value.length ? "truncate text-foreground" : "truncate text-muted-foreground/70"}>{summary}</span>
          <span className="flex items-center gap-2"><span className="text-xs text-muted-foreground">{value.length || ""}</span><ChevronDown className="size-4 text-muted-foreground" aria-hidden="true" /></span>
        </PopoverTrigger>
        <PopoverContent align="start" sideOffset={6} className="w-[min(24rem,calc(100vw-2rem))] p-0">
          <div className="border-b border-border/60 px-4 py-3"><p className="text-sm font-semibold text-foreground">Pilih objek fasilitas</p><p className="mt-0.5 text-xs text-muted-foreground">Centang satu atau beberapa objek yang terdampak.</p></div>
          <div className="grid gap-1.5 p-3 sm:grid-cols-2">
            {facilities.map((facility) => {
              const checked = value.includes(facility)

              return <label key={facility} htmlFor={`facility-${facility}`} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm transition-colors", checked ? "border-primary/25 bg-primary/5 text-foreground" : "border-transparent hover:bg-muted/60")}>
                <Checkbox id={`facility-${facility}`} checked={checked} onCheckedChange={(nextChecked) => toggleFacility(facility, nextChecked)} />
                <span className="font-medium">{facility}</span>
              </label>
            })}
          </div>
          <div className="flex items-center justify-between border-t border-border/60 px-4 py-3"><p className="text-xs text-muted-foreground">{value.length ? `${value.length} objek dipilih` : "Belum ada objek dipilih"}</p><div className="flex items-center gap-2">{value.length ? <Button type="button" size="sm" variant="ghost" onClick={clearFacilities}>Bersihkan</Button> : null}<Button type="button" size="sm" onClick={() => setDesktopOpen(false)}>Selesai</Button></div></div>
        </PopoverContent>
      </Popover></div>
      <FieldDescription>Pilih seluruh objek yang terdampak pada laporan ini.</FieldDescription>
      {value.includes("Lainnya") ? <div className="space-y-2"><FieldLabel htmlFor="other-facility">Objek lainnya</FieldLabel><Input id="other-facility" name="other-facility" value={otherFacility} onChange={(event) => onOtherFacilityChange(event.target.value)} className="h-11 bg-background/70" placeholder="Contoh: Pintu, jendela, atau dispenser" required /><FieldDescription>Tuliskan nama objek yang belum tersedia pada pilihan.</FieldDescription></div> : null}
    </Field>
  )
}

function normalizeTimePart(value: string, maximum: number) {
  if (!value.trim()) return ""

  const parsed = Number.parseInt(value, 10)
  if (Number.isNaN(parsed)) return ""

  return String(Math.min(Math.max(parsed, 0), maximum)).padStart(2, "0")
}

function TimeUnitSpinner({ label, value, maximum, onValueChange }: { label: string; value: string; maximum: number; onValueChange: (value: string) => void }) {
  function step(offset: number) {
    const current = Number.parseInt(value || "0", 10)
    const nextValue = Number.isNaN(current) ? 0 : (current + offset + maximum + 1) % (maximum + 1)
    onValueChange(String(nextValue).padStart(2, "0"))
  }

  return (
    <section className="grid justify-items-center gap-2" aria-label={`Pilih ${label.toLowerCase()}`}>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => step(1)} aria-label={`Tambah ${label.toLowerCase()}`}><ChevronUp /></Button>
      <Input value={value} onChange={(event) => onValueChange(event.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => onValueChange(normalizeTimePart(value, maximum))} inputMode="numeric" maxLength={2} aria-label={label} className="h-12 w-18 rounded-lg bg-background text-center text-lg font-semibold tabular-nums" placeholder="00" />
      <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-foreground" onClick={() => step(-1)} aria-label={`Kurangi ${label.toLowerCase()}`}><ChevronDown /></Button>
    </section>
  )
}

function TimePickerField({ value, onValueChange }: { value: string; onValueChange: (value: string) => void }) {
  const [open, setOpen] = useState(false)
  const [selectedHour, setSelectedHour] = useState("")
  const [selectedMinute, setSelectedMinute] = useState("")

  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      const [hour = "00", minute = "00"] = value ? value.split(":") : []
      setSelectedHour(hour)
      setSelectedMinute(minute)
    }
    setOpen(nextOpen)
  }

  function confirmTime() {
    const hour = normalizeTimePart(selectedHour, 23)
    const minute = normalizeTimePart(selectedMinute, 59)
    if (!hour || !minute) return
    onValueChange(`${hour}:${minute}`)
    setOpen(false)
  }

  return (
    <Field>
      <FieldLabel>Waktu</FieldLabel>
      <Input
        id="incident-time-mobile"
        type="time"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        step="60"
        aria-label="Waktu kejadian"
        className="h-11 bg-background/70 tabular-nums sm:hidden"
      />
      <FieldDescription className="sm:hidden">Gunakan pemilih waktu perangkat untuk memilih jam dan menit.</FieldDescription>
      <div className="hidden sm:block">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger render={<Button id="incident-time-desktop" type="button" variant="outline" aria-label="Waktu kejadian" className="h-11 w-full justify-start bg-background/70 text-left font-normal" />}>
            <Clock3 className="size-4 text-muted-foreground" aria-hidden="true" />
            {value || <span className="text-muted-foreground/70">Pilih waktu</span>}
          </PopoverTrigger>
          <PopoverContent align="start" sideOffset={6} className="w-[min(26rem,calc(100vw-2rem))] p-0">
            <div className="border-b border-border/60 px-4 py-3">
              <p className="text-sm font-semibold text-foreground">Pilih waktu</p>
              <p className="mt-0.5 text-xs text-muted-foreground">Pilih jam dan menit kejadian.</p>
            </div>
            <div className="flex items-center justify-center gap-7 px-5 py-5 sm:gap-10">
              <TimeUnitSpinner label="Jam" value={selectedHour} maximum={23} onValueChange={setSelectedHour} />
              <span className="mt-6 text-2xl font-semibold text-muted-foreground" aria-hidden="true">:</span>
              <TimeUnitSpinner label="Menit" value={selectedMinute} maximum={59} onValueChange={setSelectedMinute} />
            </div>
            <div className="flex items-center justify-between border-t border-border/60 px-4 py-3">
              <p className="text-xs text-muted-foreground">{selectedHour && selectedMinute ? `${normalizeTimePart(selectedHour, 23)}:${normalizeTimePart(selectedMinute, 59)}` : "Belum dipilih"}</p>
              <div className="flex items-center gap-2"><Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>Batal</Button><Button type="button" size="sm" disabled={!selectedHour || !selectedMinute} onClick={confirmTime}>Selesai</Button></div>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </Field>
  )
}

function CategoryCard({ value, selected, onSelect }: { value: (typeof categories)[number]; selected: boolean; onSelect: () => void }) {
  const Icon = value.icon
  return (
    <Button type="button" variant="outline" onClick={onSelect} aria-pressed={selected} className={`group flex h-auto w-full min-h-24 whitespace-normal items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${selected ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-background/60 hover:border-primary/50 hover:bg-muted/40"}`}>
      <span className={cn("mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border", value.iconClassName)}><Icon className="size-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">{value.label}{selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground/70">{value.hint}</span></span>
    </Button>
  )
}

function ReportGuidance({ category }: { category: string }) {
  const selectedCategory = categories.find((item) => item.value === category)
  const guidance = [[MapPin, "Sebutkan lokasi yang jelas"], [Clock3, "Gunakan waktu kejadian yang tepat"], [ImagePlus, "Tambahkan foto bila membantu"]] as const
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <Card className="rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs"><ShieldCheck className="size-5 text-primary" aria-hidden="true" /></div><div className="space-y-1"><CardTitle className="text-base">Sebelum mengirim</CardTitle><CardDescription>Lengkapi detail agar laporan lebih cepat ditangani.</CardDescription></div></CardHeader><CardContent className="space-y-4 p-5 pt-0"><div className="space-y-3 border-t border-border/60 pt-4">{guidance.map(([Icon, text]) => <div key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{text}</span></div>)}</div>{selectedCategory ? <div className="rounded-lg bg-muted/60 p-3 text-sm"><p className="font-medium text-foreground">Pengelola otomatis</p><p className="mt-1 text-muted-foreground">Laporan <span className="font-medium text-foreground">{selectedCategory.label}</span> akan diteruskan ke {category === "kehilangan-temuan" ? "Satpam" : category === "fasilitas" ? "Teknisi" : "Manajemen Jurusan"}.</p></div> : <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">Pilih kategori untuk melihat pengelola laporan.</div>}</CardContent></div></Card>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-2xs"><Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><p className="leading-relaxed text-muted-foreground">Nomor tiket unik akan dibuat setelah laporan dikirim dan dapat dipantau dari menu Laporan Saya.</p></div>
    </aside>
  )
}

export function ReportForm({ initialDraft }: { initialDraft?: DraftView }) {
  const router = useRouter()
  const { notify } = useActivityNotifications()
  const formRef = useRef<HTMLFormElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const successLinkRef = useRef<HTMLAnchorElement>(null)
  const previewUrls = useRef<string[]>([])
  const busy = useRef(false)
  const [draftId] = useState(() => initialDraft?.id ?? crypto.randomUUID())
  const [revision, setRevision] = useState(initialDraft?.revision ?? 0)
  const [retained, setRetained] = useState<PublicAttachment[]>(initialDraft?.attachments ?? [])
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<(ReportSubmissionSnapshot & { uploadUrls: string[] }) | null>(null)
  const [ticket, setTicket] = useState("")
  const [category, setCategory] = useState(initialDraft?.payload.category ?? "")
  const [reportType, setReportType] = useState(initialDraft?.payload.reportType ?? "")
  const [location, setLocation] = useState(initialDraft?.payload.location ?? "")
  const [otherLocation, setOtherLocation] = useState(initialDraft?.payload.otherLocation ?? "")
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initialDraft?.payload.facilities ?? [])
  const [otherFacility, setOtherFacility] = useState(initialDraft?.payload.otherFacility ?? "")
  const [service, setService] = useState(initialDraft?.payload.service ?? "")
  const [program, setProgram] = useState(initialDraft?.payload.program ?? "")
  const [attachments, setAttachments] = useState<File[]>([])
  const [incidentDate, setIncidentDate] = useState<Date | undefined>(() => initialDraft?.payload.incidentDate ? new Date(initialDraft.payload.incidentDate + "T00:00:00") : undefined)
  const [incidentTime, setIncidentTime] = useState(initialDraft?.payload.incidentTime ?? "")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [savedState, setSavedState] = useState<"idle" | "draft" | "submitted">(initialDraft ? "draft" : "idle")
  const today = new Date(`${getTodayInWib()}T00:00:00`)
  const incidentDateError = incidentDate && formatCalendarDate(incidentDate) > getTodayInWib() ? "Tanggal kejadian tidak boleh melebihi hari ini (WIB)." : ""
  // Blob URLs belong to this form, never to a persisted report or API payload.
  useEffect(() => () => { for (const url of previewUrls.current) URL.revokeObjectURL(url) }, [])
  function releasePreview() { for (const url of previewUrls.current) URL.revokeObjectURL(url); previewUrls.current = [] }

  function resetCategory(nextCategory: string) { setCategory(nextCategory); setReportType(""); setLocation(""); setOtherLocation(""); setSelectedFacilities([]); setOtherFacility(""); setService(""); setProgram(""); setAttachments([]); setRetained([]); setIncidentDate(undefined); setIncidentTime(""); setSavedState("idle"); setError("") }
  function currentPayload(): ReportPayload {
    const fields = new FormData(formRef.current!)
    const text = (name: string) => String(fields.get(name) ?? "")
    const date = incidentDate ? formatCalendarDate(incidentDate) : ""
    return { category: category as ReportPayload["category"], title: text("title"), description: text("description"), incidentDate: date, incidentTime, location, otherLocation, reportType, itemName: text("item-name"), itemDetails: text("item-details"), facilities: selectedFacilities, otherFacility, service, program, otherCategory: text("other-category") }
  }
  async function save(submit: boolean, confirmed?: ReportSubmissionSnapshot) {
    // Only the preview's explicit confirmation can initiate a report submission.
    if (!formRef.current || busy.current || savedState === "submitted" || (submit && (!confirmed || confirmed !== preview))) return
    busy.current = true; setPending(true); setError("")
    try {
      const snapshot = confirmed ?? { payload: parsePayload(currentPayload(), false), retained, files: attachments }
      // Revalidate the frozen preview at confirmation, including after midnight WIB.
      if (submit) parsePayload(snapshot.payload, true)
      const body = reportSubmissionBody(snapshot, draftId, revision)
      const response = await fetch(submit ? "/api/pelapor/reports" : "/api/pelapor/drafts", { method: "POST", body })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result) throw new Error(result?.error || "Permintaan belum dapat dipastikan berhasil. Coba lagi; sistem mencegah laporan ganda.")
      if (submit) {
        if (typeof result.report?.ticketNumber !== "string") throw new Error("Nomor tiket belum diterima. Coba lagi; sistem mencegah laporan ganda.")
        setTicket(result.report.ticketNumber); setSavedState("submitted"); releasePreview(); setPreview(null)
        notify({ title: "Laporan berhasil dikirim", description: `Tiket ${result.report.ticketNumber} telah diterima. Pantau perkembangannya di Laporan Saya.`, tone: "success" })
      }
      else { setRevision(result.draft.revision); setRetained(result.draft.attachments); setAttachments([]); setSavedState("draft"); router.replace(`/pelapor/buat-laporan?draft=${draftId}`, { scroll: false }) }
      if (!submit) router.refresh()
    } catch (error) {
      const message = error instanceof TypeError ? "Koneksi bermasalah. Silakan coba lagi; sistem mencegah laporan ganda." : error instanceof Error ? error.message : "Koneksi bermasalah. Silakan coba lagi."
      setError(message)
      notify({ title: submit ? "Pengiriman belum berhasil" : "Draft belum tersimpan", description: message, tone: "warning" })
    }
    finally { busy.current = false; setPending(false) }
  }
  function handleDraft() { void save(false) }
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || preview || savedState === "submitted" || !event.currentTarget.reportValidity()) return
    try {
      const snapshot = createReportSubmissionSnapshot(currentPayload(), retained, attachments)
      for (const file of snapshot.files) previewUrls.current.push(URL.createObjectURL(file))
      setError(""); setPreview({ ...snapshot, uploadUrls: [...previewUrls.current] })
    } catch (error) {
      releasePreview()
      const message = error instanceof Error ? error.message : "Periksa kembali isian laporan Anda."
      setError(message)
      notify({ title: "Periksa isian laporan", description: message, tone: "warning" })
    }
  }
  const hasCompleteFacilityDetails = Boolean(location && selectedFacilities.length && (location !== "Lainnya" || otherLocation.trim()) && (!selectedFacilities.includes("Lainnya") || otherFacility.trim()))
  const canSubmit = Boolean(category && incidentDate && incidentTime && !incidentDateError) && (category !== "kehilangan-temuan" || Boolean(reportType)) && (category !== "fasilitas" || hasCompleteFacilityDetails) && (category !== "layanan" || Boolean(service && program))
  const titlePlaceholder = category === "kehilangan-temuan"
    ? reportType === "Kehilangan"
      ? "Contoh: Dompet hilang di Ruang 3.4"
      : reportType === "Temuan"
        ? "Contoh: Kartu mahasiswa ditemukan di Lobi Gedung JTI"
        : "Contoh: Barang hilang atau temuan di Gedung JTI"
    : category === "fasilitas"
      ? "Contoh: Proyektor di Lab Multimedia tidak menyala"
      : category === "layanan"
        ? "Contoh: Tidak dapat mengakses JTI E-Learning"
        : "Contoh: Usulan perbaikan papan informasi digital"

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
      <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><FileText className="size-4 text-primary" aria-hidden="true" />Formulir laporan</div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-5 md:p-6">
        <form ref={formRef} tabIndex={-1} className="space-y-7" onSubmit={handleSubmit} aria-busy={pending}>
          <fieldset disabled={pending || Boolean(preview) || savedState === "submitted"} className="space-y-7">
          <Field><FieldLabel>Kategori laporan</FieldLabel><FieldDescription>Pilih satu kategori untuk menampilkan kolom yang relevan.</FieldDescription><div className="grid gap-3 sm:grid-cols-2">{categories.map((item) => <CategoryCard key={item.value} value={item} selected={category === item.value} onSelect={() => resetCategory(item.value)} />)}</div></Field>
          {category ? <div className="space-y-5 border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">1</span><h2 className="text-sm font-semibold">Informasi laporan</h2></div><FieldGroup>
            {category === "kehilangan-temuan" ? <SelectField id="report-type" label="Jenis laporan" placeholder="Pilih jenis laporan" value={reportType} onValueChange={setReportType} options={["Kehilangan", "Temuan"]} /> : null}
            <Field><FieldLabel htmlFor="title">Judul laporan</FieldLabel><Input id="title" name="title" defaultValue={initialDraft?.payload.title} className="h-11 bg-background/70" placeholder={titlePlaceholder} required /></Field>
            {category === "kehilangan-temuan" ? <><Field><FieldLabel htmlFor="item-name">Nama barang</FieldLabel><Input id="item-name" name="item-name" defaultValue={initialDraft?.payload.itemName} className="h-11 bg-background/70" placeholder="Contoh: Dompet kulit warna hitam" required /></Field><Field><FieldLabel htmlFor="item-details">Ciri-ciri barang</FieldLabel><Textarea id="item-details" name="item-details" defaultValue={initialDraft?.payload.itemDetails} placeholder="Tuliskan ciri khas, isi, atau tanda pengenal barang." required /></Field></> : null}
            {category === "fasilitas" ? <div className="grid gap-5 sm:grid-cols-2"><FacilityLocationSelectField value={location} onValueChange={setLocation} otherLocation={otherLocation} onOtherLocationChange={setOtherLocation} /><FacilityMultiSelectField value={selectedFacilities} onValueChange={setSelectedFacilities} otherFacility={otherFacility} onOtherFacilityChange={setOtherFacility} /></div> : null}
            {category === "layanan" ? <div className="grid gap-5 sm:grid-cols-2"><SelectField id="service" label="Jenis layanan" placeholder="Pilih layanan" value={service} onValueChange={setService} options={services} /><SelectField id="program" label="Unit atau program studi" placeholder="Pilih unit terkait" value={program} onValueChange={setProgram} options={studyPrograms} /></div> : null}
            {category === "lainnya" ? <Field><FieldLabel htmlFor="other-category">Kategori umum</FieldLabel><Input id="other-category" name="other-category" defaultValue={initialDraft?.payload.otherCategory} className="h-11 bg-background/70" placeholder="Contoh: Usulan kegiatan atau informasi umum" required /></Field> : null}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              <Field data-invalid={Boolean(incidentDateError)}>
                <FieldLabel htmlFor="incident-date">Tanggal kejadian</FieldLabel>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger render={<Button id="incident-date" type="button" variant="outline" aria-label="Tanggal kejadian" aria-invalid={Boolean(incidentDateError)} aria-describedby={incidentDateError ? "incident-date-description incident-date-error" : "incident-date-description"} className="h-11 w-full justify-start bg-background/70 text-left font-normal" />}>
                    <CalendarDays className="size-4 text-muted-foreground" />{incidentDate ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(incidentDate) : <span className="text-muted-foreground/70">Pilih tanggal</span>}
                  </PopoverTrigger>
                  <PopoverContent align="start">
                    <Calendar mode="single" selected={incidentDate} today={today} defaultMonth={incidentDate && !incidentDateError ? incidentDate : today} endMonth={today} disabled={(date) => formatCalendarDate(date) > getTodayInWib()} onSelect={(date) => {
                      if (date && formatCalendarDate(date) > getTodayInWib()) { setError("Tanggal kejadian tidak boleh melebihi hari ini (WIB)."); return }
                      setIncidentDate(date); setDatePickerOpen(false)
                    }} />
                  </PopoverContent>
                </Popover>
                <FieldDescription id="incident-date-description">Maksimal hari ini (WIB).</FieldDescription>
                {incidentDateError ? <FieldError id="incident-date-error">{incidentDateError}</FieldError> : null}
              </Field>
              <TimePickerField value={incidentTime} onValueChange={setIncidentTime} />
              {category !== "fasilitas" ? <Field><FieldLabel htmlFor="location">Lokasi kejadian</FieldLabel><Input id="location" name="location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-11 bg-background/70" placeholder="Contoh: Gedung JTI, Ruang 3.4" required /></Field> : <div className="flex items-end text-sm text-muted-foreground"><div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Lokasi fasilitas dipilih dari daftar lokasi JTI di atas.</span></div></div>}
            </div>
            <Field><FieldLabel htmlFor="description">Deskripsi laporan</FieldLabel><Textarea id="description" name="description" defaultValue={initialDraft?.payload.description} placeholder="Jelaskan kronologi, kondisi, atau kendala secara singkat dan jelas." required /><FieldDescription>Hindari data pribadi yang tidak diperlukan dalam laporan.</FieldDescription></Field>
          </FieldGroup></div> : null}
          {category ? <div className="space-y-5 border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">2</span><h2 className="text-sm font-semibold">Lampiran dan pengiriman</h2></div><Field><FieldLabel htmlFor="attachment">Lampiran pendukung <span className="font-normal text-muted-foreground">(opsional)</span></FieldLabel>{retained.length ? <div className="space-y-2">{retained.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><a href={`/api/pelapor/attachments/${file.id}`} className="truncate text-sm text-primary">{file.name}</a><Button type="button" variant="ghost" size="sm" onClick={() => setRetained((items) => items.filter((item) => item.id !== file.id))}>Hapus</Button></div>)}</div> : null}<FileDropzone id="attachment" value={attachments} onChange={setAttachments} maxFiles={Math.max(0, 4 - retained.length)} /><FieldDescription>Foto atau dokumen pendukung membantu pengelola memahami laporan Anda.</FieldDescription></Field><div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>Data laporan hanya digunakan untuk penanganan internal JTI.</span></div><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={handleDraft} disabled={savedState === "submitted"}><Save />Simpan draft</Button><Button ref={submitButtonRef} type="submit" aria-haspopup="dialog" disabled={!canSubmit || savedState === "submitted"}><Send />Kirim laporan<ArrowRight className="ml-0.5" /></Button></div></div></div> : <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">Pilih kategori laporan untuk mulai mengisi formulir.</div>}
          </fieldset>
          {pending ? <p className="text-sm text-muted-foreground" role="status">Menyimpan laporan...</p> : null}
          {error ? <FieldError>{error}</FieldError> : null}
          {savedState === "draft" ? <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><CheckCircle2 className="size-4 text-primary" />Draft terakhir tersimpan. Simpan lagi setelah melakukan perubahan.</p> : null}
          {savedState === "submitted" ? <div className="space-y-3" role="status"><p className="flex items-center gap-2 text-sm"><CheckCircle2 className="size-4 text-primary" />Laporan {ticket} berhasil dikirim.</p><Button nativeButton={false} render={<Link ref={successLinkRef} href={`/pelapor/laporan-saya?ticket=${encodeURIComponent(ticket)}`} />}>Lihat laporan<ArrowRight /></Button></div> : null}
        </form>
      </CardContent></div></Card>
      <ReportGuidance category={category} />
      {preview ? <ReportSubmissionPreview snapshot={preview} uploadUrls={preview.uploadUrls} pending={pending} error={error} onClose={() => { if (!busy.current) { releasePreview(); setPreview(null); setError("") } }} onConfirm={() => { void save(true, preview) }} finalFocus={() => successLinkRef.current ?? (submitButtonRef.current?.disabled ? formRef.current : submitButtonRef.current)} /> : null}
    </div>
  )
}
