"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import type { DraftView, PublicAttachment } from "../application/ports"
import type { ReportPayload } from "../domain/report"
import { getReportFormCategory, payloadForFormCategory, reportFormCategoryLabels, servicesForFormCategory, type ReportFormCategory } from "../domain/report-form-category"
import { getIncidentTimeMode, parsePayload } from "../domain/report"
import { createReportSubmissionSnapshot, reportSubmissionBody, type ReportSubmissionSnapshot } from "./report-submission-state"
import { ReportSubmissionPreview } from "./report-submission-preview"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { useReportSubmissionFeedback } from "@/components/report-submission-feedback-provider"
import { formatCalendarDate, getIncidentDateTimeInWib, getTodayInWib } from "../domain/report-date"
import { getReportServicePolicy } from "../domain/service-policy"
import { ServiceReportFields } from "./service-report-fields"
import { ReportLocationField } from "./report-location-field"
import { getReportDescriptionPresentation, getReportDraftDescription, getReportServiceTitlePlaceholder } from "../domain/report-form-copy"
import { getReportLocationPresentation } from "../domain/report-location-presentation"
import { FacilityMappingFields } from "./facility-mapping-fields"
import { availableFacilities, type OperationalCatalog } from "@/features/operations/domain/operations"
import { useOperationalResource } from "@/components/reports/use-operational-data"
import {
  ArrowRight,
  Building2,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Computer,
  FileText,
  Headphones,
  ImagePlus,
  Link2,
  MapPin,
  PackageSearch,
  Save,
  ShieldCheck,
  UploadCloud,
  Wrench,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { Dialog } from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { FileDropzone } from "@/components/ui/file-dropzone"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel, FieldTitle } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "cn"
import { AttachmentLinkField } from "./attachment-link-field"
import { FilePreviewList } from "@/components/ui/file-preview-list"
import { ReportCategoryDrafts, hasDraftContent, type CategoryDraft } from "./report-category-drafts"

const categories: Array<{ value: ReportFormCategory; label: string; icon: typeof FileText; hint: string; tone: BadgeTone }> = [
  { value: "kehilangan-temuan", label: reportFormCategoryLabels["kehilangan-temuan"], icon: PackageSearch, hint: "Barang hilang atau barang yang ditemukan", tone: "info" },
  { value: "fasilitas", label: reportFormCategoryLabels.fasilitas, icon: Wrench, hint: "Objek rusak atau tidak berfungsi, bukan kebersihan area", tone: "success" },
  { value: "layanan", label: reportFormCategoryLabels.layanan, icon: Headphones, hint: "Administrasi, kebersihan, dan keamanan", tone: "violet" },
  { value: "tefa", label: reportFormCategoryLabels.tefa, icon: Computer, hint: "E-Learning, evaluasi pembelajaran, ruang baca, dan surat", tone: "info" },
  { value: "lainnya", label: reportFormCategoryLabels.lainnya, icon: FileText, hint: "Laporan umum di luar pilihan di atas", tone: "warning" },
]

function SelectField({ id, label, placeholder, value, onValueChange, options, description }: { id: string; label: string; placeholder: string; value: string; onValueChange: (value: string) => void; options: string[]; description?: string }) {
  return (
    <Field>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      {description ? <FieldDescription>{description}</FieldDescription> : null}
      <Select value={value} items={[...new Set([...options, ...(value ? [value] : [])])].map((name) => ({ value: name, label: name }))} onValueChange={(nextValue) => onValueChange(nextValue ?? "")}>
        <SelectTrigger id={id} aria-label={label} className="!h-11 w-full bg-field-surface dark:bg-field-surface"><SelectValue placeholder={placeholder} /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option} value={option}>{option}</SelectItem>)}</SelectContent>
      </Select>
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
      <Input value={value} onChange={(event) => onValueChange(event.target.value.replace(/\D/g, "").slice(0, 2))} onBlur={() => onValueChange(normalizeTimePart(value, maximum))} inputMode="numeric" maxLength={2} aria-label={label} className="h-12 w-18 rounded-lg bg-field-surface dark:bg-field-surface text-center text-lg font-semibold tabular-nums" placeholder="00" />
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
        className="h-11 bg-field-surface dark:bg-field-surface tabular-nums sm:hidden"
      />
      <FieldDescription className="sm:hidden">Gunakan pemilih waktu perangkat untuk memilih jam dan menit.</FieldDescription>
      <div className="hidden sm:block">
        <Popover open={open} onOpenChange={handleOpenChange}>
          <PopoverTrigger render={<Button id="incident-time-desktop" type="button" variant="outline" aria-label="Waktu kejadian" className="h-11 w-full justify-start bg-field-surface dark:bg-field-surface text-left font-normal" />}>
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

