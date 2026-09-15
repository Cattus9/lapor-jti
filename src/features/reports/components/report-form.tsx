"use client"

import { useState } from "react"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
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
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const categories = [
  { value: "kehilangan-temuan", label: "Kehilangan & Temuan", icon: PackageSearch, hint: "Barang hilang atau barang yang ditemukan" },
  { value: "fasilitas", label: "Laporan Fasilitas", icon: Wrench, hint: "Kerusakan atau masalah fasilitas JTI" },
  { value: "layanan", label: "Laporan Layanan", icon: Headphones, hint: "Kendala layanan internal JTI" },
  { value: "lainnya", label: "Laporan Lainnya", icon: FileText, hint: "Laporan umum di luar kategori utama" },
]

const rooms = Array.from({ length: 12 }, (_, index) => `Ruang 3.${index + 1}`).concat("Lab")
const workingSpaces = ["Lantai 1", "Lantai 2", "Lantai 3", "Lantai 4"]
const facilities = ["AC", "LCD", "TV", "Lampu", "Meja", "Kursi", "Lainnya"]
const services = ["JTI Surat", "JTI Ruang Baca", "JTI Evaluasi Pembelajaran", "JTI E-Learning", "Administrasi", "Keamanan", "Kebersihan"]
const studyPrograms = ["TIF", "MIF", "TKK", "TRK", "TRPL", "Magister", "TIF Nganjuk", "TIF Sidoarjo"]
const times = Array.from({ length: 48 }, (_, index) => `${String(Math.floor(index / 2)).padStart(2, "0")}:${index % 2 === 0 ? "00" : "30"}`)

function SelectField({ id, label, placeholder, value, onValueChange, options, description }: { id: string; label: string; placeholder: string; value: string; onValueChange: (value: string) => void; options: string[]; description?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Select value={value} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}>
        <SelectTrigger id={id} className="!h-11 w-full bg-background/70"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
    </Field>
  )
}

