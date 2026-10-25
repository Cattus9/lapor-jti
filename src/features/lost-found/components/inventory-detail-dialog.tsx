"use client"

import { useRef, useState } from "react"
import { InventoryPhoto } from "./inventory-photo"
import { CalendarDays, ClipboardCheck, FileText, Handshake, Images, MapPin, Package, UserRound } from "lucide-react"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportDetailSection, ReportDetailTable } from "@/components/reports/report-detail-section"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stepper } from "@/components/ui/stepper"
import { Textarea } from "@/components/ui/textarea"
import { useDebouncedSatpamQuery, useSatpamResource } from "./use-satpam-data"
import type { InventoryItem } from "../domain/inventory"
import type { SatpamLostFoundReport, SatpamPage, SatpamWorkspaceData } from "../types"

export function InventoryDetailDialog({ item: initialItem, open, onOpenChange, onUpdated, linkedLoss }: {
  item: InventoryItem; open: boolean; onOpenChange: (open: boolean) => void; onUpdated: (item: InventoryItem) => void
  linkedLoss?: { ticket: string; title: string }
}) {
  const [mode, setMode] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [officerId, setOfficerId] = useState("")
  const [evidence, setEvidence] = useState("")
  const [note, setNote] = useState("")
  const [selectedLoss, setSelectedLoss] = useState(linkedLoss)
  const [search, setSearch] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [revision, setRevision] = useState(0)
  const command = useRef<{ fingerprint: string; key: string } | null>(null)
  const query = useDebouncedSatpamQuery(search)
  const detail = useSatpamResource<InventoryItem>(open ? `/api/satpam/inventory/${initialItem.id}?rev=${revision}` : undefined)
  const item = detail.data ?? initialItem
  const workspace = useSatpamResource<SatpamWorkspaceData>(open && mode ? "/api/satpam/workspace" : undefined)
  const candidates = useSatpamResource<SatpamPage<SatpamLostFoundReport>>(open && mode && !linkedLoss ? `/api/satpam/reports?kind=kehilangan&matching=1&q=${encodeURIComponent(query)}` : undefined)
  const isStored = item.status === "tersimpan"
  const unavailable = pending || detail.loading || Boolean(detail.error)
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (unavailable) return
    const payload = { recipient: recipient.trim(), officerId, ownershipEvidence: evidence.trim(), note: note.trim(), lossTicket: selectedLoss?.ticket }
    const fingerprint = JSON.stringify(payload)
    if (!command.current || command.current.fingerprint !== fingerprint) command.current = { fingerprint, key: crypto.randomUUID() }
    setPending(true); setError("")
    try {
      const response = await fetch(`/api/satpam/inventory/${item.id}/handover`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...payload, submissionKey: command.current.key }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Penyerahan belum berhasil.")
      setMode(false); setRevision(value => value + 1); onUpdated(data)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Penyerahan belum berhasil.") }
    finally { setPending(false) }
  }
  const confirmation = <Dialog open={mode} onOpenChange={value => { if (!pending) setMode(value) }}><DialogContent>
    <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><DialogTitle>Penyerahan {item.itemName}</DialogTitle><DialogDescription className="mt-2">Konfirmasi setelah kepemilikan diperiksa dan barang diterima pemilik.</DialogDescription></div>
    <div className="p-5 md:p-6"><form onSubmit={submit} className="space-y-4" aria-label="Konfirmasi penyerahan Inventaris">
      <p className="text-sm font-medium">Konfirmasi penyerahan</p>
      <FieldError>{error || workspace.error}</FieldError>
      <Field><FieldLabel htmlFor="inventory-recipient">Nama penerima</FieldLabel><Input id="inventory-recipient" value={recipient} maxLength={150} onChange={event => setRecipient(event.target.value)} required disabled={pending} /><FieldDescription>Nama pemilik yang menerima barang. Tidak memerlukan akun web.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="inventory-officer">Petugas penyerah</FieldLabel><Select items={workspace.data?.officers.map(o => ({ value: o.id, label: o.name })) ?? []} value={officerId} onValueChange={value => setOfficerId(value ?? "")} disabled={pending || workspace.loading}><SelectTrigger id="inventory-officer" className="w-full bg-background"><SelectValue placeholder={workspace.loading ? "Memuat petugas…" : "Pilih petugas"} /></SelectTrigger><SelectContent>{workspace.data?.officers.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent></Select><FieldDescription>Petugas yang menyerahkan barang, terpisah dari akun pencatat.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="inventory-evidence">Hasil pemeriksaan kepemilikan</FieldLabel><Textarea id="inventory-evidence" value={evidence} maxLength={1000} onChange={event => setEvidence(event.target.value)} placeholder="Contoh: Penerima dapat menjelaskan ciri khusus barang." required disabled={pending} rows={2} /><FieldDescription>Catat cara kepemilikan dipastikan. Tidak perlu mengunggah kartu identitas atau menulis nomor identitas lengkap.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="inventory-linked-loss">Laporan kehilangan terkait (opsional)</FieldLabel>
        {linkedLoss ? <p className="text-sm font-medium">{linkedLoss.title}</p> : <>
          <Input aria-label="Cari laporan kehilangan terkait" placeholder="Cari judul atau keterangan laporan" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} disabled={pending} className="bg-background" />
          <Select items={[{ value: "none", label: "Tanpa laporan web" }, ...(selectedLoss ? [{ value: selectedLoss.ticket, label: selectedLoss.title }] : []), ...(candidates.data?.items.filter(r => r.ticket !== selectedLoss?.ticket).map(r => ({ value: r.ticket, label: r.title })) ?? [])]} value={selectedLoss?.ticket ?? "none"} onValueChange={value => setSelectedLoss(candidates.data?.items.find(r => r.ticket === value))} disabled={pending || candidates.loading}>
            <SelectTrigger id="inventory-linked-loss" className="w-full bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa laporan web</SelectItem>{selectedLoss ? <SelectItem value={selectedLoss.ticket}>{selectedLoss.title}</SelectItem> : null}{candidates.data?.items.filter(r => r.ticket !== selectedLoss?.ticket).map(r => <SelectItem key={r.id} value={r.ticket}>{r.title}</SelectItem>)}</SelectContent>
          </Select>{candidates.error ? <FieldError>{candidates.error}</FieldError> : null}
        </>}
        <FieldDescription>{selectedLoss ? "Laporan ini akan selesai bersama penyerahan barang." : "Kosongkan jika penerima belum pernah membuat laporan. Cari kata yang lebih spesifik jika laporan belum terlihat."}</FieldDescription>
      </Field>
      <Field><FieldLabel htmlFor="inventory-note">Catatan tambahan (opsional)</FieldLabel><Textarea id="inventory-note" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={pending} rows={2} /></Field>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setMode(false)}>Batal</Button><Button type="submit" disabled={unavailable || !officerId || !recipient.trim() || !evidence.trim() || Boolean(workspace.error)}><Handshake aria-hidden="true" />{pending ? "Menyimpan…" : "Konfirmasi penyerahan"}</Button></div>
    </form></div>
  </DialogContent></Dialog>
  const action = <div className="rounded-xl border border-border bg-muted/40 p-4">{isStored ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Penyerahan barang</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Periksa kepemilikan, lalu catat penerima dan petugas. Laporan web terkait bersifat opsional.</p></div><Button disabled={unavailable} onClick={() => setMode(true)}><Handshake aria-hidden="true" />Serahkan barang</Button></div> : <p className="text-sm">Barang sudah diserahkan. Catatan tersimpan pada Riwayat.</p>}
  </div>
  return <OperationalReportDialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value) }} icon={Package} category="Inventaris Pos Satpam" submittedAt={item.createdAt} status={isStored ? "Tersimpan" : "Diserahkan"} title={item.itemName} updatedAt={item.updatedAt} action={action}>
    {confirmation}
    <Stepper aria-label="Progres barang inventaris" steps={[{ value: "tersimpan", label: "Tersimpan di pos" }, { value: "diserahkan", label: "Diserahkan" }]} value={item.status} />
    {detail.error ? <FieldError>{detail.error}<Button variant="outline" size="sm" onClick={() => setRevision(v => v + 1)}>Muat ulang</Button></FieldError> : null}
    <ReportDetailSection icon={Package} title="Detail barang" description="Penerimaan dan penyimpanan barang fisik di pos.">
      <ReportDetailTable rows={[{ icon: FileText, label: "Deskripsi", value: item.description }, { icon: MapPin, label: "Lokasi temuan", value: item.foundLocation }, { icon: MapPin, label: "Disimpan di", value: item.storageLocation }, { icon: UserRound, label: "Penemu", value: item.founderName }, { icon: UserRound, label: "Pencatat awal", value: item.registeredByName }, { icon: CalendarDays, label: "Diterima di pos", value: `${item.createdAt} WIB` }, ...(item.sourceFoundTitle ? [{ icon: FileText, label: "Laporan temuan terkait", value: item.sourceFoundTitle }] : [])]} />
    </ReportDetailSection>
    <ReportDetailSection icon={Images} title="Foto barang" description="Foto hanya tersedia bagi petugas yang memiliki akses.">
      {item.photoUrl ? <div className="space-y-3"><div className="relative aspect-video overflow-hidden rounded-xl border border-border bg-background"><InventoryPhoto key={item.photoUrl} url={item.photoUrl} name={item.itemName} sizes="(min-width: 768px) 640px, 100vw" /></div><Button nativeButton={false} render={<a href={`/api/satpam/inventory/${item.id}/photo`} />} variant="outline" size="sm">Unduh foto asli</Button></div> : <CollectionEmptyState icon={Images} title="Belum ada foto" description="Barang tetap dapat ditangani berdasarkan informasi dan pemeriksaan fisik." />}
    </ReportDetailSection>
    <ReportDetailSection icon={ClipboardCheck} title="Riwayat penanganan" description="Pencatatan penerimaan dan penyerahan barang.">
      <ReportDetailTable rows={[{ icon: UserRound, label: "Diterima melalui akun", value: item.registeredByName }, ...(isStored ? [] : [{ icon: UserRound, label: "Penerima", value: item.handoverRecipient }, { icon: UserRound, label: "Petugas penyerah", value: item.handoverOfficer }, { icon: UserRound, label: "Dicatat melalui akun", value: item.handoverActor }, { icon: CalendarDays, label: "Waktu penyerahan", value: `${item.handedOverAt ?? "Tidak tercatat"} WIB` }, { icon: ClipboardCheck, label: "Pemeriksaan kepemilikan", value: item.ownershipEvidence }, { icon: FileText, label: "Catatan tambahan", value: item.handoverNote }])]} />
      {item.legacyHandover ? <Badge variant="outline" tone="neutral">Data penyerahan lama; petugas tidak tercatat</Badge> : null}
    </ReportDetailSection>
  </OperationalReportDialog>
}
