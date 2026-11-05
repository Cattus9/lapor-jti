"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Link2, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldError, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttachmentLinkField } from "@/features/reports/components/attachment-link-field"
import { FileDropzone } from "@/components/ui/file-dropzone"

const maxPhotoBytes = 5 * 1024 * 1024

/** Holds one optional photo (device upload or fetched link) and owns its preview URL lifecycle. */
export function useItemPhoto(initialFile?: File | null) {
  const [file, setFile] = useState<File | null>(initialFile ?? null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!file) return
    const nextUrl = URL.createObjectURL(file)
    let active = true
    // Create the URL in the effect so a Strict Mode cleanup cannot revoke the active preview.
    queueMicrotask(() => { if (active) setPreviewUrl(nextUrl) })
    return () => { active = false; URL.revokeObjectURL(nextUrl) }
  }, [file])

  function select(next: File) {
    if (!["image/jpeg", "image/png"].includes(next.type)) {
      setError("File harus berupa foto JPG atau PNG.")
      return
    }
    if (next.size === 0) {
      setError("Foto tidak boleh kosong.")
      return
    }
    if (next.size > maxPhotoBytes) {
      setError("Ukuran foto maksimal 5 MB.")
      return
    }
    setError("")
    if (next !== file) setPreviewUrl(null)
    setFile(next)
  }

  function remove() {
    setFile(null)
    setPreviewUrl(null)
    setError("")
  }

  return { file, previewUrl, error, select, remove }
}

export type ItemPhoto = ReturnType<typeof useItemPhoto>

export function ItemPhotoField({
  idPrefix,
  photo,
  disabled,
}: {
  idPrefix: string
  photo: ItemPhoto
  disabled?: boolean
}) {
  return (
    <Field className="flex w-full flex-col space-y-2">
      <FieldLabel>Foto barang (opsional)</FieldLabel>

      {photo.previewUrl ? (
        <div className="relative h-56 w-full overflow-hidden rounded-xl border border-border bg-muted/60 p-2 shadow-2xs sm:h-64">
          <Image
            src={photo.previewUrl}
            alt="Pratinjau foto barang"
            fill
            className="object-contain"
            unoptimized
          />
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={photo.remove}
            disabled={disabled}
            className="absolute right-3 top-3 gap-1"
          >
            <X className="size-3" aria-hidden="true" />
            Hapus Foto
          </Button>
        </div>
      ) : (
        <Tabs defaultValue="upload" className="w-full space-y-2">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload" className="gap-2 text-xs">
              <UploadCloud className="size-3.5" aria-hidden="true" />
              Unggah File
            </TabsTrigger>
            <TabsTrigger value="link" className="gap-2 text-xs">
              <Link2 className="size-3.5" aria-hidden="true" />
              Tautan Foto
            </TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="pt-1">
            <FileDropzone id={`${idPrefix}-photo-file`} value={[]} onChange={files => { if (files[0]) photo.select(files[0]) }} accept="image/jpeg,image/png" maxFiles={1} maxSizeMb={5} disabled={disabled} description="JPG atau PNG, maksimal 5 MB. Foto disimpan sebagai lampiran privat." />
          </TabsContent>

          <TabsContent value="link" className="space-y-2 pt-1">
            <AttachmentLinkField
              id={`${idPrefix}-photo-link`}
              disabled={disabled}
              remaining={1}
              onAdd={(linked) => photo.select(linked)}
            />
          </TabsContent>
        </Tabs>
      )}

      {photo.error ? <FieldError>{photo.error}</FieldError> : null}
    </Field>
  )
}
