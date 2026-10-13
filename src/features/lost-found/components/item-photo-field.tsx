"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Link2, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AttachmentLinkField } from "@/features/reports/components/attachment-link-field"

const maxPhotoBytes = 5 * 1024 * 1024

/** Holds one optional photo (device upload or fetched link) and owns its preview URL lifecycle. */
export function useItemPhoto() {
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [error, setError] = useState("")

  // Revokes the previous blob URL whenever it is replaced, removed, or the form unmounts.
  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  function select(next: File) {
    if (!next.type.startsWith("image/")) {
      setError("File harus berupa foto JPG atau PNG.")
      return
    }
    if (next.size > maxPhotoBytes) {
      setError("Ukuran foto maksimal 5 MB.")
      return
    }
    setError("")
    setFile(next)
    setPreviewUrl(URL.createObjectURL(next))
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
  description,
}: {
  idPrefix: string
  photo: ItemPhoto
  disabled?: boolean
  description: string
}) {
  return (
    <Field className="flex w-full flex-col space-y-2">
      <FieldLabel>Foto Barang (Opsional)</FieldLabel>

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
            className="absolute right-3 top-3 gap-1 shadow-md"
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
            <label
              htmlFor={`${idPrefix}-photo-file`}
              className="flex h-40 cursor-pointer flex-col items-center justify-center gap-2.5 rounded-xl border border-dashed border-border/80 bg-muted/20 p-5 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 sm:h-44"
            >
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <UploadCloud className="size-5" aria-hidden="true" />
              </div>
              <div className="space-y-1">
                <p className="text-xs font-semibold text-foreground">Pilih foto dari perangkat</p>
                <p className="text-[11px] text-muted-foreground">Format JPG atau PNG (Maksimal 5 MB)</p>
              </div>
              <input
                id={`${idPrefix}-photo-file`}
                type="file"
                accept="image/jpeg,image/png"
                className="sr-only"
                disabled={disabled}
                onChange={(event) => {
                  const selected = event.target.files?.[0]
                  if (selected) photo.select(selected)
                  event.target.value = ""
                }}
              />
            </label>
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
      <FieldDescription>{description}</FieldDescription>
    </Field>
  )
}
