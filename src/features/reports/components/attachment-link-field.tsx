"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { Check, Link2, Loader2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FieldDescription, FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"

const allowedTypes: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png" }
const maxBytes = 5 * 1024 * 1024

function fileNameFromUrl(url: URL, extension: string) {
  const last = decodeURIComponent(url.pathname.split("/").filter(Boolean).pop() ?? "").replace(/[\x00-\x1f\x7f]/g, "")
  const base = (last || "foto-dari-tautan").replace(/\.[a-z0-9]{2,5}$/i, "").slice(0, 80) || "foto-dari-tautan"
  return `${base}.${extension}`
}

export function AttachmentLinkField({ id, disabled, remaining, onAdd }: { id: string; disabled?: boolean; remaining: number; onAdd: (file: File) => void }) {
  const [value, setValue] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState<{ file: File; url: string } | null>(null)

  // Preview blob URLs are owned by this component and released when replaced or unmounted.
  useEffect(() => () => { if (fetched) URL.revokeObjectURL(fetched.url) }, [fetched])

  async function loadFromLink() {
    setError(""); setFetched(null)
    let url: URL
    try { url = new URL(value.trim()) } catch { setError("Masukkan tautan lengkap, contoh: https://contoh.com/foto.jpg"); return }
    if (url.protocol !== "https:" && url.protocol !== "http:") { setError("Tautan harus diawali http:// atau https://."); return }
    if (remaining <= 0) { setError("Batas lampiran sudah tercapai."); return }
    setLoading(true)
    try {
      const response = await fetch(url.toString(), { credentials: "omit", referrerPolicy: "no-referrer" })
      if (!response.ok) throw new Error("status")
      const blob = await response.blob()
      const type = blob.type.split(";")[0]
      const extension = allowedTypes[type]
      if (!extension) { setError("Tautan harus mengarah langsung ke foto JPG atau PNG."); return }
      if (blob.size === 0 || blob.size > maxBytes) { setError("Ukuran foto maksimal 5 MB."); return }
      const file = new File([blob], fileNameFromUrl(url, extension), { type })
      setFetched({ file, url: URL.createObjectURL(file) })
    } catch {
      setError("Foto tidak dapat diambil dari tautan ini. Pastikan tautan publik dan mengarah langsung ke foto, atau unduh lalu unggah dari perangkat.")
    } finally { setLoading(false) }
  }

  function attach() {
    if (!fetched) return
    onAdd(fetched.file)
    setFetched(null); setValue("")
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input id={id} type="url" inputMode="url" value={value} disabled={disabled || loading} onChange={(event) => { setValue(event.target.value); setFetched(null) }} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); if (fetched) attach(); else void loadFromLink() } }} placeholder="https://contoh.com/foto.jpg" aria-label="Tautan foto" aria-invalid={Boolean(error)} className="h-11 bg-background/70" />
        {fetched ? (
          <div className="flex shrink-0 gap-2">
            <Button type="button" variant="ghost" className="h-11" onClick={() => setFetched(null)}><X aria-hidden="true" />Batal</Button>
            <Button type="button" className="h-11" disabled={disabled} onClick={attach}><Check aria-hidden="true" />Tambahkan lampiran</Button>
          </div>
        ) : (
          <Button type="button" variant="outline" className="h-11" disabled={disabled || loading || !value.trim()} onClick={() => void loadFromLink()}>
            {loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Link2 aria-hidden="true" />}{loading ? "Mengambil..." : "Pratinjau foto"}
          </Button>
        )}
      </div>
      <FieldDescription>Tempel tautan langsung ke foto JPG atau PNG, lalu periksa pratinjaunya sebelum dilampirkan.</FieldDescription>
      {error ? <FieldError>{error}</FieldError> : null}
      {fetched ? (
        <div className="space-y-3 rounded-xl border border-border bg-card p-3" aria-live="polite">
          <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-border bg-muted">
            <Image src={fetched.url} alt={`Pratinjau ${fetched.file.name}`} fill sizes="(min-width: 768px) 40rem, 100vw" className="object-contain" unoptimized />
          </div>
          <p className="min-w-0 truncate text-sm font-medium text-foreground">{fetched.file.name}<span className="ml-2 text-xs font-normal text-muted-foreground">{(fetched.file.size / 1024 / 1024).toFixed(1)} MB</span></p>
          <p className="text-xs font-medium text-destructive">Belum dilampirkan. Klik Tambahkan lampiran agar foto ikut terkirim.</p>
        </div>
      ) : null}
    </div>
  )
}
