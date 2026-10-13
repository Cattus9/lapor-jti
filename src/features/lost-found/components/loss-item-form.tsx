"use client"

import { useState } from "react"
import { ArrowRight, CalendarDays, Check, Clock3, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { formatCalendarDate, getIncidentDateTimeInWib, getTodayInWib } from "@/features/reports/domain/report-date"
import type { LossReport } from "../domain/loss-report"
import { ItemPhotoField, useItemPhoto } from "./item-photo-field"

export type LossFormData = {
  title: string
  itemName: string
  location: string
  useCustomTime: boolean
  incidentDate: string
  incidentTime: string
  characteristics?: string
  description: string
  photoFile: File | null
  photoPreviewUrl: string | null
}

/**
 * Form for Satpam to record a reported loss (Kehilangan).
 * Designed like the Pelapor form (Title, Item Name, Location, Event Date/Time,
 * Details/Chronology with characteristics, and Photo), but with no "Kehilangan/Temuan" selection
 * since it defaults directly to Kehilangan.
 */
export function LossItemForm({
  idPrefix,
  initialData,
  onSuccess,
  onProceedToReview,
  onCancel,
  submitLabel,
}: {
  idPrefix: string
  initialData?: Partial<LossFormData>
  onSuccess?: (report: LossReport) => void
  onProceedToReview?: (data: LossFormData) => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [title, setTitle] = useState(initialData?.title ?? "")
  const [itemName, setItemName] = useState(initialData?.itemName ?? "")
  const [location, setLocation] = useState(initialData?.location ?? "")
  const [useCustomTime, setUseCustomTime] = useState(initialData?.useCustomTime ?? false)
  const [incidentDate, setIncidentDate] = useState<Date | undefined>(() => {
    if (initialData?.incidentDate) return new Date(`${initialData.incidentDate}T00:00:00`)
    return undefined
  })
  const [incidentTime, setIncidentTime] = useState(initialData?.incidentTime ?? "")
  const [datePickerOpen, setDatePickerOpen] = useState(false)
  const [description, setDescription] = useState(
    initialData?.description ?? initialData?.characteristics ?? ""
  )
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const photo = useItemPhoto()

  const todayStr = getTodayInWib()
  const formattedSelectedDate = incidentDate ? formatCalendarDate(incidentDate) : ""
  const dateError = useCustomTime && formattedSelectedDate && formattedSelectedDate > todayStr
    ? "Tanggal kejadian tidak boleh melebihi hari ini (WIB)."
    : ""

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!title.trim()) {
      setError("Judul laporan wajib diisi.")
      return
    }
    if (!itemName.trim()) {
      setError("Nama barang wajib diisi.")
      return
    }
    if (!location.trim()) {
      setError("Lokasi kejadian wajib diisi.")
      return
    }
    if (useCustomTime) {
      if (!incidentDate) {
        setError("Pilih tanggal kejadian atau matikan waktu tertentu.")
        return
      }
      if (dateError) {
        setError(dateError)
        return
      }
      if (!incidentTime.trim()) {
        setError("Masukkan waktu kejadian (jam & menit) atau matikan waktu tertentu.")
        return
      }
    }
    if (!description.trim()) {
      setError("Detail & kronologi kejadian wajib diisi.")
      return
    }

    const currentWib = getIncidentDateTimeInWib()
    const resolvedDate = useCustomTime ? formattedSelectedDate : currentWib.incidentDate
    const resolvedTime = useCustomTime ? incidentTime.trim() : currentWib.incidentTime

    if (onProceedToReview) {
      setError("")
      onProceedToReview({
        title: title.trim(),
        itemName: itemName.trim(),
        location: location.trim(),
        useCustomTime,
        incidentDate: resolvedDate,
        incidentTime: resolvedTime,
        characteristics: description.trim(),
        description: description.trim(),
        photoFile: photo.file,
        photoPreviewUrl: photo.previewUrl,
      })
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.set("title", title.trim())
      formData.set("itemName", itemName.trim())
      formData.set("location", location.trim())
      formData.set("incidentDate", resolvedDate)
      formData.set("incidentTime", resolvedTime)
      formData.set("characteristics", description.trim().slice(0, 2000))
      formData.set("description", description.trim())
      if (photo.file) formData.set("photo", photo.file)

      const response = await fetch("/api/satpam/loss-reports", {
        method: "POST",
        body: formData,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Gagal mencatat laporan kehilangan.")

      onSuccess?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan laporan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error ? <FieldError>{error}</FieldError> : null}

      <div className="grid grid-cols-1 items-start gap-5 sm:grid-cols-2">
        {/* Judul Laporan */}
        <Field className="space-y-1.5 sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-title`}>
            Judul Laporan <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id={`${idPrefix}-title`}
            placeholder="Contoh: Dompet hilang di Ruang 3.4"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            disabled={submitting}
            required
          />
          <FieldDescription>Ringkasan singkat barang yang hilang dan lokasinya.</FieldDescription>
        </Field>

        {/* Nama Barang */}
        <Field className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-item-name`}>
            Nama Barang <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id={`${idPrefix}-item-name`}
            placeholder="Contoh: Dompet kulit warna hitam"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            disabled={submitting}
            required
          />
          <FieldDescription>Nama atau sebutan barang yang mudah diidentifikasi.</FieldDescription>
        </Field>

        {/* Lokasi Kejadian */}
        <Field className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-location`}>
            Lokasi Kejadian <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id={`${idPrefix}-location`}
            placeholder="Contoh: Gedung JTI, Ruang 3.4"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            disabled={submitting}
            required
          />
          <FieldDescription>Tempat barang hilang atau perkiraan lokasi terakhir terlihat.</FieldDescription>
        </Field>

        {/* Detail & Kronologi Kejadian (Tunggal / Gabungan) */}
        <Field className="space-y-1.5 sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-desc`}>
            Detail &amp; Kronologi Kejadian <span className="text-destructive">*</span>
          </FieldLabel>
          <Textarea
            id={`${idPrefix}-desc`}
            placeholder="Jelaskan ciri khusus fisik barang (warna, merk, tipe, nomor seri, stiker/tanda) beserta kronologi saat menyadari barang hilang atau terakhir terlihat..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={submitting}
            rows={4}
            className="resize-none"
            required
          />
          <FieldDescription>
            Sertakan ciri spesifik fisik barang dan kronologi kejadian untuk membantu proses pencarian dan pencocokan.
          </FieldDescription>
        </Field>

        {/* Date & Time Settings (like in Pelapor form) */}
        <div className="rounded-xl border border-border/70 bg-muted/20 p-4 space-y-3 sm:col-span-2">
          <div className="flex items-center justify-between gap-4">
            <FieldLabel htmlFor={`${idPrefix}-custom-time`} className="text-xs font-semibold">
              Gunakan tanggal &amp; waktu tertentu
            </FieldLabel>
            <Switch
              id={`${idPrefix}-custom-time`}
              checked={useCustomTime}
              disabled={submitting}
              onCheckedChange={(checked) => {
                if (checked) {
                  const current = getIncidentDateTimeInWib()
                  if (!incidentDate) setIncidentDate(new Date(`${current.incidentDate}T00:00:00`))
                  if (!incidentTime) setIncidentTime(current.incidentTime)
                } else {
                  setDatePickerOpen(false)
                }
                setUseCustomTime(checked)
              }}
            />
          </div>
          <FieldDescription>
            {useCustomTime
              ? "Pilih tanggal dan waktu kejadian yang sesuai (WIB)."
              : "Tanggal dan waktu kejadian otomatis dicatat saat laporan dikirim (WIB). Aktifkan jika kejadian berlangsung pada waktu lain."}
          </FieldDescription>

          {useCustomTime ? (
            <div className="grid grid-cols-1 gap-3 pt-2 sm:grid-cols-2">
              <Field className="space-y-1">
                <FieldLabel htmlFor={`${idPrefix}-date`}>Tanggal Kejadian</FieldLabel>
                <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
                  <PopoverTrigger
                    render={
                      <Button
                        id={`${idPrefix}-date`}
                        type="button"
                        variant="outline"
                        disabled={submitting}
                        className="h-10 w-full justify-start text-left font-normal bg-background/80"
                      />
                    }
                  >
                    <CalendarDays className="size-4 text-muted-foreground mr-2 shrink-0" aria-hidden="true" />
                    {incidentDate ? (
                      new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(incidentDate)
                    ) : (
                      <span className="text-muted-foreground">Pilih tanggal</span>
                    )}
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={incidentDate}
                      onSelect={(date) => {
                        setIncidentDate(date)
                        setDatePickerOpen(false)
                      }}
                      disabled={{ after: new Date(`${todayStr}T00:00:00`) }}
                      autoFocus
                    />
                  </PopoverContent>
                </Popover>
                {dateError ? <FieldError>{dateError}</FieldError> : null}
              </Field>

              <Field className="space-y-1">
                <FieldLabel htmlFor={`${idPrefix}-time`}>Waktu Kejadian (WIB)</FieldLabel>
                <div className="relative">
                  <Clock3 className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input
                    id={`${idPrefix}-time`}
                    type="time"
                    value={incidentTime}
                    onChange={(event) => setIncidentTime(event.target.value)}
                    disabled={submitting}
                    className="h-10 pl-9 bg-background/80"
                    placeholder="00:00"
                  />
                </div>
              </Field>
            </div>
          ) : null}
        </div>
      </div>

      {/* Full-width Photo Upload underneath */}
      <div className="w-full pt-1">
        <ItemPhotoField
          idPrefix={idPrefix}
          photo={photo}
          disabled={submitting}
          description="Contoh gambar atau foto barang yang serupa untuk memudahkan identifikasi."
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-4">
        {onCancel ? (
          <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
            Kembali
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="min-w-[160px] gap-2">
          {submitting ? (
            <>
              <Loader2 className="size-4 animate-spin" aria-hidden="true" />
              Menyimpan...
            </>
          ) : onProceedToReview ? (
            <>
              {submitLabel || "Lanjut ke Pratinjau"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </>
          ) : (
            <>
              <Check className="size-4" aria-hidden="true" />
              {submitLabel || "Simpan Laporan Kehilangan"}
            </>
          )}
        </Button>
      </div>
    </form>
  )
}