function CategoryCard({ value, selected, onSelect }: { value: (typeof categories)[number]; selected: boolean; onSelect: () => void }) {
  const Icon = value.icon
  return (
    <button type="button" onClick={onSelect} aria-pressed={selected} className={`group flex min-h-24 items-start gap-3 rounded-xl border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 ${selected ? "border-primary bg-primary/5 shadow-xs" : "border-border bg-background/60 hover:border-primary/50 hover:bg-muted/40"}`}>
      <span className={`mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-lg border ${selected ? "border-primary/30 bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground group-hover:text-foreground"}`}><Icon className="size-4" aria-hidden="true" /></span>
      <span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">{value.label}{selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null}</span><span className="mt-1 block text-xs leading-relaxed text-muted-foreground/70">{value.hint}</span></span>
    </button>
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

export function ReportForm() {
  const [category, setCategory] = useState("")
  const [reportType, setReportType] = useState("")
  const [location, setLocation] = useState("")
  const [facility, setFacility] = useState("")
  const [workspace, setWorkspace] = useState("")
  const [service, setService] = useState("")
  const [program, setProgram] = useState("")
  const [attachments, setAttachments] = useState<File[]>([])
  const [incidentDate, setIncidentDate] = useState<Date>()
  const [incidentTime, setIncidentTime] = useState("")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [savedState, setSavedState] = useState<"idle" | "draft" | "submitted">("idle")

  function resetCategory(nextCategory: string) { setCategory(nextCategory); setReportType(""); setLocation(""); setFacility(""); setWorkspace(""); setService(""); setProgram(""); setAttachments([]); setIncidentDate(undefined); setIncidentTime(""); setSavedState("idle") }
  function handleDraft() { setSavedState("draft") }
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); setSavedState("submitted") }
  const canSubmit = Boolean(category && incidentDate && incidentTime) && (category !== "kehilangan-temuan" || Boolean(reportType)) && (category !== "fasilitas" || Boolean(facility && (location || workspace))) && (category !== "layanan" || Boolean(service && program))

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(280px,0.55fr)]">
      <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><FileText className="size-4 text-primary" aria-hidden="true" />Formulir laporan</div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-5 md:p-6">
        <form className="space-y-7" onSubmit={handleSubmit}>
          <Field><FieldLabel>Kategori laporan</FieldLabel><FieldDescription>Pilih satu kategori untuk menampilkan kolom yang relevan.</FieldDescription><div className="grid gap-3 sm:grid-cols-2">{categories.map((item) => <CategoryCard key={item.value} value={item} selected={category === item.value} onSelect={() => resetCategory(item.value)} />)}</div></Field>
          {category ? <div className="space-y-5 border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">1</span><h2 className="text-sm font-semibold">Informasi laporan</h2></div><FieldGroup>
            {category === "kehilangan-temuan" ? <SelectField id="report-type" label="Jenis laporan" placeholder="Pilih jenis laporan" value={reportType} onValueChange={setReportType} options={["Kehilangan", "Temuan"]} /> : null}
            <Field><FieldLabel htmlFor="title">Judul laporan</FieldLabel><Input id="title" name="title" className="h-11 bg-background/70" placeholder="Contoh: Dompet tertinggal di Ruang 3.4" required /></Field>
            {category === "kehilangan-temuan" ? <><Field><FieldLabel htmlFor="item-name">Nama barang</FieldLabel><Input id="item-name" name="item-name" className="h-11 bg-background/70" placeholder="Contoh: Dompet kulit warna hitam" required /></Field><Field><FieldLabel htmlFor="item-details">Ciri-ciri barang</FieldLabel><Textarea id="item-details" name="item-details" placeholder="Tuliskan ciri khas, isi, atau tanda pengenal barang." required /></Field></> : null}
            {category === "fasilitas" ? <><div className="grid gap-5 sm:grid-cols-2"><SelectField id="facility-location" label="Ruangan" placeholder="Pilih ruangan" value={location} onValueChange={setLocation} options={rooms} /><SelectField id="facility-type" label="Jenis fasilitas" placeholder="Pilih fasilitas" value={facility} onValueChange={setFacility} options={facilities} /></div><SelectField id="working-space" label="Area tambahan" placeholder="Pilih area bila berada di working space" value={workspace} onValueChange={setWorkspace} options={workingSpaces} description="Isi bila laporan berada di working space, bukan di ruangan." /></> : null}
            {category === "layanan" ? <div className="grid gap-5 sm:grid-cols-2"><SelectField id="service" label="Jenis layanan" placeholder="Pilih layanan" value={service} onValueChange={setService} options={services} /><SelectField id="program" label="Unit atau program studi" placeholder="Pilih unit terkait" value={program} onValueChange={setProgram} options={studyPrograms} /></div> : null}
            {category === "lainnya" ? <Field><FieldLabel htmlFor="other-category">Kategori umum</FieldLabel><Input id="other-category" name="other-category" className="h-11 bg-background/70" placeholder="Contoh: Usulan kegiatan atau informasi umum" required /></Field> : null}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"><Field><FieldLabel htmlFor="incident-date">Tanggal kejadian</FieldLabel><Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}><PopoverTrigger render={<Button id="incident-date" type="button" variant="outline" className="h-11 w-full justify-start bg-background/70 text-left font-normal" />}><CalendarDays className="size-4 text-muted-foreground" />{incidentDate ? new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(incidentDate) : <span className="text-muted-foreground/70">Pilih tanggal</span>}</PopoverTrigger><PopoverContent align="start"><Calendar mode="single" selected={incidentDate} onSelect={(date) => { setIncidentDate(date); setDatePickerOpen(false) }} /></PopoverContent></Popover></Field><SelectField id="incident-time" label="Waktu" placeholder="Pilih waktu" value={incidentTime} onValueChange={setIncidentTime} options={times} />{category !== "fasilitas" ? <Field><FieldLabel htmlFor="location">Lokasi kejadian</FieldLabel><Input id="location" name="location" value={location} onChange={(event) => setLocation(event.target.value)} className="h-11 bg-background/70" placeholder="Contoh: Gedung JTI, Ruang 3.4" required /></Field> : <div className="flex items-end text-sm text-muted-foreground"><div className="flex items-start gap-2 rounded-lg bg-muted/60 p-3"><MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /><span>Lokasi fasilitas dipilih dari data ruangan JTI di atas.</span></div></div>}</div>
            <Field><FieldLabel htmlFor="description">Deskripsi laporan</FieldLabel><Textarea id="description" name="description" placeholder="Jelaskan kronologi, kondisi, atau kendala secara singkat dan jelas." required /><FieldDescription>Hindari data pribadi yang tidak diperlukan dalam laporan.</FieldDescription></Field>
          </FieldGroup></div> : null}
          {category ? <div className="space-y-5 border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-sm font-semibold text-primary">2</span><h2 className="text-sm font-semibold">Lampiran dan pengiriman</h2></div><Field><FieldLabel htmlFor="attachment">Lampiran pendukung <span className="font-normal text-muted-foreground">(opsional)</span></FieldLabel><FileDropzone id="attachment" value={attachments} onChange={setAttachments} /><FieldDescription>Foto atau dokumen pendukung membantu pengelola memahami laporan Anda.</FieldDescription></Field><div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>Data laporan hanya digunakan untuk penanganan internal JTI.</span></div><div className="flex flex-col-reverse gap-2 sm:flex-row"><Button type="button" variant="outline" onClick={handleDraft} disabled={savedState === "submitted"}><Save />Simpan draft</Button><Button type="submit" disabled={!canSubmit || savedState === "submitted"}><Send />Kirim laporan<ArrowRight className="ml-0.5" /></Button></div></div></div> : <div className="rounded-lg border border-dashed border-border bg-muted/30 p-5 text-center text-sm text-muted-foreground">Pilih kategori laporan untuk mulai mengisi formulir.</div>}
          {savedState === "draft" ? <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><CheckCircle2 className="size-4 text-primary" />Draft laporan disimpan untuk development.</p> : null}{savedState === "submitted" ? <p className="flex items-center gap-2 text-sm text-muted-foreground" role="status"><CheckCircle2 className="size-4 text-primary" />Laporan siap dikirim. Integrasi backend akan membuat nomor tiket unik.</p> : null}
        </form>
      </CardContent></div></Card>
      <ReportGuidance category={category} />
    </div>
  )
}
