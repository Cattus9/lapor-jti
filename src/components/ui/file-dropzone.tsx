"use client"

import * as React from "react"
import { UploadCloud } from "lucide-react"
import { FilePreviewList } from "@/components/ui/file-preview-list"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { cn } from "cn"

const DEFAULT_ACCEPT = "image/jpeg,image/png,image/jpg,.jpg,.jpeg,.png,.pdf,application/pdf,image/*"

export function FileDropzone({
  id,
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  maxFiles = 4,
  maxSizeMb = 5,
  disabled = false,
  description,
}: {
  id: string
  value: File[]
  onChange: (files: File[]) => void
  accept?: string | string[]
  maxFiles?: number
  maxSizeMb?: number
  disabled?: boolean
  description?: React.ReactNode
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState("")

  const acceptString = Array.isArray(accept) ? accept.join(",") : accept

  function addFiles(incoming: File[]) {
    if (disabled) return
    setError("")
    const validFiles = incoming
      .map((file) => {
        let type = file.type.toLowerCase()
        const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
        if (!type || type === "image/jpg") {
          if (ext === "jpg" || ext === "jpeg") type = "image/jpeg"
          else if (ext === "png") type = "image/png"
          else if (ext === "pdf") type = "application/pdf"
        }
        return type !== file.type ? new File([file], file.name, { type }) : file
      })
      .filter((file) => {
        const type = file.type.toLowerCase()
        const ext = file.name.split(".").pop()?.toLowerCase() ?? ""
        const isAllowed =
          ["image/jpeg", "image/png", "application/pdf"].includes(type) ||
          ["jpg", "jpeg", "png", "pdf"].includes(ext)
        if (!isAllowed) {
          setError("Gunakan file JPG, PNG, atau PDF.")
          return false
        }
        if (file.size > maxSizeMb * 1024 * 1024) {
          setError(`Ukuran ${file.name} melebihi ${maxSizeMb} MB.`)
          return false
        }
        return true
      })

    const nextFiles = [...value, ...validFiles].filter(
      (file, index, files) =>
        files.findIndex((item) => item.name === file.name && item.size === file.size) === index
    )
    if (nextFiles.length > maxFiles) {
      setError(`Maksimal ${maxFiles} file dapat dilampirkan.`)
    }
    onChange(nextFiles.slice(0, maxFiles))
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        id={id}
        name={id}
        type="file"
        disabled={disabled}
        accept={acceptString}
        multiple
        className="sr-only"
        tabIndex={-1}
        onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []))
          event.currentTarget.value = ""
        }}
      />
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-disabled={disabled}
        aria-controls={id}
        onClick={() => { if (!disabled) inputRef.current?.click() }}
        onKeyDown={(event) => {
          if (!disabled && (event.key === "Enter" || event.key === " ")) {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault()
          setIsDragging(false)
          addFiles(Array.from(event.dataTransfer.files))
        }}
        className={cn(
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-5 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 aria-disabled:cursor-default aria-disabled:opacity-50",
          isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20"
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-2xs">
          <UploadCloud className="size-5" aria-hidden="true" />
        </span>
        <span className="text-sm font-medium text-foreground">Tarik dan lepaskan file di sini</span>
        <span className="text-xs text-muted-foreground/70">atau ketuk di sini untuk memilih dari perangkat</span>
      </div>
      <FieldDescription>{description ?? <>JPG, PNG, atau PDF · Maksimal {maxFiles} file tambahan · {maxSizeMb} MB per file</>}</FieldDescription>
      {error ? <FieldError>{error}</FieldError> : null}
      <FilePreviewList files={value} onRemove={(file) => { if (!disabled) onChange(value.filter((item) => item !== file)) }} />
    </div>
  )
}
