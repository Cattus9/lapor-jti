"use client"

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { ArrowLeft, ArrowRight, Check, CheckCircle2, Clock3, FileText, ImagePlus, Inbox, ListChecks, MapPin, PackageCheck, PackagePlus, PackageSearch, ShieldCheck, UserRound } from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { SectionCard } from "@/components/ui/section-card"
import { Skeleton } from "@/components/ui/skeleton"
import type { CurrentUser } from "@/lib/auth/current-user"
import { registerBeforeSignOut } from "@/lib/pending-work"
import { cn } from "cn"
import { emptySatpamDraft, hasSatpamDraftContent, parseSatpamDraft, type SatpamDraftFields, type SatpamDraftKind, type SatpamDraftView } from "../domain/satpam-draft"
import { FoundItemForm, type FoundFormData } from "./found-item-form"
import { useItemPhoto } from "./item-photo-field"
import { LossItemForm, type LossFormData } from "./loss-item-form"
import { SatpamReportDrafts, writeSatpamDraft } from "./satpam-report-drafts"
import { pelaporanSteps, SatpamPelaporanStepper, type PelaporanStepId } from "./satpam-pelaporan-stepper"

const choices = [
  { kind: "kehilangan", title: "Catat kehilangan", description: "Pemilik melaporkan barang yang hilang di pos Satpam.", icon: PackageSearch },
  { kind: "temuan", title: "Terima barang di pos", description: "Barang temuan sudah diserahkan dan akan dicatat di Inventaris.", icon: PackagePlus },
] as const
type Preview = { kind: "kehilangan"; data: LossFormData } | { kind: "temuan"; data: FoundFormData }
type Success = { kind: SatpamDraftKind; title: string; cleanupError?: string }

function lossFields(data: LossFormData): SatpamDraftFields {
  return { ...emptySatpamDraft("kehilangan"), ownerName: data.ownerName ?? "", ownerContact: data.ownerContact ?? "", title: data.title, itemName: data.itemName, location: data.location, useCustomTime: data.useCustomTime, incidentDate: data.incidentDate, incidentTime: data.incidentTime, description: data.description }
}
function foundFields(data: FoundFormData): SatpamDraftFields {
  return { ...emptySatpamDraft("temuan"), itemName: data.itemName, description: data.description, foundLocation: data.foundLocation, founderName: data.founderName, sourceFoundTicket: data.sourceFoundTicket ?? "" }
}

async function loadDrafts(signal: AbortSignal) {
  const response = await fetch("/api/satpam/drafts", { cache: "no-store", signal })
  const body = await response.json().catch(() => null)
  if (!response.ok || !Array.isArray(body?.drafts)) throw new Error(body?.error || "Draft belum berhasil dimuat.")
  const restored = await Promise.all((body.drafts as SatpamDraftView[]).map(async (draft) => {
    const fields = parseSatpamDraft(draft.fields)
    if (typeof draft.id !== "string" || !Number.isSafeInteger(draft.revision) || draft.revision < 1) throw new Error("Data draft tidak valid.")
    if (!draft.photo) return { draft: { ...draft, fields }, file: null }
    const photo = await fetch(`/api/satpam/drafts/${encodeURIComponent(draft.id)}/photo/${encodeURIComponent(draft.photo.id)}`, { cache: "no-store", signal })
    if (!photo.ok) throw new Error("Foto draft belum berhasil dimuat. Coba lagi agar isian tetap utuh.")
    const blob = await photo.blob()
    if (blob.size !== draft.photo.size || blob.type !== draft.photo.mimeType) throw new Error("Foto draft belum berhasil dimuat dengan utuh. Coba lagi.")
    return { draft: { ...draft, fields }, file: new File([blob], draft.photo.name, { type: draft.photo.mimeType }) }
  }))
  return new SatpamReportDrafts(restored)
}

