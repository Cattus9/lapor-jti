"use client"

import { useEffect, useState, type ReactNode } from "react"
import { Search, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { resolveOperationsSnapshot, type OperationsResourceSnapshot } from "./operations-resource-state"

export function ConfigSelect({ id, descriptionId, label, value, onChange, options, disabled = false }: { id?: string; descriptionId?: string; label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[]; disabled?: boolean }) {
  return <Select value={value} items={options} disabled={disabled} onValueChange={(next) => onChange(next ?? "")}><SelectTrigger id={id} aria-label={label} aria-describedby={descriptionId} className="w-full bg-background"><SelectValue placeholder={label} /></SelectTrigger><SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select>
}
export function SearchField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <div className="relative min-w-0 flex-1"><Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" /><Input type="search" aria-label={label} placeholder={label} maxLength={100} value={value} onChange={(event) => onChange(event.target.value)} className="bg-background pl-9" /></div>
}
export function OperationsStatus({ loading, error, retry }: { loading: boolean; error: string; retry: () => void }) {
  if (!loading && !error) return null
  return <Card className="rounded-xl border py-0 shadow-none ring-0"><CardContent className="flex flex-wrap items-center gap-3 p-5" role="status">{error ? <><FieldError>{error}</FieldError><Button variant="outline" size="sm" onClick={retry}><RefreshCw />Coba lagi</Button></> : <p className="text-sm text-muted-foreground">Memuat data operasional...</p>}</CardContent></Card>
}
export function EmptyRows({ children }: { children: ReactNode }) {
  return <div className="rounded-xl border border-dashed bg-muted/20 px-5 py-8 text-center text-sm text-muted-foreground">{children}</div>
}
export function PageControls({ page, total, size, onChange, disabled = false }: { page: number; total: number; size: number; onChange: (page: number) => void; disabled?: boolean }) {
  const pages = Math.max(1, Math.ceil(total / size))
  return <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-xs text-muted-foreground"><span>{total ? `${(page - 1) * size + 1}-${Math.min(page * size, total)} dari ${total} data` : "0 data"}</span><div className="flex items-center gap-2"><Button variant="outline" size="icon-sm" aria-label="Halaman sebelumnya" disabled={disabled || page <= 1} onClick={() => onChange(page - 1)}><ChevronLeft /></Button><span>Halaman {page} / {pages}</span><Button variant="outline" size="icon-sm" aria-label="Halaman berikutnya" disabled={disabled || page >= pages} onClick={() => onChange(page + 1)}><ChevronRight /></Button></div></div>
}
export async function saveOperation(url: string, value: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(value) })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.ok) throw new Error(result?.error || "Perubahan belum dapat dipastikan tersimpan. Muat ulang sebelum mencoba lagi.")
  return result
}
export function useOperationsData<T>(url: string) {
  const [scope, setScope] = useState({ url, revision: 0 })
  const revision = scope.url === url ? scope.revision : scope.revision + 1
  if (scope.url !== url) setScope({ url, revision })
  const [result, setResult] = useState<OperationsResourceSnapshot<T>>({ key: "", url: "", error: "" })
  const key = `${url}${url.includes("?") ? "&" : "?"}revision=${revision}`
  useEffect(() => {
    const controller = new AbortController()
    fetch(key, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Data tidak dapat dimuat.")
      if (!controller.signal.aborted) setResult({ key, url, data, error: "" })
    }).catch((error: unknown) => { if (!controller.signal.aborted) setResult((previous) => ({ key, url, data: previous.url === url ? previous.data : undefined, error: error instanceof Error ? error.message : "Koneksi bermasalah." })) })
    return () => controller.abort()
  }, [key, url])
  // Preserve confirmed content on same-scope reloads so long settings pages do not
  // collapse and lose scroll context. Never show another filter's rows as current.
  return { ...resolveOperationsSnapshot(url, key, result), reload: () => setScope((value) => ({ url, revision: value.revision + 1 })) }
}
