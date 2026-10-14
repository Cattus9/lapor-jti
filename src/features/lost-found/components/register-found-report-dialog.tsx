"use client"

import { useState } from "react"
import { Check, Loader2, PackagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { ItemPhotoField, useItemPhoto } from "./item-photo-field"
import type { FoundReport } from "../domain/found-report"

export function RegisterFoundReportDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (report: FoundReport) => void
}) {
  const [itemName, setItemName] = useState("")
  const [location, setLocation] = useState("")
  const [founderName, setFounderName] = useState("")
  const [description, setDescription] = useState("")
  const [status, setStatus] = useState<"diproses" | "baru">("diproses")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const photo = useItemPhoto()

  // Default date and time in WIB
  const now = new Date()
  const defaultDate = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now)
  const defaultTime = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
  }).format(now)

  const [incidentDate, setIncidentDate] = useState(defaultDate)
  const [incidentTime, setIncidentTime] = useState(defaultTime)

  function resetForm() {
    setItemName("")
    setLocation("")
    setFounderName("")
    setDescription("")
    setStatus("diproses")
    setError("")
    photo.remove()
  }


  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!itemName.trim()) {
      setError("Nama barang temuan wajib diisi.")
      return
    }
    if (!description.trim()) {
      setError("Ciri-ciri dan detail kronologi temuan wajib diisi.")
      return
    }

    setSubmitting(true)
    setError("")

    try {
      const formData = new FormData()
      formData.set("itemName", itemName.trim())
      formData.set("title", `Temuan ${itemName.trim()}`)
      if (location.trim()) formData.set("location", location.trim())
      if (incidentDate) formData.set("incidentDate", incidentDate)
      if (incidentTime) formData.set("incidentTime", incidentTime)
      if (founderName.trim()) formData.set("founderName", founderName.trim())
      formData.set("description", description.trim())
      formData.set("characteristics", description.trim().slice(0, 2000))
      formData.set("status", status)
      if (photo.file) formData.set("photo", photo.file)

      const response = await fetch("/api/satpam/found-reports", {
        method: "POST",
        body: formData,
      })
      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Gagal mencatat laporan temuan.")

      onSuccess(data)
      resetForm()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses laporan.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) resetForm()
        onOpenChange(nextOpen)
      }}
    >
      <DialogContent className="max-w-2xl p-6 sm:p-7">
        <DialogHeader className="pr-12 md:pr-14 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary shadow-2xs">
              <PackagePlus className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Catat Laporan Temuan Baru
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Catat barang temuan ke dalam daftar laporan temuan untuk dicocokkan dengan laporan kehilangan.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5 pt-2">
          {error ? <FieldError>{error}</FieldError> : null}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field className="space-y-1.5 sm:col-span-2">
              <FieldLabel htmlFor="found-item-name">
                Nama Barang <span className="text-destructive">*</span>
              </FieldLabel>
              <Input
                id="found-item-name"
                placeholder="Contoh: Kunci Motor Honda Beat, Dompet Hitam..."
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                disabled={submitting}
                maxLength={200}
                required
              />
              <FieldDescription>
                Sebutkan jenis dan merek barang yang ditemukan secara ringkas.
              </FieldDescription>
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="found-location">Lokasi Penemuan</FieldLabel>
              <Input
                id="found-location"
                placeholder="Contoh: Gedung TI Lt. 2, Kantin..."
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                disabled={submitting}
                maxLength={200}
              />
              <FieldDescription>
                Area atau ruangan di mana barang ditemukan.
              </FieldDescription>
            </Field>

            <Field className="space-y-1.5">
              <FieldLabel htmlFor="founder-name">Nama Penemu (Opsional)</FieldLabel>
              <Input
                id="founder-name"
                placeholder="Contoh: Budi Santoso / Mahasiswa..."
                value={founderName}
                onChange={(e) => setFounderName(e.target.value)}
                disabled={submitting}
                maxLength={150}
              />
              <FieldDescription>
                Nama civitas yang menyerahkan barang temuan.
              </FieldDescription>
            </Field>

            <div className="grid grid-cols-2 gap-2">
              <Field className="space-y-1.5">
                <FieldLabel htmlFor="found-date">Tanggal Temuan</FieldLabel>
                <Input
                  id="found-date"
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  disabled={submitting}
                />
                <FieldDescription>Tanggal temuan.</FieldDescription>
              </Field>

              <Field className="space-y-1.5">
                <FieldLabel htmlFor="found-time">Waktu Temuan</FieldLabel>
                <Input
                  id="found-time"
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  disabled={submitting}
                />
                <FieldDescription>Waktu temuan (WIB).</FieldDescription>
              </Field>
            </div>


            <Field className="space-y-1.5">
              <FieldLabel htmlFor="found-status">Status Awal</FieldLabel>
              <Select
                value={status}
                onValueChange={(val) => setStatus(val as "diproses" | "baru")}
                disabled={submitting}
              >
                <SelectTrigger id="found-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="diproses">
                    Diproses (Langsung siap dicocokkan)
                  </SelectItem>
                  <SelectItem value="baru">
                    Baru (Perlu verifikasi lanjutan)
                  </SelectItem>
                </SelectContent>
              </Select>
              <FieldDescription>
                Pilih Diproses agar langsung dapat dicocokkan dengan laporan kehilangan.
              </FieldDescription>
            </Field>

            <Field className="space-y-1.5 sm:col-span-2">
              <FieldLabel htmlFor="found-description">
                Ciri-ciri & Detail Barang <span className="text-destructive">*</span>
              </FieldLabel>
              <Textarea
                id="found-description"
                placeholder="Jelaskan warna, stiker, gantungan kunci, isi dompet, atau tanda khusus lainnya..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
                disabled={submitting}
                maxLength={5000}
                required
              />
              <FieldDescription>
                Informasi detail untuk memvalidasi kepemilikan saat pencocokan.
              </FieldDescription>
            </Field>

            <div className="sm:col-span-2">
              <ItemPhotoField
                idPrefix="found-reg"
                photo={photo}
                disabled={submitting}
                description="Unggah foto barang temuan (JPG/PNG maks 5MB) untuk mempermudah identifikasi."
              />
            </div>

          </div>

          <div className="flex flex-col-reverse justify-end gap-2 pt-2 border-t border-border/60 sm:flex-row">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              Batal
            </Button>
            <Button type="submit" disabled={submitting} className="gap-2">
              {submitting ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden="true" />
                  Menyimpan...
                </>
              ) : (
                <>
                  <Check className="size-4" aria-hidden="true" />
                  Simpan Laporan Temuan
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