export function SatpamPelaporanWorkspace({ user }: { user: CurrentUser }) {
  const [store, setStore] = useState<SatpamReportDrafts | null>(null)
  const [loadError, setLoadError] = useState("")
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    loadDrafts(controller.signal).then((drafts) => { if (!controller.signal.aborted) { setStore(drafts); setLoadError("") } }).catch((error: unknown) => {
      if (!controller.signal.aborted) setLoadError(error instanceof Error ? error.message : "Draft belum berhasil dimuat.")
    })
    return () => controller.abort()
  }, [attempt])
  return <DashboardLayout role="satpam"><ContentShell>
    <PageHeader title="Pelaporan Pos Satpam" description={`Catat kehilangan atau barang yang diterima di pos, ${user.name}.`} />
    {store ? <SatpamReportingForm store={store} /> : loadError ? <SectionCard title="Formulir pencatatan" icon={FileText}><div className="space-y-3"><FieldError>{loadError}</FieldError><Button variant="outline" onClick={() => { setLoadError(""); setAttempt((value) => value + 1) }}>Coba lagi</Button></div></SectionCard> : <SectionCard title="Formulir pencatatan" icon={FileText}><div aria-label="Memuat draft" role="status" className="space-y-3"><Skeleton className="h-20 w-full" /><Skeleton className="h-32 w-full" /></div></SectionCard>}
  </ContentShell></DashboardLayout>
}

