"use client"

import * as React from "react"
import { FileText, UploadCloud, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "cn"

const DEFAULT_ACCEPT = ["image/jpeg", "image/png", "application/pdf"]

function formatFileSize(bytes: number) {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function FileDropzone({
  id,
  value,
  onChange,
  accept = DEFAULT_ACCEPT,
  maxFiles = 4,
  maxSizeMb = 5,
}: {
  id: string
  value: File[]
  onChange: (files: File[]) => void
  accept?: string[]
  maxFiles?: number
  maxSizeMb?: number
}) {
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [error, setError] = React.useState("")

  function addFiles(incoming: File[]) {
    setError("")
    const validFiles = incoming.filter((file) => {
      if (!accept.includes(file.type)) {
        setError("Gunakan file JPG, PNG, atau PDF.")
        return false
      }
      if (file.size > maxSizeMb * 1024 * 1024) {
        setError(`Ukuran ${file.name} melebihi ${maxSizeMb} MB.`)
        return false
      }
      return true
    })
    const nextFiles = [...value, ...validFiles].filter((file, index, files) => files.findIndex((item) => item.name === file.name && item.size === file.size) === index)
    if (nextFiles.length > maxFiles) {
      setError(`Maksimal ${maxFiles} file dapat dilampirkan.`)
    }
    onChange(nextFiles.slice(0, maxFiles))
  }

  return (
    <div className="space-y-3">
      <label
        htmlFor={id}
        onDragOver={(event) => { event.preventDefault(); setIsDragging(true) }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => { event.preventDefault(); setIsDragging(false); addFiles(Array.from(event.dataTransfer.files)) }}
        className={cn(
          "flex min-h-36 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-background/60 px-5 py-6 text-center transition-colors hover:border-primary/50 hover:bg-muted/40",
          isDragging && "border-primary bg-primary/5 ring-2 ring-primary/20"
        )}
      >
        <span className="flex size-10 items-center justify-center rounded-xl border border-border bg-card text-primary shadow-2xs"><UploadCloud className="size-5" aria-hidden="true" /></span>
        <span className="text-sm font-medium text-foreground">Tarik dan lepaskan file di sini</span>
        <span className="text-xs text-muted-foreground/70">atau klik untuk memilih dari perangkat</span>
        <Input ref={inputRef} id={id} name={id} type="file" accept={accept.join(",")} multiple className="sr-only" onChange={(event) => { addFiles(Array.from(event.target.files ?? [])); event.currentTarget.value = "" }} />
      </label>
      <p className="text-xs text-muted-foreground/70">JPG, PNG, atau PDF · Maksimal {maxFiles} file · {maxSizeMb} MB per file</p>
      {error ? <p className="text-sm text-destructive" role="alert">{error}</p> : null}
      {value.length > 0 ? <div className="space-y-2" aria-live="polite">{value.map((file) => <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2"><span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground"><FileText className="size-4" aria-hidden="true" /></span><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-foreground">{file.name}</p><p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p></div><Button type="button" variant="ghost" size="icon-sm" aria-label={`Hapus ${file.name}`} onClick={() => onChange(value.filter((item) => item !== file))}><X className="size-4" /></Button></div>)}</div> : null}
    </div>
  )
}
