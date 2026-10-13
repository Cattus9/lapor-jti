"use client"

import { useState } from "react"
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
          title: data.ticketNumber || data.title || data.itemName,
          detail: `Laporan kehilangan berhasil dicatat dan diteruskan ke menu Kehilangan & Temuan${data.ticketNumber ? ` (Tiket: ${data.ticketNumber})` : ""}.`,
        })
      } else if (selectedType === "temuan" && foundData) {
        const formData = new FormData()
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
              <div className="flex size-14 items-center justify-center rounded-2xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 shadow-xs dark:text-emerald-400">
                <CheckCircle2 className="size-7" aria-hidden="true" />
              </div>
              <div className="max-w-md space-y-2">
                <span className="inline-flex items-center rounded-full border border-emerald-500/20 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                  {submittedSuccess.type === "temuan"
                    ? "Temuan Masuk Inventaris"
                    : "Laporan Kehilangan Tersimpan"}
                </span>
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
              <Card className="rounded-2xl border-border bg-sidebar p-1.5 shadow-xs">
                <div className="space-y-6 rounded-xl border border-border/60 bg-card p-5 sm:p-7 shadow-2xs">
                  <div>
                    <h2 className="text-base font-semibold tracking-tight text-foreground">
                      Pilih Jenis Pelaporan
                    </h2>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Pilih jenis laporan yang ingin dicatat. Pelaporan kehilangan diatur secara default.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Option: Kehilangan (Default) */}
                    <button
                      type="button"
                      onClick={() => setSelectedType("kehilangan")}
                      className={cn(
                        "group relative flex flex-col text-left rounded-2xl border p-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedType === "kehilangan"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-sidebar hover:border-primary/40 hover:bg-sidebar/80 shadow-2xs"
                      )}
                      aria-pressed={selectedType === "kehilangan"}
                    >
                      <div className="flex flex-1 flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "flex size-11 items-center justify-center rounded-xl border transition-colors",
                                selectedType === "kehilangan"
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-background text-muted-foreground group-hover:text-primary"
                              )}
                            >
                              <PackageSearch className="size-5" aria-hidden="true" />
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                selectedType === "kehilangan"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border/60"
                              )}
                            >
                              {selectedType === "kehilangan" ? "Terpilih (Default)" : "Pilih"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                              Laporan Kehilangan
                            </h3>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Catat laporan kehilangan barang dari civitas kampus (judul, nama barang, lokasi, waktu, ciri-ciri, dan foto).
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary">
                          <span>Formulir pelapor tanpa pilihan ganda</span>
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </div>
                      </div>
                    </button>

                    {/* Option: Temuan */}
                    <button
                      type="button"
                      onClick={() => setSelectedType("temuan")}
                      className={cn(
                        "group relative flex flex-col text-left rounded-2xl border p-1.5 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selectedType === "temuan"
                          ? "border-primary bg-primary/5 shadow-sm"
                          : "border-border bg-sidebar hover:border-primary/40 hover:bg-sidebar/80 shadow-2xs"
                      )}
                      aria-pressed={selectedType === "temuan"}
                    >
                      <div className="flex flex-1 flex-col justify-between rounded-xl border border-border/60 bg-card p-4 sm:p-5">
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span
                              className={cn(
                                "flex size-11 items-center justify-center rounded-xl border transition-colors",
                                selectedType === "temuan"
                                  ? "border-primary/40 bg-primary/10 text-primary"
                                  : "border-border bg-background text-muted-foreground group-hover:text-primary"
                              )}
                            >
                              <PackagePlus className="size-5" aria-hidden="true" />
                            </span>
                            <span
                              className={cn(
                                "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold border",
                                selectedType === "temuan"
                                  ? "bg-primary text-primary-foreground border-primary"
                                  : "bg-muted text-muted-foreground border-border/60"
                              )}
                            >
                              {selectedType === "temuan" ? "Terpilih" : "Pilih"}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <h3 className="text-base font-semibold text-foreground group-hover:text-primary transition-colors">
                              Laporan Temuan (Inventaris Pos)
                            </h3>
                            <p className="text-xs leading-relaxed text-muted-foreground">
                              Catat barang temuan yang diserahkan ke Pos Satpam. Barang otomatis terdaftar di inventaris pos.
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex items-center gap-1.5 text-xs font-medium text-primary">
                          <span>Formulir temuan dengan lokasi &amp; penemu</span>
                          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                        </div>
                      </div>
                    </button>
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
                </div>
              </Card>
            ) : null}

            {/* STEP 2: Formulir Informasi & Lampiran */}
            {currentStep === "details" ? (
              <Card className="rounded-2xl border-border bg-sidebar p-1.5 shadow-xs">
                <div className="space-y-5 rounded-xl border border-border/60 bg-card p-5 sm:p-7 shadow-2xs">
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                    <div className="flex items-center gap-3">
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary shadow-2xs">
                        {selectedType === "kehilangan" ? (
                          <PackageSearch className="size-5" aria-hidden="true" />
                        ) : (
                          <PackagePlus className="size-5" aria-hidden="true" />
                        )}
                      </span>
                      <div>
                        <h3 className="text-base font-semibold tracking-tight text-foreground">
                          {selectedType === "kehilangan"
                            ? "Formulir Informasi Laporan Kehilangan"
                            : "Formulir Informasi Barang Temuan"}
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
                </div>
              </Card>
            ) : null}

            {/* STEP 3: Pratinjau & Konfirmasi Simpan */}
            {currentStep === "review" ? (
              <Card className="rounded-2xl border-border bg-sidebar p-1.5 shadow-xs">
                <div className="space-y-6 rounded-xl border border-border/60 bg-card p-5 sm:p-7 shadow-2xs">
                  <div className="flex items-center gap-3 border-b border-border/60 pb-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary shadow-2xs">
                      <ShieldCheck className="size-5" aria-hidden="true" />
                    </span>
                    <div>
                      <h3 className="text-base font-semibold tracking-tight text-foreground">
                        Periksa Ringkasan Laporan
                      </h3>
                      <p className="text-xs text-muted-foreground">
                        Pastikan seluruh data yang dimasukkan sudah benar sebelum disimpan ke sistem.
                      </p>
                    </div>
                  </div>

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
                          <span
                            className={cn(
                              "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold border",
                              selectedType === "kehilangan"
                                ? "bg-blue-500/10 border-blue-500/20 text-blue-600 dark:text-blue-400"
                                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                            )}
                          >
                            {selectedType === "kehilangan" ? "Laporan Kehilangan" : "Laporan Temuan (Inventaris Pos)"}
                          </span>
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
                                <span className="ml-2 text-[11px] text-muted-foreground">(Waktu saat ini)</span>
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
                      className="min-w-[170px] gap-2"
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
                </div>
              </Card>
            ) : null}
          </div>
        )}
      </ContentShell>
    </DashboardLayout>
  )
}
