"use client"

import { useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { FoundReportSelector } from "./found-report-selector"
import type { InventoryItem } from "../domain/inventory"

export function InventoryCorrectionDialog({ item, onClose, onSaved }: { item: InventoryItem; onClose: () => void; onSaved: (item: InventoryItem) => void }) {
  const [fields, setFields] = useState({ itemName: item.itemName, description: item.description, founderName: item.founderName ?? "", foundLocation: item.foundLocation ?? "", storageLocation: item.storageLocation, sourceFoundTicket: item.sourceFoundTicket ?? "", reason: "" })
  const [pending, setPending] = useState(false), [error, setError] = useState("")
  const busy = useRef(false)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy.current || !item.version) return
    busy.current = true; setPending(true); setError("")
    try {
      const response = await fetch(`/api/satpam/inventory/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...fields, version: item.version }) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Koreksi belum terkonfirmasi. Muat ulang detail barang.")
      onSaved(result); onClose()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Koreksi belum terkonfirmasi.") }
    finally { busy.current = false; setPending(false) }
  }
  return <Dialog open onOpenChange={open => { if (!open && !pending) onClose() }}><DialogContent>
    <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><DialogTitle>Koreksi informasi barang</DialogTitle><DialogDescription className="mt-2">Perbaiki pencatatan barang yang masih tersimpan di pos.</DialogDescription></div>
    <form onSubmit={submit} className="space-y-4 p-5 md:p-6"><fieldset disabled={pending} className="space-y-4">
      {([{ key: "itemName", label: "Nama barang", max: 200, required: true }, { key: "founderName", label: "Nama penemu (opsional)", max: 150 }, { key: "foundLocation", label: "Lokasi temuan (opsional)", max: 200 }, { key: "storageLocation", label: "Lokasi simpan", max: 200, required: true }] as const).map(field => <Field key={field.key}><FieldLabel htmlFor={`correct-${field.key}`}>{field.label}</FieldLabel><Input id={`correct-${field.key}`} value={fields[field.key]} maxLength={field.max} required={"required" in field && field.required} onChange={event => setFields(previous => ({ ...previous, [field.key]: event.target.value }))} className="h-11 bg-background/70" placeholder={field.key === "itemName" ? "Contoh: Dompet hitam" : field.key === "founderName" ? "Nama orang yang menemukan barang" : field.key === "foundLocation" ? "Contoh: Kantin Gedung A" : "Contoh: Lemari titipan Pos Satpam"} /></Field>)}
      <Field><FieldLabel htmlFor="correct-description">Deskripsi barang</FieldLabel><Textarea id="correct-description" value={fields.description} maxLength={2000} onChange={event => setFields(previous => ({ ...previous, description: event.target.value }))} className="bg-background/70" /><FieldDescription>{fields.sourceFoundTicket ? "Deskripsi laporan Temuan asal dapat dilihat pengguna Pelapor." : "Deskripsi dapat dilihat pengguna Pelapor. Hindari data pribadi."}</FieldDescription></Field>
      {!item.sourceFoundTicket ? <FoundReportSelector id="correct-source" value={fields.sourceFoundTicket} onChange={value => setFields(previous => ({ ...previous, sourceFoundTicket: value }))} /> : null}
      <Field><FieldLabel htmlFor="correct-reason">Alasan koreksi</FieldLabel><Textarea id="correct-reason" value={fields.reason} required maxLength={2000} onChange={event => setFields(previous => ({ ...previous, reason: event.target.value }))} className="bg-background/70" /><FieldDescription>Informasi sebelumnya dan alasan ini disimpan dalam catatan perubahan.</FieldDescription></Field>
    </fieldset>{error ? <FieldError>{error}</FieldError> : null}<div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Batal</Button><Button type="submit" disabled={pending || !item.version || !fields.reason.trim()}>Simpan koreksi</Button></div></form>
  </DialogContent></Dialog>
}
