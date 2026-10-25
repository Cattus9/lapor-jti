"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  FileText,
  Inbox,
  Loader2,
  ListChecks,
  MapPin,
  MapPinned,
  Package,
  PackageCheck,
  PackagePlus,
  PackageSearch,
  PlusCircle,
  RotateCcw,
  ShieldCheck,
  UserRound,
} from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { SectionCard } from "@/components/ui/section-card"
import { Card } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import type { CurrentUser } from "@/lib/auth/current-user"
import { SatpamPelaporanStepper, type PelaporanStepId } from "./satpam-pelaporan-stepper"
import { FoundItemForm, type FoundFormData } from "./found-item-form"
import { LossItemForm, type LossFormData } from "./loss-item-form"
import { cn } from "cn"

type ReportType = "kehilangan" | "temuan"

export function SatpamPelaporanWorkspace({ user }: { user: CurrentUser }) {
  // Default is "kehilangan" as per requirement
  const [selectedType, setSelectedType] = useState<ReportType>("kehilangan")
  const [currentStep, setCurrentStep] = useState<PelaporanStepId>("type")

  const [lossData, setLossData] = useState<LossFormData | null>(null)
  const [foundData, setFoundData] = useState<FoundFormData | null>(null)

  const inventoryCommand = useRef<{ signature: string; key: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState("")
  const [submittedSuccess, setSubmittedSuccess] = useState<{
    type: ReportType
    title: string
    detail: string
  } | null>(null)

  const stepOrder: PelaporanStepId[] = ["type", "details", "review"]
  const currentStepIndex = stepOrder.indexOf(currentStep)

  function handleReset() {
    inventoryCommand.current = null
    setSubmittedSuccess(null)
    setLossData(null)
    setFoundData(null)
    setSelectedType("kehilangan")
    setCurrentStep("type")
    setSubmitError("")
  }

  function handleStepClick(index: number) {
    if (index === 0) setCurrentStep("type")
    if (index === 1) setCurrentStep("details")
  }

  async function handleFinalSubmit() {
    setSubmitting(true)
    setSubmitError("")

    try {
      if (selectedType === "kehilangan" && lossData) {
        const formData = new FormData()
        formData.set("ownerName", lossData.ownerName ?? "")
        formData.set("ownerContact", lossData.ownerContact ?? "")
        formData.set("title", lossData.title)
        formData.set("itemName", lossData.itemName)
        formData.set("location", lossData.location)
        formData.set("incidentDate", lossData.incidentDate)
        formData.set("incidentTime", lossData.incidentTime)
        formData.set("characteristics", (lossData.characteristics || lossData.description).slice(0, 2000))
        formData.set("description", lossData.description)
        if (lossData.photoFile) formData.set("photo", lossData.photoFile)

        const response = await fetch("/api/satpam/loss-reports", {
          method: "POST",
          body: formData,
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || "Gagal mencatat laporan kehilangan.")

        setSubmittedSuccess({
          type: "kehilangan",
          title: data.title || data.itemName,
          detail: "Laporan kehilangan berhasil dicatat dan diteruskan ke menu Kehilangan & Temuan.",
        })
      } else if (selectedType === "temuan" && foundData) {
        const signature = JSON.stringify([foundData.itemName, foundData.description, foundData.foundLocation, foundData.founderName, foundData.photoFile?.name, foundData.photoFile?.size, foundData.photoFile?.lastModified])
        if (!inventoryCommand.current || inventoryCommand.current.signature !== signature) inventoryCommand.current = { signature, key: crypto.randomUUID() }
        const formData = new FormData()
        formData.set("submissionKey", inventoryCommand.current.key)
        formData.set("itemName", foundData.itemName)
        if (foundData.description) formData.set("description", foundData.description)
        if (foundData.foundLocation) formData.set("foundLocation", foundData.foundLocation)
        if (foundData.founderName) formData.set("founderName", foundData.founderName)
        if (foundData.photoFile) formData.set("photo", foundData.photoFile)

        const response = await fetch("/api/satpam/inventory", {
          method: "POST",
          body: formData,
        })
        const data = await response.json().catch(() => null)
        if (!response.ok) throw new Error(data?.error || "Gagal menyimpan barang inventaris.")

        setSubmittedSuccess({
          type: "temuan",
          title: data.itemName,
          detail: `Barang temuan telah berhasil didaftarkan dan tersimpan di Inventaris Pos Satpam.`,
        })
      }
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses laporan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <DashboardLayout role="satpam">
      <ContentShell>
        <PageHeader
          title="Pelaporan Pos Satpam"
          description={`Selamat datang, ${user.name}. Catat laporan kehilangan maupun temuan barang dengan alur langkah terpadu.`}
        />

        {submittedSuccess ? (
          <Card className="rounded-2xl border-border bg-sidebar p-1.5 shadow-xs">
            <div className="flex flex-col items-center justify-center space-y-4 rounded-xl border border-border/60 bg-card p-8 text-center sm:p-12">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-primary/20 bg-primary/10 text-primary">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </div>
              <div className="max-w-md space-y-2">
                <Badge variant="outline" tone="success">
                  {submittedSuccess.type === "temuan"
                    ? "Temuan Masuk Inventaris"
                    : "Laporan Kehilangan Tersimpan"}
                </Badge>
                <h3 className="text-lg font-bold text-foreground">
                  {submittedSuccess.title}
                </h3>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  {submittedSuccess.detail}
                </p>
              </div>

              <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                <Button
                  onClick={handleReset}
                  variant="outline"
                  className="gap-2 text-xs"
                >
                  <PlusCircle className="size-3.5" aria-hidden="true" />
                  Buat Laporan Baru
                </Button>
                {submittedSuccess.type === "temuan" ? (
                  <Button
                    nativeButton={false}
                    className="gap-2 text-xs"
                    render={<Link href="/satpam/inventaris" />}
                  >
                    <PackageCheck className="size-3.5" aria-hidden="true" />
                    Buka Inventaris
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                ) : (
                  <Button
                    nativeButton={false}
                    className="gap-2 text-xs"
                    render={<Link href="/satpam/kehilangan-temuan" />}
                  >
                    <Inbox className="size-3.5" aria-hidden="true" />
                    Buka Kehilangan &amp; Temuan
                    <ArrowRight className="size-3.5" aria-hidden="true" />
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Stepper Header */}
            <SatpamPelaporanStepper
              current={currentStepIndex}
              onStepClick={handleStepClick}
            />

            {/* STEP 1: Pilih Jenis Pelaporan */}
            {currentStep === "type" ? (
              <SectionCard title="Jenis pelaporan" icon={ListChecks} contentClassName="space-y-5">
                  <p className="text-sm text-muted-foreground">Pilih jenis pencatatan sesuai kondisi di pos Satpam.</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    {([
                      { value: "kehilangan", title: "Laporan Kehilangan", icon: PackageSearch, description: "Catat kehilangan yang dilaporkan langsung oleh pemilik ke pos Satpam." },
                      { value: "temuan", title: "Laporan Temuan (Inventaris Pos)", icon: PackagePlus, description: "Catat barang yang sudah diterima secara fisik di pos Satpam ke Inventaris." },
                    ] as const).map(({ value, title, icon: Icon, description }) => (
                      <Button key={value} type="button" variant="outline" aria-pressed={selectedType === value} onClick={() => setSelectedType(value)}
                        className={cn("group h-auto w-full flex-col items-stretch gap-3 rounded-xl border p-4 text-left whitespace-normal shadow-none transition-colors motion-reduce:transition-none sm:p-5", selectedType === value ? "border-primary bg-primary/5 hover:bg-primary/5 dark:bg-primary/10 dark:hover:bg-primary/10" : "border-border bg-background hover:border-primary/40 hover:bg-muted/40 dark:bg-background dark:hover:bg-muted/40")}>
                        <span className="flex w-full items-center justify-between gap-3">
                          <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-primary"><Icon className="size-5" aria-hidden="true" /></span>
                          <Badge variant="outline" tone={selectedType === value ? "primary" : "neutral"}>{selectedType === value ? "Terpilih" : "Pilih"}</Badge>
                        </span>
                        <span className="space-y-1"><span className="block text-base font-semibold text-foreground">{title}</span><span className="block text-xs leading-relaxed font-normal text-muted-foreground">{description}</span></span>
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center justify-end border-t border-border/60 pt-4">
                    <Button
                      onClick={() => {
                        setCurrentStep("details")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      className="gap-2"
                    >
                      Lanjut Isi Informasi
                      <ArrowRight className="size-4" aria-hidden="true" />
                    </Button>
                  </div>
              </SectionCard>
            ) : null}

            {/* STEP 2: Formulir Informasi & Lampiran */}
            {currentStep === "details" ? (
              <SectionCard title="Informasi & lampiran" icon={FileText} contentClassName="space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">

                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          {selectedType === "kehilangan"
                            ? "Laporan kehilangan"
                            : "Barang temuan diterima di pos"}
                        </h3>
                        <p className="text-xs text-muted-foreground">
                          {selectedType === "kehilangan"
                            ? "Lengkapi judul, nama barang, lokasi, waktu, detail & kronologi kejadian, dan foto barang hilang."
                            : "Lengkapi nama barang, deskripsi ciri, lokasi temuan, nama penemu, dan foto."}
                        </p>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setCurrentStep("type")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RotateCcw className="size-3.5" aria-hidden="true" />
                      Ganti Jenis ({selectedType === "kehilangan" ? "Kehilangan" : "Temuan"})
                    </Button>
                  </div>

                  {selectedType === "kehilangan" ? (
                    <LossItemForm
                      idPrefix="pelaporan-loss"
                      initialData={lossData ?? undefined}
                      onProceedToReview={(data) => {
                        setLossData(data)
                        setCurrentStep("review")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      onCancel={() => {
                        setCurrentStep("type")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      submitLabel="Lanjut ke Pratinjau"
                    />
                  ) : (
                    <FoundItemForm
                      idPrefix="pelaporan-found"
                      initialData={foundData ?? undefined}
                      onProceedToReview={(data) => {
                        setFoundData(data)
                        setCurrentStep("review")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      onCancel={() => {
                        setCurrentStep("type")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      submitLabel="Lanjut ke Pratinjau"
                    />
                  )}
              </SectionCard>
            ) : null}

            {/* STEP 3: Pratinjau & Konfirmasi Simpan */}
            {currentStep === "review" ? (
              <SectionCard title="Periksa laporan" icon={ShieldCheck} contentClassName="space-y-6">
                  <p className="text-sm text-muted-foreground">Pastikan seluruh data sudah benar sebelum disimpan.</p>

                  {submitError ? <FieldError>{submitError}</FieldError> : null}

                  {/* Summary definition table */}
                  <div className="overflow-hidden rounded-xl border border-border/80 bg-card text-xs">
                    <dl className="divide-y divide-border/60">
                      <div className="grid grid-cols-3 p-3 sm:grid-cols-4 bg-muted/20">
                        <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                          <Package className="size-3.5 text-primary" aria-hidden="true" />
                          Jenis Laporan
                        </dt>
                        <dd className="font-semibold text-foreground col-span-2 sm:col-span-3">
                          <Badge variant="outline" tone={selectedType === "kehilangan" ? "info" : "success"}>
                            {selectedType === "kehilangan" ? "Laporan Kehilangan" : "Laporan Temuan (Inventaris Pos)"}
                          </Badge>
                        </dd>
                      </div>

                      {selectedType === "kehilangan" && lossData?.title ? (
                        <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                          <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                            <FileText className="size-3.5 text-primary" aria-hidden="true" />
                            Judul Laporan
                          </dt>
                          <dd className="font-semibold text-foreground col-span-2 sm:col-span-3">
                            {lossData.title}
                          </dd>
                        </div>
                      ) : null}

                      <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                        <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                          <Package className="size-3.5 text-primary" aria-hidden="true" />
                          Nama Barang
                        </dt>
                        <dd className="font-semibold text-foreground col-span-2 sm:col-span-3">
                          {selectedType === "kehilangan" ? lossData?.itemName : foundData?.itemName}
                        </dd>
                      </div>

                      {selectedType === "kehilangan" ? (
                        <>
                          <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                            <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                              <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                              Lokasi Kejadian
                            </dt>
                            <dd className="text-foreground col-span-2 sm:col-span-3">
                              {lossData?.location}
                            </dd>
                          </div>

                          <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                            <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                              <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
                              Waktu Kejadian
                            </dt>
                            <dd className="text-foreground col-span-2 sm:col-span-3">
                              {lossData?.incidentDate} · {lossData?.incidentTime} WIB
                              {!lossData?.useCustomTime && (
                                <span className="ml-2 text-xs text-muted-foreground">(Waktu saat ini)</span>
                              )}
                            </dd>
                          </div>

                          <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                            <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                              <FileText className="size-3.5 text-primary" aria-hidden="true" />
                              Detail &amp; Kronologi
                            </dt>
                            <dd className="text-foreground whitespace-pre-wrap leading-relaxed col-span-2 sm:col-span-3">
                              {lossData?.description}
                            </dd>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                            <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                              <MapPinned className="size-3.5 text-primary" aria-hidden="true" />
                              Lokasi Temuan
                            </dt>
                            <dd className="text-foreground col-span-2 sm:col-span-3">
                              {foundData?.foundLocation || "Tidak dicatat"}
                            </dd>
                          </div>

                          <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                            <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                              <UserRound className="size-3.5 text-primary" aria-hidden="true" />
                              Nama Penemu
                            </dt>
                            <dd className="text-foreground col-span-2 sm:col-span-3">
                              {foundData?.founderName || "Anonim / Tidak dicatat"}
                            </dd>
                          </div>

                          <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                            <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                              <FileText className="size-3.5 text-primary" aria-hidden="true" />
                              Deskripsi &amp; Ciri
                            </dt>
                            <dd className="text-foreground whitespace-pre-wrap leading-relaxed col-span-2 sm:col-span-3">
                              {foundData?.description || "Tidak ada deskripsi tambahan"}
                            </dd>
                          </div>
                        </>
                      )}

                      {/* Photo preview row if attached */}
                      {selectedType === "kehilangan" && lossData?.photoPreviewUrl ? (
                        <div className="grid grid-cols-3 p-3 sm:grid-cols-4 items-center">
                          <dt className="font-medium text-muted-foreground col-span-1">Foto Barang</dt>
                          <dd className="col-span-2 sm:col-span-3">
                            <div className="relative aspect-video w-44 overflow-hidden rounded-lg border border-border bg-muted">
                              <Image
                                src={lossData.photoPreviewUrl}
                                alt="Foto barang pratinjau"
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          </dd>
                        </div>
                      ) : null}

                      {selectedType === "temuan" && foundData?.photoPreviewUrl ? (
                        <div className="grid grid-cols-3 p-3 sm:grid-cols-4 items-center">
                          <dt className="font-medium text-muted-foreground col-span-1">Foto Barang</dt>
                          <dd className="col-span-2 sm:col-span-3">
                            <div className="relative aspect-video w-44 overflow-hidden rounded-lg border border-border bg-muted">
                              <Image
                                src={foundData.photoPreviewUrl}
                                alt="Foto barang pratinjau"
                                fill
                                className="object-contain"
                                unoptimized
                              />
                            </div>
                          </dd>
                        </div>
                      ) : null}
                    </dl>
                  </div>

                  <div className="flex items-center justify-between border-t border-border/60 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={submitting}
                      onClick={() => {
                        setCurrentStep("details")
                        window.scrollTo({ top: 0, behavior: "smooth" })
                      }}
                      className="gap-2"
                    >
                      <ArrowLeft className="size-4" aria-hidden="true" />
                      Kembali Ubah
                    </Button>

                    <Button
                      type="button"
                      disabled={submitting}
                      onClick={handleFinalSubmit}
                      className="min-w-44 gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                          Menyimpan...
                        </>
                      ) : (
                        <>
                          <Check className="size-4" aria-hidden="true" />
                          {selectedType === "kehilangan" ? "Simpan Laporan Kehilangan" : "Simpan ke Inventaris Pos"}
                        </>
                      )}
                    </Button>
                  </div>
              </SectionCard>
            ) : null}
          </div>
        )}
      </ContentShell>
    </DashboardLayout>
  )
}
