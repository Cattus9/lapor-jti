"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import type { SatpamLostFoundReport } from "../types"

export function SatpamExceptionAction({ report, matchId, onSaved }: { report?: SatpamLostFoundReport; matchId?: string; onSaved: () => void }) {
  const router = useRouter()
  const [open, setOpen] = useState(false), [reason, setReason] = useState("withdrawn"), [note, setNote] = useState("")
  const [pending, setPending] = useState(false), [error, setError] = useState("")
  const busy = useRef(false)
  if (!matchId && (!report || report.inventoryId || !["Baru", "Diproses"].includes(report.status))) return null
  const options = [...(report?.kind === "kehilangan" ? [{ value: "self_found", label: "Barang ditemukan sendiri oleh pemilik" }] : []), { value: "withdrawn", label: "Laporan ditarik pelapor" }, { value: "duplicate", label: "Laporan duplikat" }]
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (busy.current || !note.trim()) return
    busy.current = true; setPending(true); setError("")
    try {
      const body = matchId ? { type: "cancel-match", matchId, note: note.trim() } : { type: "close", ticket: report!.ticket, expectedStatus: report!.status === "Baru" ? "baru" : "diproses", reason, note: note.trim() }
      const response = await fetch("/api/satpam/reports", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Perubahan belum terkonfirmasi. Muat ulang status sebelum mencoba lagi.")
      setOpen(false); setNote(""); onSaved(); router.refresh()
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Perubahan belum terkonfirmasi.") }
    finally { busy.current = false; setPending(false) }
  }
  return <>
    <Button type="button" variant="soft" size="sm" aria-haspopup="dialog" onClick={() => setOpen(true)}>{matchId ? "Batalkan kecocokan" : "Tutup laporan khusus"}</Button>
    <Dialog open={open} onOpenChange={value => { if (!pending) setOpen(value) }}><DialogContent>
      <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><DialogTitle>{matchId ? "Batalkan kecocokan?" : "Tutup laporan tanpa penyerahan"}</DialogTitle><DialogDescription className="mt-2">{matchId ? "Kedua laporan kembali Diproses dan dapat dicocokkan ulang. Alasan tetap tersimpan." : "Gunakan untuk laporan yang tidak perlu dilanjutkan. Tidak mencatat pengambilan barang di pos."}</DialogDescription></div>
      <form className="space-y-4 p-5 md:p-6" onSubmit={submit}>
        {!matchId ? <Field><FieldLabel htmlFor={`closure-reason-${report?.id}`}>Alasan penutupan</FieldLabel><Select items={options} value={reason} disabled={pending} onValueChange={value => setReason(value ?? "withdrawn")}><SelectTrigger id={`closure-reason-${report?.id}`} className="w-full bg-background"><SelectValue /></SelectTrigger><SelectContent>{options.map(option => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent></Select></Field> : null}
        <Field><FieldLabel htmlFor={`exception-note-${matchId ?? report?.id}`}>Catatan konfirmasi</FieldLabel><Textarea id={`exception-note-${matchId ?? report?.id}`} required maxLength={2000} value={note} disabled={pending} onChange={event => setNote(event.target.value)} className="bg-background/70" placeholder="Jelaskan alasan dan hasil konfirmasi dengan pelapor." /><FieldDescription>Catatan dapat dilihat pada riwayat laporan.</FieldDescription></Field>
        {error ? <FieldError>{error}</FieldError> : null}
        <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setOpen(false)}>Kembali</Button><Button type="submit" disabled={pending || !note.trim()}>{pending ? "Menyimpan…" : matchId ? "Konfirmasi pembatalan" : "Konfirmasi penutupan"}</Button></div>
      </form>
    </DialogContent></Dialog>
  </>
}
