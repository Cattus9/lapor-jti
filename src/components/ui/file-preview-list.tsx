"use client"

import * as React from "react"
import { FileText, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const previewUrls = new WeakMap<File, string>()

function getPreviewUrl(file: File) {
  const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp|gif)$/i.test(file.name)
  if (!isImage) return ""
  let url = previewUrls.get(file)
  if (!url) {
    try {
      url = URL.createObjectURL(file)
      previewUrls.set(file, url)
    } catch {
      url = ""
    }
  }
  return url
}

function releasePreviewUrl(file: File) {
  const url = previewUrls.get(file)
  if (url) {
    URL.revokeObjectURL(url)
    previewUrls.delete(file)
  }
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function PreviewItem({ file, onRemove }: { file: File; onRemove: () => void }) {
  const [loadFailed, setLoadFailed] = React.useState(false)
  const url = getPreviewUrl(file)

  return (
    <div className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2">
      <span className="relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted text-muted-foreground">
        {url && !loadFailed ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={`Pratinjau ${file.name}`}
            className="size-full object-cover"
            onError={() => setLoadFailed(true)}
          />
        ) : (
          <FileText className="size-4" aria-hidden="true" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{file.name}</p>
        <p className="text-xs text-muted-foreground">{formatSize(file.size)}</p>
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon-sm"
        aria-label={`Hapus ${file.name}`}
        onClick={onRemove}
      >
        <X className="size-4" />
      </Button>
    </div>
  )
}

export function FilePreviewList({ files, onRemove, title }: { files: File[]; onRemove: (file: File) => void; title?: string }) {
  if (!files.length) return null
  return (
    <div className="space-y-2" aria-live="polite">
      {title ? <p className="text-xs font-medium text-muted-foreground">{title} ({files.length})</p> : null}
      {files.map((file) => (
        <PreviewItem
          key={`${file.name}-${file.size}-${file.lastModified}`}
          file={file}
          onRemove={() => {
            releasePreviewUrl(file)
            onRemove(file)
          }}
        />
      ))}
    </div>
  )
}