function CategoryCard({ value, selected, onSelect, draft, disabled, onRetry }: { value: (typeof categories)[number]; selected: boolean; onSelect: () => void; draft?: CategoryDraft; disabled: boolean; onRetry: () => void }) {
  const Icon = value.icon
  const compact = value.value === "lainnya"
  const [notice, setNotice] = useState(0)
  useEffect(() => {
    if (!draft?.notice) return
    const timeout = setTimeout(() => setNotice(draft.notice), 3000)
    return () => clearTimeout(timeout)
  }, [draft?.notice])

  const draftBadgeClass = compact ? undefined : "mt-2"
  const draftBadge = draft?.status === "saving"
    ? <Badge variant="outline" className={draftBadgeClass}>{hasDraftContent(draft) ? "Menyimpan…" : "Mengosongkan…"}</Badge>
    : draft?.status === "error"
      ? <Badge tone="warning" variant="outline" className={draftBadgeClass}>Belum tersimpan</Badge>
      : draft?.savedKey && hasDraftContent(draft)
        ? <Badge tone="info" variant="outline" className={draftBadgeClass}>Draft</Badge>
        : null
  const selectionIcon = selected ? <Check className="size-4 shrink-0 text-primary" aria-hidden="true" /> : null

  return (
    <div className={cn("min-w-0", compact && "flex flex-wrap items-center gap-x-2 gap-y-1 sm:col-span-2")}>
      {compact ? <FieldDescription>Jika belum ada kategori yang sesuai, pilih</FieldDescription> : null}
      <Tooltip open={Boolean(draft && hasDraftContent(draft) && draft.notice && draft.notice !== notice)}>
        <TooltipTrigger render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            onClick={onSelect}
            aria-pressed={selected}
            aria-description={compact ? value.hint : undefined}
            className={cn(
              "group flex h-auto whitespace-normal border text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none",
              compact ? "min-h-8 w-fit max-w-full gap-1.5 rounded-lg px-3 py-1" : "min-h-24 w-full items-start gap-3 rounded-xl p-3",
              selected ? "border-primary bg-primary/5 shadow-none" : "border-border bg-background/60 hover:border-primary/50 hover:bg-muted/40",
            )}
          />
        }>
          {compact ? (
            <>
              <Icon className="size-3.5 text-muted-foreground" aria-hidden="true" />
              <span className="min-w-0">{value.label}</span>
              {draftBadge}
              {selectionIcon}
            </>
          ) : (
            <>
              <Badge variant="outline" tone={value.tone} className="mt-0.5 size-9 rounded-lg p-0"><span><Icon className="size-4" aria-hidden="true" /></span></Badge>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2 text-sm font-semibold text-foreground">{value.label}{selectionIcon}</span>
                <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{value.hint}</span>
                {draftBadge}
              </span>
            </>
          )}
        </TooltipTrigger>
        <TooltipContent side="top" className="motion-reduce:animate-none"><CheckCircle2 className="size-3.5" aria-hidden="true" />Tersimpan sebagai draft</TooltipContent>
      </Tooltip>
      <span className="sr-only" role="status">{draft?.status === "saving" ? `Menyimpan draft ${value.label}` : draft?.status === "error" ? `${value.label}: ${draft.error}` : draft?.notice ? `${value.label}: tersimpan sebagai draft` : ""}</span>
      {draft?.status === "error" ? (
        <div className={compact ? "basis-full" : undefined}>
          <Button type="button" variant="link" size="sm" disabled={disabled} onClick={onRetry}>Coba simpan lagi</Button>
        </div>
      ) : null}
    </div>
  )
}

