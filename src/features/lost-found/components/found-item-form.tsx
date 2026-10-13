"use client"

import { useState } from "react"
import { ArrowRight, Check, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import type { InventoryItem } from "../domain/inventory"
import { ItemPhotoField, useItemPhoto } from "./item-photo-field"

export type FoundFormData = {
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
  submitLabel,
}: {
  idPrefix: string
  initialData?: Partial<FoundFormData>
  onSuccess?: (item: InventoryItem) => void
  onProceedToReview?: (data: FoundFormData) => void
  onCancel?: () => void
  submitLabel?: string
}) {
  const [itemName, setItemName] = useState(initialData?.itemName ?? "")
  const [description, setDescription] = useState(initialData?.description ?? "")
  const [foundLocation, setFoundLocation] = useState(initialData?.foundLocation ?? "")
  const [founderName, setFounderName] = useState(initialData?.founderName ?? "")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const photo = useItemPhoto()

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!itemName.trim()) {
      setError("Nama barang wajib diisi.")
      return
    }

    if (onProceedToReview) {
      setError("")
      onProceedToReview({
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
      formData.set("itemName", itemName.trim())
      if (description.trim()) formData.set("description", description.trim())
      if (foundLocation.trim()) formData.set("foundLocation", foundLocation.trim())
      if (founderName.trim()) formData.set("founderName", founderName.trim())
      if (photo.file) formData.set("photo", photo.file)

      const response = await fetch("/api/satpam/inventory", { method: "POST", body: formData })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Gagal menyimpan barang inventaris.")

      onSuccess?.(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat menyimpan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error ? <FieldError>{error}</FieldError> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Field className="space-y-1.5 sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-item-name`}>
            Nama Barang <span className="text-destructive">*</span>
          </FieldLabel>
          <Input
            id={`${idPrefix}-item-name`}
            placeholder="Contoh: Dompet Hitam Kulit, Kunci Motor..."
            value={itemName}
            onChange={(event) => setItemName(event.target.value)}
            disabled={submitting}
            required
          />
          <FieldDescription>Nama atau sebutan barang temuan yang mudah dikenali oleh pemilik.</FieldDescription>
        </Field>

        <Field className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-found-location`}>Lokasi Temuan (Opsional)</FieldLabel>
          <Input
            id={`${idPrefix}-found-location`}
            placeholder="Contoh: Kantin Gedung A, Parkiran Motor..."
            value={foundLocation}
            onChange={(event) => setFoundLocation(event.target.value)}
            disabled={submitting}
          />
          <FieldDescription>Tempat barang ditemukan, bukan tempat penyimpanannya.</FieldDescription>
        </Field>

        <Field className="space-y-1.5">
          <FieldLabel htmlFor={`${idPrefix}-founder-name`}>Nama Penemu (Opsional)</FieldLabel>
          <Input
            id={`${idPrefix}-founder-name`}
            placeholder="Nama orang yang menyerahkan barang..."
            value={founderName}
            onChange={(event) => setFounderName(event.target.value)}
            disabled={submitting}
          />
          <FieldDescription>Dapat dikosongkan jika penemu tidak menyebutkan identitas (anonim).</FieldDescription>
        </Field>

        <Field className="space-y-1.5 sm:col-span-2">
          <FieldLabel htmlFor={`${idPrefix}-description`}>Deskripsi &amp; Ciri-Ciri (Opsional)</FieldLabel>
          <Textarea
            id={`${idPrefix}-description`}
            placeholder="Warna, merk, kondisi, atau ciri khusus..."
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            disabled={submitting}
            rows={3}
            className="resize-none"
          />
          <FieldDescription>Catatan ciri khusus untuk memudahkan verifikasi saat ada yang menanyakan.</FieldDescription>
        </Field>
      </div>

      {/* Full-width Photo Upload underneath */}
      <div className="w-full pt-1">
        <ItemPhotoField
          idPrefix={idPrefix}
          photo={photo}
          disabled={submitting}
          description="Foto barang mempermudah pencocokan saat pemilik mencari barangnya."
        />
      </div>

      <div className="flex items-center justify-end gap-2.5 border-t border-border/60 pt-4">
        {onCancel ? (
          <Button type="button" variant="outline" disabled={submitting} onClick={onCancel}>
            Batal
          </Button>
        ) : null}
        <Button type="submit" disabled={submitting} className="min-w-[150px] gap-2">
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
    </form>
  )
}
