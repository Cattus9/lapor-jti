"use client"

import { useEffect, useRef, useState } from "react"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { InventoryItem } from "../domain/inventory"
import { FoundReportSelector } from "./found-report-selector"
import { ItemPhotoField, useItemPhoto } from "./item-photo-field"

export type FoundFormData = {
  sourceFoundTicket?: string
  itemName: string
  description: string
  foundLocation: string
  founderName: string
  photoFile: File | null
  photoPreviewUrl: string | null
}

/**
 * Registers a found item into the Satpam inventory.
 * Shared by the inventory "Tambah Barang" dialog and the Pelaporan "Temuan" flow.
 */
export function FoundItemForm({
  idPrefix,
  initialData,
  onSuccess,
  onProceedToReview,
  onCancel,
  onBack,
  submitLabel,
  sourceFoundTicket,
  onDraftChange,
  disabled = false,
}: {
  idPrefix: string
  initialData?: Partial<FoundFormData>
  onSuccess?: (item: InventoryItem) => void
  onProceedToReview?: (data: FoundFormData) => void
  onCancel?: () => void
  onBack?: () => void
  submitLabel?: string
  sourceFoundTicket?: string
  onDraftChange?: (data: FoundFormData) => void
  disabled?: boolean
}) {
  const [selectedSource, setSelectedSource] = useState(initialData?.sourceFoundTicket ?? sourceFoundTicket ?? "")
  const [itemName, setItemName] = useState(initialData?.itemName ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [foundLocation, setFoundLocation] = useState(initialData?.foundLocation ?? "")
  const [founderName, setFounderName] = useState(initialData?.founderName ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const photo = useItemPhoto(initialData?.photoFile)
  const command = useRef<{ signature: string; key: string } | null>(null)

  useEffect(() => {
    onDraftChange?.({ sourceFoundTicket: selectedSource, itemName, description, foundLocation, founderName, photoFile: photo.file, photoPreviewUrl: photo.previewUrl })
  }, [onDraftChange, selectedSource, itemName, description, foundLocation, founderName, photo.file, photo.previewUrl])

  function resetForm() {
    setSelectedSource(sourceFoundTicket ?? "")
    setItemName("")
    setDescription("")
    setFoundLocation("")
    setFounderName("")
    setError("")
    photo.remove()
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (disabled) return
    if (!itemName.trim()) {
      setError("Nama barang wajib diisi.")
      return
    }

    if (onProceedToReview) {
      setError("")
      onProceedToReview({
        sourceFoundTicket: selectedSource,
        itemName: itemName.trim(),
        description: description.trim(),
        foundLocation: foundLocation.trim(),
        founderName: founderName.trim(),
        photoFile: photo.file,
        photoPreviewUrl: photo.previewUrl,
      })
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      const signature = JSON.stringify([itemName, description, foundLocation, founderName, selectedSource, photo.file?.name, photo.file?.size, photo.file?.lastModified])
      if (!command.current || command.current.signature !== signature) command.current = { signature, key: crypto.randomUUID() }
      formData.set("submissionKey", command.current.key)
      if (selectedSource) formData.set("sourceFoundTicket", selectedSource)
      formData.set("itemName", itemName.trim())
      if (description.trim()) formData.set("description", description.trim())
      if (foundLocation.trim()) formData.set("foundLocation", foundLocation.trim())
      if (founderName.trim()) formData.set("founderName", founderName.trim())
      if (photo.file) formData.set("photo", photo.file)

      const response = await fetch("/api/satpam/inventory", { method: "POST", body: formData })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Gagal menyimpan barang inventaris.")

      command.current = null
      resetForm()
      onSuccess?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5"><fieldset disabled={disabled} className="space-y-5">
      {error ? <FieldError>{error}</FieldError> : null}

      {sourceFoundTicket ? <FieldDescription>Barang dihubungkan dengan laporan Temuan yang sedang dibuka.</FieldDescription> : <FoundReportSelector id={`${idPrefix}-source`} value={selectedSource} disabled={disabled || submitting} onChange={(ticket, report) => { setSelectedSource(ticket); if (report) { if (!itemName.trim()) setItemName(report.title); if (!description.trim()) setDescription(report.description.slice(0, 2000)); if (!foundLocation.trim()) setFoundLocation(report.location) } }} />}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field className="space-y-1.5 sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-item-name`}>
            Nama barang <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id={`${idPrefix}-item-name`}
            maxLength={200}
            className="h-11 bg-background/70"
            placeholder="Contoh: Dompet kulit hitam"
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            disabled={submitting}
            required
          />
        </Field>

        <Field className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-found-location`}>Lokasi temuan (opsional)</FieldLabel>
          <Input
            id={`${idPrefix}-found-location`}
            maxLength={200}
            className="h-11 bg-background/70"
            placeholder="Contoh: Kantin Gedung A"
            value={foundLocation}
            onChange={(event) => setFoundLocation(event.target.value)}
            disabled={submitting}
          />
          <FieldDescription>Lokasi ditemukan, bukan tempat penyimpanan.</FieldDescription>
        </Field>

        <Field className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-founder-name`}>Nama penemu (opsional)</FieldLabel>
          <Input
            id={`${idPrefix}-founder-name`}
            maxLength={150}
            className="h-11 bg-background/70"
            placeholder="Nama orang yang menemukan barang"
            value={founderName}
            onChange={(event) => setFounderName(event.target.value)}
            disabled={submitting}
          />
        </Field>

        <Field className="space-y-1.5 sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-description`}>Deskripsi barang (opsional)</FieldLabel>
          <Textarea
            id={`${idPrefix}-description`}
            placeholder="Contoh: Payung biru dengan gagang kayu"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={submitting}
            rows={3}
            className="resize-none bg-background/70"
            maxLength={2000}
          />
          <FieldDescription>Sertakan ciri barang untuk membantu pencocokan.</FieldDescription>
        </Field>
      </div>

      {/* Full-width Photo Upload underneath */}
      <div className="w-full pt-1">
        <ItemPhotoField
          idPrefix={idPrefix}
          photo={photo}
          disabled={submitting || disabled}
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-4">
        {onBack ? (
          <Button type="button" variant="outline" disabled={submitting} onClick={onBack}>
            Kembali
          </Button>
        ) : onCancel ? (
          <Button
            type="button"
            variant="outline"
            disabled={submitting}
            onClick={() => {
              resetForm()
              onCancel()
            }}
          >
            Batal
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="gap-2">
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
              {submitLabel || "Simpan ke Inventaris"}
            </>
          )}
        </Button>
      </div>
    </fieldset></form>
  )
}