function ReportGuidance({ category, formCategory, service, handlerRole }: { category: string; formCategory: ReportFormCategory | ""; service: string; handlerRole?: "manajemen" | "tefa" }) {
  const selectedCategory = categories.find((item) => item.value === formCategory)
  const locationPresentation = getReportLocationPresentation(category, service)
  const locationGuidance = formCategory === "tefa" && !service ? "Pilih layanan JTI yang mengalami kendala" : !locationPresentation.visible ? "Jelaskan kendala pada deskripsi" : locationPresentation.required ? "Sebutkan lokasi yang jelas" : "Tambahkan lokasi atau kanal jika membantu"
  const guidance = category === "lainnya"
    ? [[Clock3, "Waktu pengiriman dicatat otomatis"], [ImagePlus, "Tambahkan foto bila membantu"]] as const
    : [[MapPin, locationGuidance], [Clock3, "Atur waktu khusus bila kejadian lebih awal"], [ImagePlus, "Tambahkan foto bila membantu"]] as const
  return (
    <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start">
      <Card className="rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs"><ShieldCheck className="size-5 text-primary" aria-hidden="true" /></div><div className="space-y-1"><CardTitle className="text-base">Sebelum mengirim</CardTitle><CardDescription>Lengkapi detail agar laporan lebih cepat ditangani.</CardDescription></div></CardHeader><CardContent className="space-y-4 p-5 pt-0"><div className="space-y-3 border-t border-border/60 pt-4">{guidance.map(([Icon, text]) => <div key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{text}</span></div>)}</div>{selectedCategory ? <div className="rounded-lg bg-muted/60 p-3 text-sm"><p className="font-medium text-foreground">Pengelola otomatis</p><p className="mt-1 text-muted-foreground">Laporan <span className="font-medium text-foreground">{selectedCategory.label}</span> akan diteruskan ke {category === "kehilangan-temuan" ? "Satpam" : category === "fasilitas" ? "Teknisi" : category === "layanan" ? formCategory === "tefa" || handlerRole === "tefa" ? "TEFA" : handlerRole === "manajemen" ? "Manajemen Jurusan" : "pengelola layanan terpilih" : "Manajemen Jurusan"}.</p></div> : <div className="rounded-lg bg-muted/60 p-3 text-sm text-muted-foreground">Pilih kategori untuk melihat pengelola laporan.</div>}</CardContent></div></Card>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-4 text-sm shadow-2xs"><Building2 className="mt-0.5 size-4 shrink-0 text-muted-foreground" aria-hidden="true" /><p className="leading-relaxed text-muted-foreground">Laporan yang dikirim dapat dipantau melalui menu Laporan Saya.</p></div>
    </aside>
  )
}