function SatpamReportingForm({ store }: { store: SatpamReportDrafts }) {
  const version = useSyncExternalStore(store.subscribe, store.getVersion, store.getVersion)
  const router = useRouter()
  const [kind, setKind] = useState<SatpamDraftKind>("kehilangan")
  const [step, setStep] = useState<PelaporanStepId>("type")
  const [preview, setPreview] = useState<Preview | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState<Success | null>(null)
  const [navigationError, setNavigationError] = useState("")
  const [navigationPending, setNavigationPending] = useState(false)
  const navigating = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const previousStep = useRef<PelaporanStepId>("type")
  const captureLoss = useCallback((data: LossFormData) => store.capture("kehilangan", lossFields(data), data.photoFile), [store])
  const captureFound = useCallback((data: FoundFormData) => store.capture("temuan", foundFields(data), data.photoFile), [store])

  useEffect(() => {
    if (previousStep.current !== step) headingRef.current?.focus()
    previousStep.current = step
  }, [step])

  useEffect(() => {
    if (preview || submitting || success) return
    const entry = store.get(kind)
    if (!store.isDirty(kind) || entry.status === "error") return
    const timer = setTimeout(() => { void store.save(kind, writeSatpamDraft).catch(() => {}) }, 900)
    return () => clearTimeout(timer)
  }, [store, kind, preview, submitting, success, version])

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (choices.some(({ kind: value }) => store.isDirty(value) || store.get(value).status === "saving")) { event.preventDefault(); event.returnValue = "" }
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [store])

  useEffect(() => registerBeforeSignOut(async () => {
    if (submitting) throw new Error("Pencatatan masih diproses.")
    if (!choices.some(({ kind: value }) => store.isDirty(value) || store.get(value).status === "saving")) return
    setNavigationPending(true); setNavigationError("")
    try { await Promise.all(choices.map(({ kind: value }) => store.save(value, writeSatpamDraft))) }
    catch (cause) { setNavigationError("Draft belum tersimpan. Periksa koneksi sebelum keluar."); throw cause }
    finally { setNavigationPending(false) }
  }), [store, submitting])

  useEffect(() => {
    const beforeNavigation = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || !(event.target instanceof Element)) return
      const link = event.target.closest("a[href]") as HTMLAnchorElement | null
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return
      const destination = new URL(link.href, window.location.href)
      if (destination.origin !== window.location.origin || `${destination.pathname}${destination.search}` === `${window.location.pathname}${window.location.search}`) return
      if (!choices.some(({ kind: value }) => store.isDirty(value) || store.get(value).status === "saving")) return
      event.preventDefault(); event.stopPropagation()
      if (navigating.current) return
      navigating.current = true; setNavigationPending(true); setNavigationError("")
      void Promise.all(choices.map(({ kind: value }) => store.save(value, writeSatpamDraft))).then(() => {
        router.push(`${destination.pathname}${destination.search}${destination.hash}`)
      }).catch(() => { setNavigationError("Draft belum tersimpan. Periksa koneksi, lalu coba lagi sebelum meninggalkan halaman."); setNavigationPending(false) }).finally(() => { navigating.current = false })
    }
    document.addEventListener("click", beforeNavigation, true)
    return () => {
      document.removeEventListener("click", beforeNavigation, true)
      for (const { kind: value } of choices) if (store.isDirty(value) || store.get(value).status === "saving") void store.save(value, writeSatpamDraft).catch(() => {})
    }
  }, [router, store])

  function choose(next: SatpamDraftKind) {
    if (kind === next || submitting || navigationPending) return
    void store.save(kind, writeSatpamDraft).catch(() => {})
    setKind(next); setError("")
  }
  function goBack(next: "type" | "details") {
    if (submitting || navigationPending) return
    void store.save(kind, writeSatpamDraft).catch(() => {})
    setPreview(null); setError(""); setStep(next)
  }
  function beginPreview(value: Preview) {
    if (value.kind === "kehilangan") captureLoss(value.data); else captureFound(value.data)
    void store.save(value.kind, writeSatpamDraft).catch(() => {})
    setError(""); setPreview(value); setStep("review")
  }
  async function confirm() {
    if (!preview || submitting) return
    setSubmitting(true); setError("")
    try {
      await store.save(preview.kind, writeSatpamDraft)
      const draft = store.get(preview.kind)
      const form = new FormData()
      form.set("submissionKey", draft.id)
      let endpoint: string
      if (preview.kind === "kehilangan") {
        const data = preview.data
        endpoint = "/api/satpam/loss-reports"
        form.set("draftRevision", String(draft.revision))
        form.set("ownerName", data.ownerName ?? ""); form.set("ownerContact", data.ownerContact ?? "")
        form.set("title", data.title); form.set("itemName", data.itemName); form.set("location", data.location)
        form.set("incidentDate", data.incidentDate); form.set("incidentTime", data.incidentTime)
        form.set("characteristics", data.description.slice(0, 2000)); form.set("description", data.description)
      } else {
        const data = preview.data
        endpoint = "/api/satpam/inventory"
        form.set("itemName", data.itemName); form.set("description", data.description)
        if (data.sourceFoundTicket) form.set("sourceFoundTicket", data.sourceFoundTicket)
        form.set("foundLocation", data.foundLocation); form.set("founderName", data.founderName)
        if (data.photoFile) form.set("photo", data.photoFile)
      }
      const response = await fetch(endpoint, { method: "POST", body: form })
      const result = await response.json().catch(() => null)
      if (!response.ok || typeof result?.id !== "string") throw new Error(result?.error || "Hasil penyimpanan belum terkonfirmasi. Coba lagi dengan data yang sama.")
      let cleanupError = ""
      if (preview.kind === "temuan") {
        store.capture("temuan", emptySatpamDraft("temuan"), null)
        try { await store.save("temuan", writeSatpamDraft) } catch { cleanupError = "Barang sudah tersimpan, tetapi draft belum berhasil dibersihkan. Coba bersihkan kembali sebelum membuat pencatatan baru." }
      } else store.reset("kehilangan")
      setPreview(null); setSuccess({ kind: preview.kind, title: preview.kind === "kehilangan" ? preview.data.title : preview.data.itemName, cleanupError })
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Penyimpanan belum terkonfirmasi. Coba lagi dengan data yang sama.") }
    finally { setSubmitting(false) }
  }
  async function retryCleanup() {
    setSubmitting(true)
    try { await store.save("temuan", writeSatpamDraft); setSuccess((value) => value ? { ...value, cleanupError: "" } : null) }
    catch { /* Keep the confirmed success and offer another attempt. */ }
    finally { setSubmitting(false) }
  }
  if (success) return <SectionCard title="Pencatatan berhasil" icon={CheckCircle2}><div className="flex flex-col items-center gap-4 py-8 text-center"><span className="flex size-12 items-center justify-center rounded-xl border border-primary/20 bg-primary/10 text-primary"><CheckCircle2 className="size-6" aria-hidden="true" /></span><div><h2 className="text-base font-semibold">{success.title}</h2><p className="mt-1 text-sm text-muted-foreground">{success.kind === "kehilangan" ? "Laporan tersimpan di Kehilangan & Temuan." : "Barang tersimpan di Inventaris Pos Satpam."}</p></div>{navigationPending ? <p role="status" className="text-sm text-muted-foreground">Menyimpan draft sebelum berpindah halaman…</p> : null}{navigationError ? <FieldError>{navigationError}</FieldError> : null}{success.cleanupError ? <div className="space-y-2"><FieldError>{success.cleanupError}</FieldError><Button variant="outline" size="sm" disabled={submitting} onClick={() => void retryCleanup()}>Coba bersihkan draft</Button></div> : null}<div className="flex flex-wrap justify-center gap-2"><Button variant="outline" disabled={Boolean(success.cleanupError)} onClick={() => { setSuccess(null); setKind("kehilangan"); setStep("type") }}>Buat pencatatan baru</Button><Button nativeButton={false} render={<Link href={success.kind === "kehilangan" ? "/satpam/kehilangan-temuan" : "/satpam/inventaris"} />}>{success.kind === "kehilangan" ? <Inbox /> : <PackageCheck />}{success.kind === "kehilangan" ? "Buka laporan" : "Buka Inventaris"}<ArrowRight /></Button></div></div></SectionCard>

  const active = store.get(kind)
  const stepIndex = pelaporanSteps.findIndex((item) => item.id === step)
  const draftStatus = active.status === "saving" ? "Menyimpan draft…" : active.status === "error" ? "Draft belum tersimpan" : store.isDirty(kind) ? "Perubahan belum tersimpan" : active.revision > 0 ? "Draft tersimpan" : ""

  return <div className="space-y-6">
    <SatpamPelaporanStepper current={stepIndex} onStepClick={submitting || navigationPending ? undefined : (index) => goBack(index === 0 ? "type" : "details")} />
    {navigationPending ? <p role="status" className="text-sm text-muted-foreground">Menyimpan draft sebelum berpindah halaman…</p> : null}
    {navigationError ? <FieldError>{navigationError}</FieldError> : null}

    {step === "type" ? <SectionCard title="Jenis pelaporan" icon={ListChecks} contentClassName="space-y-5">
      <div className="space-y-2">
        <h3 ref={headingRef} tabIndex={-1} id="satpam-type-title" className="text-sm font-medium outline-none">Pilih pencatatan</h3>
        <FieldDescription id="satpam-draft-guide">Isian tiap pilihan disimpan sebagai draft dan dapat dilanjutkan kembali.</FieldDescription>
      </div>
      <fieldset aria-labelledby="satpam-type-title" aria-describedby="satpam-draft-guide" className="grid gap-3 sm:grid-cols-2">
        {choices.map(({ kind: value, title, description, icon: Icon }) => {
          const draft = store.get(value), hasContent = hasSatpamDraftContent(draft.fields, Boolean(draft.file)), dirty = store.isDirty(value)
          return <Button key={value} type="button" variant="outline" disabled={navigationPending} aria-pressed={kind === value} onClick={() => choose(value)} className={cn("h-auto min-w-0 w-full flex-col items-stretch gap-3 rounded-xl p-4 text-left whitespace-normal shadow-none transition-colors motion-reduce:transition-none", kind === value ? "border-primary bg-primary/5 hover:bg-primary/5" : "border-border bg-background/60 hover:border-primary/50 hover:bg-muted/40")}><span className="flex items-center justify-between gap-2"><Badge variant="outline" tone={value === "kehilangan" ? "warning" : "info"} className="size-9 rounded-lg p-0"><span><Icon className="size-4" aria-hidden="true" /></span></Badge><span className="flex items-center gap-2">{hasContent ? <Badge variant="outline" tone={draft.status === "error" ? "destructive" : "primary"}>{draft.status === "saving" ? "Menyimpan…" : draft.status === "error" || dirty ? "Belum tersimpan" : "Draft"}</Badge> : null}{kind === value ? <Check className="size-4 text-primary" aria-hidden="true" /> : null}</span></span><span><span className="block text-sm font-semibold text-foreground">{title}</span><span className="mt-1 block text-xs font-normal leading-relaxed text-muted-foreground">{description}</span></span></Button>
        })}
      </fieldset>
      <div className="flex justify-end border-t border-border/60 pt-4"><Button type="button" disabled={navigationPending} onClick={() => setStep("details")}>Lanjut isi informasi <ArrowRight aria-hidden="true" /></Button></div>
    </SectionCard> : null}

    {step !== "type" ? <div className="grid min-w-0 grid-cols-1 items-start gap-6 xl:grid-cols-(--report-form-desktop-columns)">
      <SectionCard title={step === "details" ? "Informasi & lampiran" : "Periksa pencatatan"} icon={step === "details" ? FileText : ShieldCheck} contentClassName="space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="space-y-1">
            <h3 ref={headingRef} tabIndex={-1} className="text-base font-semibold outline-none">{step === "details" ? kind === "kehilangan" ? "Informasi kehilangan" : "Informasi barang" : kind === "kehilangan" ? "Periksa laporan kehilangan" : "Periksa barang yang diterima"}</h3>
            {step === "review" ? <p className="text-sm text-muted-foreground">{kind === "kehilangan" ? "Pastikan informasi sesuai sebelum laporan disimpan." : "Pastikan barang sudah berada di pos sebelum disimpan ke Inventaris."}</p> : null}
          </div>
          <span className="text-xs text-muted-foreground" role="status">{draftStatus}</span>
        </div>
        {active.error ? <div className="space-y-2"><FieldError>{active.error}</FieldError><Button type="button" variant="outline" size="sm" disabled={submitting || navigationPending} onClick={() => { void store.save(kind, writeSatpamDraft).catch(() => {}) }}>Coba simpan draft</Button></div> : null}
        {step === "details" ? kind === "kehilangan" ? <LossItemForm key={active.id} idPrefix="pelaporan-loss" initialData={{ ...active.fields, photoFile: active.file }} disabled={navigationPending} onDraftChange={captureLoss} onProceedToReview={(data) => beginPreview({ kind: "kehilangan", data })} onCancel={() => goBack("type")} submitLabel="Periksa laporan" /> : <FoundItemForm key={active.id} idPrefix="pelaporan-found" initialData={{ ...active.fields, photoFile: active.file }} disabled={navigationPending} onDraftChange={captureFound} onProceedToReview={(data) => beginPreview({ kind: "temuan", data })} onBack={() => goBack("type")} submitLabel="Periksa barang" /> : preview ? <>
          <ReviewDetails preview={preview} />
          {error ? <FieldError>{error}</FieldError> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border/60 pt-4">
            <Button type="button" variant="outline" disabled={submitting || navigationPending} onClick={() => goBack("details")}><ArrowLeft aria-hidden="true" /> Kembali mengubah</Button>
            <Button type="button" disabled={submitting || navigationPending} onClick={() => void confirm()}>{submitting ? "Menyimpan…" : preview.kind === "kehilangan" ? "Simpan laporan" : "Simpan ke Inventaris"}</Button>
          </div>
        </> : null}
      </SectionCard>
      <ReportingGuidance kind={kind} />
    </div> : null}
  </div>
}

function ReportingGuidance({ kind }: { kind: SatpamDraftKind }) {
  const items = kind === "kehilangan" ? [[UserRound, "Catat nama atau kontak pemilik bila tersedia."], [MapPin, "Sebutkan lokasi terakhir barang terlihat."], [Clock3, "Atur waktu kejadian jika berbeda dari saat pencatatan."]] as const : [[PackageCheck, "Gunakan jika barang sudah diterima di pos."], [Inbox, "Jika sudah ada laporan temuan, buka laporannya untuk mencatat barang yang terhubung."], [ImagePlus, "Tambahkan foto jika membantu mengenali barang."]] as const
  return <aside className="space-y-4 xl:sticky xl:top-6 xl:self-start"><Card className="rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardHeader className="gap-3 p-5 pb-4"><div className="flex size-10 items-center justify-center rounded-xl border border-border bg-background shadow-2xs"><ShieldCheck className="size-5 text-primary" aria-hidden="true" /></div><div className="space-y-1"><CardTitle className="text-base">Sebelum menyimpan</CardTitle><CardDescription>Pastikan pencatatan sesuai kondisi di pos.</CardDescription></div></CardHeader><CardContent className="space-y-3 border-t border-border/60 p-5">{items.map(([Icon, text]) => <div key={text} className="flex items-start gap-2.5 text-sm text-muted-foreground"><Icon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><span>{text}</span></div>)}</CardContent></div></Card></aside>
}

function ReviewDetails({ preview }: { preview: Preview }) {
  const rows = preview.kind === "kehilangan" ? [["Jenis pencatatan", "Kehilangan"], ["Judul", preview.data.title], ["Barang", preview.data.itemName], ["Pelapor", preview.data.ownerName || "Tidak dicantumkan"], ["Kontak", preview.data.ownerContact || "Tidak dicantumkan"], ["Lokasi", preview.data.location], ["Waktu kejadian", preview.data.useCustomTime ? `${new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${preview.data.incidentDate}T00:00:00+07:00`))}, ${preview.data.incidentTime.replace(":", ".")} WIB` : "Dicatat otomatis saat disimpan"], ["Deskripsi", preview.data.description]] : [["Jenis pencatatan", "Barang diterima di pos"], ["Laporan Temuan", preview.data.sourceFoundTicket ? "Terhubung dengan laporan terpilih" : "Tanpa laporan web"], ["Barang", preview.data.itemName], ["Lokasi ditemukan", preview.data.foundLocation || "Tidak dicantumkan"], ["Penemu", preview.data.founderName || "Tidak dicantumkan"], ["Deskripsi", preview.data.description || "Tidak dicantumkan"]]
  return <div className="space-y-4"><dl className="overflow-hidden rounded-xl border border-border/60">{rows.map(([label, value]) => <div key={label} className="grid gap-1 border-b border-border/60 p-3 last:border-b-0 sm:grid-cols-3 sm:gap-3"><dt className="text-xs text-muted-foreground">{label}</dt><dd className="break-words whitespace-pre-wrap text-sm sm:col-span-2">{value}</dd></div>)}</dl>{preview.data.photoFile ? <ReviewPhoto file={preview.data.photoFile} /> : null}</div>
}

function ReviewPhoto({ file }: { file: File }) {
  // The form revokes its own preview URL when the step unmounts, so the review owns a separate URL.
  const { previewUrl } = useItemPhoto(file)
  return previewUrl ? <div className="relative h-48 overflow-hidden rounded-xl border border-border bg-muted/30"><Image src={previewUrl} alt="Foto barang yang akan disimpan" fill unoptimized className="object-contain" /></div> : null
}