export function ReportForm({ initialDraft, categoryDrafts = [] }: { initialDraft?: DraftView; categoryDrafts?: DraftView[] }) {
  const [drafts] = useState(() => new ReportCategoryDrafts(categoryDrafts, initialDraft))
  useSyncExternalStore(drafts.subscribe, drafts.getVersion, drafts.getVersion)
  const activeCategory = useRef<ReportFormCategory | "">(initialDraft ? getReportFormCategory(initialDraft.payload) : "")
  const [catalogRevision, setCatalogRevision] = useState(0)
  const catalogResource = useOperationalResource<OperationalCatalog>(`/api/pelapor/catalog?revision=${catalogRevision}`)
  const catalog = catalogResource.data
  const { notify } = useActivityNotifications()
  const { submissionSucceeded } = useReportSubmissionFeedback()
  const formRef = useRef<HTMLFormElement>(null)
  const submitButtonRef = useRef<HTMLButtonElement>(null)
  const previewUrls = useRef<string[]>([])
  const busy = useRef(false)
  const [draftId, setDraftId] = useState(() => initialDraft?.id ?? crypto.randomUUID())
  const [sourceDraft, setSourceDraft] = useState(initialDraft)
  const [revision, setRevision] = useState(initialDraft?.revision ?? 0)
  const [retained, setRetained] = useState<PublicAttachment[]>(initialDraft?.attachments ?? [])
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [preview, setPreview] = useState<(ReportSubmissionSnapshot & { uploadUrls: string[] }) | null>(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [category, setCategory] = useState(initialDraft?.payload.category ?? "")
  const [formCategory, setFormCategory] = useState<ReportFormCategory | "">(initialDraft ? getReportFormCategory(initialDraft.payload) : "")
  const services = servicesForFormCategory(catalog?.services ?? [], formCategory).map(row => row.name)
  const [reportType, setReportType] = useState(initialDraft?.payload.reportType ?? "")
  const [location, setLocation] = useState(initialDraft?.payload.location ?? "")
  const [otherCategory, setOtherCategory] = useState(initialDraft?.payload.otherCategory ?? "")
  const [facilityAreaId, setFacilityAreaId] = useState(initialDraft?.payload.facilityAreaId ?? "")
  const [otherLocation, setOtherLocation] = useState(initialDraft?.payload.otherLocation ?? "")
  const [selectedFacilities, setSelectedFacilities] = useState<string[]>(initialDraft?.payload.facilities ?? [])
  const [otherFacility, setOtherFacility] = useState(initialDraft?.payload.otherFacility ?? "")
  const [service, setService] = useState(initialDraft?.payload.service ?? "")
  const [program, setProgram] = useState(() => getReportServicePolicy(initialDraft?.payload.service ?? "").requiresProgram ? initialDraft?.payload.program ?? "" : "")
  const [attachments, setAttachments] = useState<File[]>([])
  const [useCustomTime, setUseCustomTime] = useState(() => Boolean(initialDraft && initialDraft.payload.category !== "lainnya" && getIncidentTimeMode(initialDraft.payload) === "custom"))
  const [incidentDate, setIncidentDate] = useState<Date | undefined>(() => initialDraft?.payload.incidentDate ? new Date(initialDraft.payload.incidentDate + "T00:00:00") : undefined)
  const [incidentTime, setIncidentTime] = useState(initialDraft?.payload.incidentTime ?? "")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const currentDraft = formCategory ? drafts.get(formCategory) : undefined
  const pending = submitting || currentDraft?.status === "saving"
  const today = new Date(`${getTodayInWib()}T00:00:00`)
  const incidentDateError = useCustomTime && incidentDate && formatCalendarDate(incidentDate) > getTodayInWib() ? "Tanggal kejadian tidak boleh melebihi hari ini (WIB)." : ""
  // Blob URLs belong to this form, never to a persisted report or API payload.
  useEffect(() => () => { for (const url of previewUrls.current) URL.revokeObjectURL(url) }, [])
  function releasePreview() { for (const url of previewUrls.current) URL.revokeObjectURL(url); previewUrls.current = [] }

  function showDraft(draft: CategoryDraft) {
    const payload = draft.payload
    activeCategory.current = getReportFormCategory(payload)
    setFormCategory(getReportFormCategory(payload))
    setCategory(payload.category); setDraftId(draft.id); setRevision(draft.revision)
    setSourceDraft({ id: draft.id, revision: draft.revision, payload, attachments: draft.retained, updatedAt: "" })
    setReportType(payload.reportType); setLocation(payload.location); setOtherCategory(payload.otherCategory); setFacilityAreaId(payload.facilityAreaId ?? ""); setOtherLocation(payload.otherLocation)
    setSelectedFacilities([...payload.facilities]); setOtherFacility(payload.otherFacility); setService(payload.service); setProgram(payload.program)
    setAttachments([...draft.files]); setRetained([...draft.retained]); setUseCustomTime(payload.category !== "lainnya" && getIncidentTimeMode(payload) === "custom")
    setIncidentDate(payload.incidentDate ? new Date(`${payload.incidentDate}T00:00:00`) : undefined); setIncidentTime(payload.incidentTime)
    setDatePickerOpen(false); setError(draft.error)
    const url = new URL(window.location.href)
    if (draft.savedKey) url.searchParams.set("draft", draft.id); else url.searchParams.delete("draft")
    window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
  }
  function captureDraft() {
    if (!category || !formRef.current) return
    return drafts.capture(formCategory as ReportFormCategory, currentPayload(), retained, attachments)
  }
  async function persistDraft(target: ReportFormCategory) {
    const result = await drafts.save(target, async (draft) => {
      const snapshot = { payload: parsePayload(draft.payload, false), retained: draft.retained, files: draft.files }
      const response = await fetch("/api/pelapor/drafts", { method: "POST", body: reportSubmissionBody(snapshot, draft.id, draft.revision) })
      const body = await response.json().catch(() => null)
      if (response.ok && typeof body?.clearedDraftId === "string") return { clearedDraftId: body.clearedDraftId }
      if (!response.ok || !body?.draft || !Array.isArray(body.draft.attachments)) throw new Error(body?.error || "Draft belum tersimpan. Isian dan lampiran tetap tersedia; coba kembali.")
      return body.draft as DraftView
    })
    // The user can already be in another category. Never replace that form.
    if (activeCategory.current === target) showDraft(result)
  }
  function changeCategory(next: ReportFormCategory) {
    if (next === formCategory || busy.current || preview) return
    const previous = captureDraft()
    showDraft(drafts.ensure(next))
    if (previous) void persistDraft(getReportFormCategory(previous.payload))
  }
  function currentPayload(): ReportPayload {
    const fields = new FormData(formRef.current!)
    const text = (name: string) => String(fields.get(name) ?? "")
    const date = useCustomTime && incidentDate ? formatCalendarDate(incidentDate) : ""
    return payloadForFormCategory({ category: category as ReportPayload["category"], title: text("title"), description: text("description"), incidentDate: date, incidentTime: useCustomTime ? incidentTime : "", incidentTimeMode: useCustomTime ? "custom" : "automatic", location: getReportLocationPresentation(category, service).visible ? location : "", facilityAreaId, otherLocation, reportType, itemName: text("item-name"), itemDetails: "", facilities: selectedFacilities, otherFacility, service, program: getReportServicePolicy(service).requiresProgram ? program : "", otherCategory }, formCategory as ReportFormCategory)
  }
  async function save(submit: boolean, confirmed?: ReportSubmissionSnapshot) {
    // Only the preview's explicit confirmation can initiate a report submission.
    if (!formRef.current || busy.current || (submit && (!confirmed || confirmed !== preview))) return
    if (!submit) { captureDraft(); await persistDraft(formCategory as ReportFormCategory); return }
    busy.current = true; setSubmitting(true); setError("")
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
        const sourceRect = submitButtonRef.current?.getBoundingClientRect()
        const source = sourceRect && sourceRect.width > 0 ? sourceRect : undefined
        // Reset only after confirmed success. Failed/ambiguous requests retain the same id for safe retries.
        drafts.remove(formCategory as ReportFormCategory)
        showDraft(drafts.ensure(formCategory as ReportFormCategory)); setPreviewOpen(false)
        // A submitted draft cannot be resumed; keep refresh from requesting its old URL.
        const url = new URL(window.location.href)
        url.searchParams.delete("draft")
        window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`)
        notify({ title: "Laporan berhasil dikirim", description: "Laporan telah diterima. Pantau perkembangannya di Laporan Saya.", tone: "success" })
        submissionSucceeded(source)
      }
    } catch (error) {
      const message = error instanceof TypeError ? "Koneksi bermasalah. Silakan coba lagi; sistem mencegah laporan ganda." : error instanceof Error ? error.message : "Koneksi bermasalah. Silakan coba lagi."
      setError(message)
      if (submit && (category === "fasilitas" || category === "layanan")) setCatalogRevision((value) => value + 1)
      notify({ title: submit ? "Pengiriman belum berhasil" : "Draft belum tersimpan", description: message, tone: "warning" })
    }
    finally { busy.current = false; setSubmitting(false) }
  }
  function handleDraft() { void save(false) }
  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current || preview || !event.currentTarget.reportValidity()) return
    try {
      if (category === "fasilitas" && !validFacilityCatalog || category === "layanan" && (!catalog || !services.includes(service))) throw new Error("Periksa pilihan lokasi, fasilitas, atau layanan yang tersedia sebelum mengirim.")
      const snapshot = createReportSubmissionSnapshot(currentPayload(), retained, attachments)
      for (const file of snapshot.files) previewUrls.current.push(URL.createObjectURL(file))
      setError(""); setPreview({ ...snapshot, uploadUrls: [...previewUrls.current] }); setPreviewOpen(true)
    } catch (error) {
      releasePreview()
      const message = error instanceof Error ? error.message : "Periksa kembali isian laporan Anda."
      setError(message)
      notify({ title: "Periksa isian laporan", description: message, tone: "warning" })
    }
  }
  const validFacilityCatalog = Boolean(catalog && (location === "Lainnya" || catalog.locations.some((row) => row.name === location)) && selectedFacilities.every((name) => name === "Lainnya" || availableFacilities(catalog, location).some((row) => row.name === name)))
  const hasCompleteFacilityDetails = Boolean(validFacilityCatalog && location && selectedFacilities.length && (location !== "Lainnya" || otherLocation.trim()) && (!selectedFacilities.includes("Lainnya") || otherFacility.trim()))
  const canSubmit = Boolean(category && (!useCustomTime || incidentDate && incidentTime && !incidentDateError)) && (category !== "kehilangan-temuan" || Boolean(reportType)) && (category !== "fasilitas" || hasCompleteFacilityDetails) && (category !== "layanan" || Boolean(catalog && services.includes(service) && (!getReportServicePolicy(service).requiresProgram || program)))
  const titlePlaceholder = category === "kehilangan-temuan"
    ? reportType === "Kehilangan"
      ? "Contoh: Dompet hilang di Ruang 3.4"
      : reportType === "Temuan"
        ? "Contoh: Kartu mahasiswa ditemukan di Lobi Gedung JTI"
        : "Contoh: Barang hilang atau temuan di Gedung JTI"
    : category === "fasilitas"
      ? "Contoh: Proyektor di Lab Multimedia tidak menyala"
      : category === "layanan"
        ? getReportServiceTitlePlaceholder(service)
        : "Contoh: Usulan perbaikan papan informasi digital"

  function addLinkedFile(file: File) {
    setAttachments((files) => files.some((item) => item.name === file.name && item.size === file.size) ? files : [...files, file])
  }
  const remainingAttachments = Math.max(0, 4 - retained.length - attachments.length)
  const descriptionPresentation = getReportDescriptionPresentation(category, service)

  return (
    <div className="space-y-6">
      <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-(--report-form-desktop-columns)">
      <Card className="min-w-0 gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><FileText className="size-4 text-primary" aria-hidden="true" />Formulir laporan</div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-5 md:p-6">
        <form ref={formRef} tabIndex={-1} className="space-y-7" onSubmit={handleSubmit} aria-busy={pending}>
          <Field><FieldLabel>Kategori laporan</FieldLabel><FieldDescription>Pilih kategori untuk mengisi laporan. Isian disimpan sebagai draft saat Anda berganti kategori.</FieldDescription><TooltipProvider><div className="grid gap-3 sm:grid-cols-2">{categories.map((item) => <CategoryCard key={item.value} value={item} selected={formCategory === item.value} disabled={submitting || Boolean(preview)} draft={drafts.get(item.value)} onSelect={() => changeCategory(item.value)} onRetry={() => { if (formCategory === item.value) captureDraft(); void persistDraft(item.value) }} />)}</div></TooltipProvider></Field>
          <fieldset disabled={pending || previewOpen} className="space-y-7">
            {category ? <div key={draftId} className="space-y-7">
              <div className="space-y-5 border-t border-border/60 pt-6"><FieldGroup>
                {category === "kehilangan-temuan" ? <SelectField id="report-type" label="Jenis laporan" placeholder="Pilih jenis laporan" value={reportType} onValueChange={setReportType} options={["Kehilangan", "Temuan"]} /> : null}
                <Field><FieldLabel htmlFor="title" className="font-semibold text-foreground">Judul laporan</FieldLabel><Input id="title" name="title" defaultValue={sourceDraft?.payload.title} className="h-11 bg-field-surface dark:bg-field-surface" placeholder={titlePlaceholder} required /></Field>
                {category === "kehilangan-temuan" ? <><Field><FieldLabel htmlFor="item-name">Nama barang</FieldLabel><Input id="item-name" name="item-name" defaultValue={sourceDraft?.payload.itemName} className="h-11 bg-field-surface dark:bg-field-surface" placeholder="Contoh: Dompet kulit warna hitam" required /></Field></> : null}
                {category === "fasilitas" && catalog ? <FacilityMappingFields key={draftId} disabled={pending || previewOpen} catalog={catalog} selectedAreaId={facilityAreaId} onAreaChange={setFacilityAreaId} location={location} onLocationChange={setLocation} otherLocation={otherLocation} onOtherLocationChange={setOtherLocation} facilities={selectedFacilities} onFacilitiesChange={setSelectedFacilities} otherFacility={otherFacility} onOtherFacilityChange={setOtherFacility} /> : null}
                {category === "fasilitas" || category === "layanan" ? catalogResource.loading ? <p role="status" className="text-sm text-muted-foreground">Memuat katalog operasional...</p> : catalogResource.error ? <div className="space-y-2"><FieldError>{catalogResource.error}</FieldError><Button type="button" variant="outline" onClick={() => setCatalogRevision((value) => value + 1)}>Coba lagi</Button></div> : null : null}
                {category === "layanan" ? <ServiceReportFields audience={formCategory === "tefa" ? "tefa" : "operasional"} services={services} service={service} program={program} disabled={pending || previewOpen} onServiceChange={(next) => { if (getReportServicePolicy(next).locationMode === "hidden") setLocation(""); setService(next) }} onProgramChange={setProgram} /> : null}
                {category === "layanan" && catalog && service && !services.includes(service) ? <FieldError>Layanan draft tidak tersedia pada kategori ini. Pilih layanan aktif dari daftar.</FieldError> : null}
                {category === "layanan" && catalog && !services.length ? <FieldDescription>Belum ada layanan aktif untuk kategori ini. Hubungi pengelola katalog.</FieldDescription> : null}
                {category === "lainnya" ? <Field><FieldLabel htmlFor="other-category">Kategori umum <span className="font-normal text-muted-foreground">(opsional)</span></FieldLabel><Select value={otherCategory || "__none"} items={[{ value: "__none", label: "Tidak dipilih" }, ...[...new Set([...categories.filter((item) => item.value !== "lainnya").map((item) => item.label), ...(otherCategory ? [otherCategory] : [])])].map((label) => ({ value: label, label }))]} onValueChange={(value) => setOtherCategory(value === "__none" || !value ? "" : value)}><SelectTrigger id="other-category" className="!h-11 w-full bg-field-surface dark:bg-field-surface"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="__none">Tidak dipilih</SelectItem>{[...new Set([...categories.filter((item) => item.value !== "lainnya").map((item) => item.label), ...(otherCategory ? [otherCategory] : [])])].map((label) => <SelectItem key={label} value={label}>{label}</SelectItem>)}</SelectContent></Select></Field> : null}
                {category !== "fasilitas" && (formCategory !== "tefa" || Boolean(service)) ? <ReportLocationField category={category} service={service} value={location} onValueChange={setLocation} disabled={pending || previewOpen} /> : null}
                {category !== "lainnya" ? <Field>
                  <div className="flex items-center gap-3">
                    <FieldLabel htmlFor="custom-incident-time">Gunakan tanggal &amp; waktu tertentu</FieldLabel>
                    <Switch id="custom-incident-time" checked={useCustomTime} disabled={pending || previewOpen} aria-describedby="incident-time-mode-description" onCheckedChange={(checked) => {
                      if (checked) {
                        const current = getIncidentDateTimeInWib()
                        if (!incidentDate) setIncidentDate(new Date(current.incidentDate + "T00:00:00"))
                        if (!incidentTime) setIncidentTime(current.incidentTime)
                      } else setDatePickerOpen(false)
                      setUseCustomTime(checked)
                    }} />
                  </div>
                  <FieldDescription id="incident-time-mode-description">Aktifkan jika kejadian berlangsung pada waktu lain.</FieldDescription>
                </Field> : null}
                {useCustomTime ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <Field data-invalid={Boolean(incidentDateError)}>
                      <FieldLabel htmlFor="incident-date">Tanggal kejadian</FieldLabel>
                      <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                        <PopoverTrigger render={<Button id="incident-date" type="button" variant="outline" aria-label="Tanggal kejadian" aria-invalid={Boolean(incidentDateError)} aria-describedby={incidentDateError ? "incident-date-description incident-date-error" : "incident-date-description"} className="h-11 w-full justify-start bg-field-surface dark:bg-field-surface text-left font-normal" />}>
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
                  </div>
                ) : null}
                <Field>
                  <FieldLabel htmlFor="description">{descriptionPresentation.label}</FieldLabel>
                  <Textarea
                    id="description"
                    className="bg-field-surface dark:bg-field-surface"
                    name="description"
                    defaultValue={getReportDraftDescription(sourceDraft?.payload)}
                    placeholder={descriptionPresentation.placeholder}
                    required
                  />
                  <FieldDescription>
                    {category === "kehilangan-temuan" ? "Sertakan ciri barang dalam deskripsi. " : ""}
                    Hindari data pribadi yang tidak diperlukan dalam laporan.
                  </FieldDescription>
                </Field>
              </FieldGroup>
            </div>
              <div className="space-y-5 border-t border-border/60 pt-6">
                <div className="flex items-center gap-2"><span className="flex size-7 items-center justify-center rounded-lg bg-primary/10 text-primary"><ImagePlus className="size-4" aria-hidden="true" /></span><h2 className="text-sm font-semibold">Lampiran</h2></div>
                <Field>
                  <FieldTitle>Lampiran pendukung <span className="font-normal text-muted-foreground">(opsional)</span></FieldTitle>
                  {retained.length ? <div className="space-y-2">{retained.map((file) => <div key={file.id} className="flex items-center justify-between gap-3 rounded-lg border p-3"><a href={`/api/pelapor/attachments/${file.id}`} className="truncate text-sm text-primary">{file.name}</a><Button type="button" variant="ghost" size="sm" onClick={() => setRetained((items) => items.filter((item) => item.id !== file.id))}>Hapus</Button></div>)}</div> : null}
                  <Tabs defaultValue="upload">
                    <TabsList aria-label="Cara menambahkan lampiran">
                      <TabsTrigger value="upload"><UploadCloud className="size-4" aria-hidden="true" />Unggah file</TabsTrigger>
                      <TabsTrigger value="link"><Link2 className="size-4" aria-hidden="true" />Tautan foto</TabsTrigger>
                    </TabsList>
                    <TabsContent value="upload"><FileDropzone id="attachment" value={attachments} onChange={setAttachments} maxFiles={Math.max(0, 4 - retained.length)} /></TabsContent>
                    <TabsContent value="link" className="space-y-3">
                      <AttachmentLinkField id="attachment-link" disabled={pending} remaining={remainingAttachments} onAdd={addLinkedFile} />
                      <FilePreviewList title="Sudah dilampirkan" files={attachments} onRemove={(file) => setAttachments((items) => items.filter((item) => item !== file))} />
                    </TabsContent>
                  </Tabs>
                </Field>
                <div className="flex flex-col gap-3 border-t border-border/60 pt-5 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{category === "kehilangan-temuan" && reportType === "Temuan" ? "Nama barang, lokasi, deskripsi, dan foto temuan dapat dilihat pengguna Pelapor." : "Data laporan hanya digunakan untuk penanganan internal JTI."}</span></div>
                  <div className="flex flex-col-reverse gap-2 sm:flex-row">
                    <Button type="button" variant="outline" onClick={handleDraft}><Save />Simpan draft</Button>
                    <Button ref={submitButtonRef} type="submit" disabled={!canSubmit}>Periksa laporan<ArrowRight className="ml-0.5" /></Button>
                  </div>
                </div>
              </div>
            </div> : <p className="rounded-xl border border-dashed border-border bg-muted/30 p-5 text-sm text-muted-foreground">Pilih kategori laporan untuk mulai mengisi formulir.</p>}
          </fieldset>
          {pending ? <p className="text-sm text-muted-foreground" role="status">{submitting ? "Mengirim laporan…" : "Menyimpan draft…"}</p> : null}
          {error && !previewOpen ? <FieldError>{error}</FieldError> : null}
        </form>
      </CardContent></div></Card>
      <ReportGuidance category={category} formCategory={formCategory} service={service} handlerRole={catalog?.services.find((row) => row.name === service)?.handlerRole} />
      </div>
      <Dialog open={previewOpen} onOpenChange={(open, details) => { if (busy.current) { details.cancel(); return }; setPreviewOpen(open) }} onOpenChangeComplete={(open) => { if (!open) { releasePreview(); setPreview(null) } }} disablePointerDismissal={pending}>
        {preview ? <ReportSubmissionPreview snapshot={preview} uploadUrls={preview.uploadUrls} pending={pending} error={error} finalFocus={() => submitButtonRef.current ?? formRef.current} onClose={() => { if (!busy.current) setPreviewOpen(false) }} onConfirm={() => { void save(true, preview) }} /> : null}
      </Dialog>
    </div>
  )
}
