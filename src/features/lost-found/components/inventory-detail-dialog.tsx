"use client"

import { useRef, useState } from "react"
import Image from "next/image"
import { InventoryCorrectionDialog } from "./inventory-correction-dialog"
import { InventoryPhoto } from "./inventory-photo"
import { ItemPhotoField, useItemPhoto } from "./item-photo-field"
import { CalendarDays, ClipboardCheck, FileText, Handshake, ImageIcon, Images, Mail, MapPin, Package, Phone, Search, UserRound } from "lucide-react"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportDetailSection, ReportDetailTable } from "@/components/reports/report-detail-section"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Stepper } from "@/components/ui/stepper"
import { Textarea } from "@/components/ui/textarea"
import { useDebouncedSatpamQuery, useSatpamResource } from "./use-satpam-data"
import type { InventoryItem } from "../domain/inventory"
import type { SatpamLostFoundReport, SatpamPage, SatpamWorkspaceData } from "../types"

function ComparisonPhotoCard({
  label,
  subtitle,
  badge,
  photoUrl,
  downloadUrl,
  emptyMessage,
}: {
  label: string
  subtitle?: string
  badge: string
  photoUrl?: string
  downloadUrl?: string
  emptyMessage: string
}) {
  const [failed, setFailed] = useState(false)
  return (
    <Card className="gap-0 overflow-hidden rounded-xl border border-border bg-background py-0 shadow-none">
      <div className="flex items-center justify-between border-b border-border/60 bg-muted/20 px-3.5 py-2.5">
        <div className="min-w-0 pr-2">
          <p className="truncate text-xs font-semibold text-foreground">{label}</p>
          {subtitle ? <p className="truncate text-[11px] text-muted-foreground">{subtitle}</p> : null}
        </div>
        <Badge variant="outline" tone="neutral" className="shrink-0 text-[10px]">
          {badge}
        </Badge>
      </div>
      <div className="relative flex aspect-video items-center justify-center bg-muted/30">
        {photoUrl && !failed ? (
          <Image
            src={photoUrl}
            alt={`Foto ${label}`}
            fill
            sizes="(min-width: 640px) 320px, 100vw"
            className="object-contain"
            unoptimized
            onError={() => setFailed(true)}
          />
        ) : (
          <div className="flex flex-col items-center gap-1.5 p-4 text-center text-muted-foreground">
            <ImageIcon className="size-6 opacity-50" aria-hidden="true" />
            <p className="text-xs font-medium">Foto belum tersedia</p>
            <p className="text-[11px] leading-tight">{emptyMessage}</p>
          </div>
        )}
      </div>
      {downloadUrl && photoUrl && !failed ? (
        <div className="border-t border-border/60 bg-muted/10 p-2">
          <Button
            nativeButton={false}
            render={<a href={downloadUrl} target="_blank" rel="noopener noreferrer" download />}
            variant="ghost"
            size="sm"
            className="w-full text-xs"
          >
            Unduh foto asli
          </Button>
        </div>
      ) : null}
    </Card>
  )
}

export function InventoryDetailDialog({ item: initialItem, open, onOpenChange, onUpdated, linkedLoss }: {
  item: InventoryItem; open: boolean; onOpenChange: (open: boolean) => void; onUpdated: (item: InventoryItem) => void
  linkedLoss?: Pick<SatpamLostFoundReport, "ticket" | "title"> & Partial<Pick<SatpamLostFoundReport, "description" | "characteristics" | "location" | "reporter" | "reporterEmail" | "reporterContact" | "photoUrl">>
}) {
  const [editing, setEditing] = useState(false)
  const [mode, setMode] = useState(false)
  const [recipient, setRecipient] = useState(linkedLoss?.reporter ?? "")
  const [recipientEmail, setRecipientEmail] = useState(linkedLoss?.reporterEmail ?? "")
  const [recipientPhone, setRecipientPhone] = useState(linkedLoss?.reporterContact ?? "")
  const [officerId, setOfficerId] = useState("")
  const [evidence, setEvidence] = useState("")
  const [note, setNote] = useState("")
  const handoverPhoto = useItemPhoto()
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
  const activeLoss = selectedLoss ?? linkedLoss

  const hasContact = Boolean(recipientEmail.trim() || recipientPhone.trim())

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (unavailable) return
    const trimmedRecipient = recipient.trim()
    const trimmedEmail = recipientEmail.trim()
    const trimmedPhone = recipientPhone.trim()
    const trimmedEvidence = evidence.trim()
    const trimmedNote = note.trim()
    const photo = handoverPhoto.file

    if (!trimmedRecipient || !officerId || !trimmedEvidence) return

    if (!trimmedEmail && !trimmedPhone) {
      setError("Minimal salah satu antara email atau nomor HP penerima wajib diisi.")
      return
    }
    if (trimmedEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setError("Format email penerima tidak valid.")
      return
    }
    if (handoverPhoto.error) {
      setError(handoverPhoto.error)
      return
    }

    const payload = {
      recipient: trimmedRecipient,
      recipientEmail: trimmedEmail || undefined,
      recipientPhone: trimmedPhone || undefined,
      officerId,
      ownershipEvidence: trimmedEvidence,
      note: trimmedNote,
      lossTicket: selectedLoss?.ticket,
      hasPhoto: Boolean(photo),
    }
    const fingerprint = JSON.stringify(payload)
    if (!command.current || command.current.fingerprint !== fingerprint) command.current = { fingerprint, key: crypto.randomUUID() }
    setPending(true); setError("")
    try {
      let response: Response
      if (photo && photo.size > 0) {
        const formData = new FormData()
        formData.append("recipient", trimmedRecipient)
        if (trimmedEmail) formData.append("recipientEmail", trimmedEmail)
        if (trimmedPhone) formData.append("recipientPhone", trimmedPhone)
        formData.append("officerId", officerId)
        formData.append("ownershipEvidence", trimmedEvidence)
        if (trimmedNote) formData.append("note", trimmedNote)
        if (selectedLoss?.ticket) formData.append("lossTicket", selectedLoss.ticket)
        formData.append("submissionKey", command.current.key)
        formData.append("photo", photo)
        response = await fetch(`/api/satpam/inventory/${item.id}/handover`, { method: "POST", body: formData })
      } else {
        response = await fetch(`/api/satpam/inventory/${item.id}/handover`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            recipient: trimmedRecipient,
            recipientEmail: trimmedEmail || undefined,
            recipientPhone: trimmedPhone || undefined,
            officerId,
            ownershipEvidence: trimmedEvidence,
            note: trimmedNote,
            lossTicket: selectedLoss?.ticket,
            submissionKey: command.current.key,
          }),
        })
      }
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
      <Field><FieldLabel htmlFor="inventory-recipient">Nama penerima</FieldLabel><Input id="inventory-recipient" value={recipient} maxLength={150} onChange={event => setRecipient(event.target.value)} required disabled={pending} placeholder="Nama pemilik yang menerima barang" /><FieldDescription>Nama pemilik yang menerima barang. Tidak memerlukan akun web.</FieldDescription></Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field>
          <FieldLabel htmlFor="inventory-recipient-email">Email penerima</FieldLabel>
          <Input
            id="inventory-recipient-email"
            type="email"
            value={recipientEmail}
            maxLength={150}
            onChange={event => setRecipientEmail(event.target.value)}
            disabled={pending}
            placeholder="nama@example.com"
            className="bg-background"
          />
        </Field>
        <Field>
          <FieldLabel htmlFor="inventory-recipient-phone">Nomor HP penerima</FieldLabel>
          <Input
            id="inventory-recipient-phone"
            type="tel"
            value={recipientPhone}
            maxLength={30}
            onChange={event => setRecipientPhone(event.target.value)}
            disabled={pending}
            placeholder="081234567890"
            className="bg-background"
          />
        </Field>
      </div>
      <FieldDescription>Minimal salah satu (email atau nomor HP) harus diisi sebagai kontak verifikasi penerima.</FieldDescription>
      <Field>
        <FieldLabel htmlFor="inventory-officer">Petugas penyerah</FieldLabel>
        <Select items={workspace.data?.officers.map(o => ({ value: o.id, label: o.name })) ?? []} value={officerId} onValueChange={value => setOfficerId(value ?? "")} disabled={pending || workspace.loading}>
          <SelectTrigger id="inventory-officer" className="w-full bg-background"><SelectValue placeholder={workspace.loading ? "Memuat petugas…" : "Pilih petugas"} /></SelectTrigger>
          <SelectContent>{workspace.data?.officers.map(o => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}</SelectContent>
        </Select>
        <FieldDescription>Petugas yang menyerahkan barang, terpisah dari akun pencatat.</FieldDescription>
      </Field>
      <ItemPhotoField
        idPrefix="inventory-handover"
        label="Foto penyerahan (opsional)"
        description="Format JPG, PNG, atau WebP (maks. 5 MB) sebagai dokumentasi serah terima."
        photo={handoverPhoto}
        disabled={pending}
        compact
      />
      <Field><FieldLabel htmlFor="inventory-evidence">Hasil pemeriksaan kepemilikan</FieldLabel><Textarea id="inventory-evidence" value={evidence} maxLength={1000} onChange={event => setEvidence(event.target.value)} placeholder="Contoh: Penerima dapat menjelaskan ciri khusus barang." required disabled={pending} rows={2} /><FieldDescription>Catat cara kepemilikan dipastikan. Tidak perlu mengunggah kartu identitas atau menulis nomor identitas lengkap.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="inventory-linked-loss">Laporan kehilangan terkait (opsional)</FieldLabel>
        {linkedLoss ? <p className="text-sm font-medium">{linkedLoss.title}</p> : <>
          <Input aria-label="Cari laporan kehilangan terkait" placeholder="Cari judul atau keterangan laporan" value={search} maxLength={100} onChange={event => setSearch(event.target.value)} disabled={pending} className="bg-background" />
          <Select
            items={[{ value: "none", label: "Tanpa laporan web" }, ...(selectedLoss ? [{ value: selectedLoss.ticket, label: selectedLoss.title }] : []), ...(candidates.data?.items.filter(r => r.ticket !== selectedLoss?.ticket).map(r => ({ value: r.ticket, label: r.title })) ?? [])]}
            value={selectedLoss?.ticket ?? "none"}
            onValueChange={value => {
              const selected = candidates.data?.items.find(r => r.ticket === value)
              setSelectedLoss(selected)
              if (selected) {
                if (!recipient && selected.reporter) setRecipient(selected.reporter)
                if (!recipientEmail && selected.reporterEmail) setRecipientEmail(selected.reporterEmail)
                if (!recipientPhone && selected.reporterContact) setRecipientPhone(selected.reporterContact)
              }
            }}
            disabled={pending || candidates.loading}
          >
            <SelectTrigger id="inventory-linked-loss" className="w-full bg-background"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">Tanpa laporan web</SelectItem>{selectedLoss ? <SelectItem value={selectedLoss.ticket}>{selectedLoss.title}</SelectItem> : null}{candidates.data?.items.filter(r => r.ticket !== selectedLoss?.ticket).map(r => <SelectItem key={r.id} value={r.ticket}>{r.title}</SelectItem>)}</SelectContent>
          </Select>{candidates.error ? <FieldError>{candidates.error}</FieldError> : null}
        </>}
        <FieldDescription>{selectedLoss ? "Laporan ini akan selesai bersama penyerahan barang." : "Kosongkan jika penerima belum pernah membuat laporan. Cari kata yang lebih spesifik jika laporan belum terlihat."}</FieldDescription>
      </Field>
      <Field><FieldLabel htmlFor="inventory-note">Catatan tambahan (opsional)</FieldLabel><Textarea id="inventory-note" value={note} maxLength={2000} onChange={event => setNote(event.target.value)} disabled={pending} rows={2} /></Field>
      <div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" disabled={pending} onClick={() => setMode(false)}>Batal</Button><Button type="submit" disabled={unavailable || !officerId || !recipient.trim() || !evidence.trim() || !hasContact || Boolean(workspace.error)}><Handshake aria-hidden="true" />{pending ? "Menyimpan…" : "Konfirmasi penyerahan"}</Button></div>
    </form></div>
  </DialogContent></Dialog>
  const action = <div className="rounded-xl border border-border bg-muted/40 p-4">{isStored ? <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">Penyerahan barang</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">Periksa kepemilikan, lalu catat penerima dan petugas. Laporan web terkait bersifat opsional.</p></div><Button variant="soft" disabled={unavailable} onClick={() => setEditing(true)}>Koreksi informasi</Button><Button disabled={unavailable} onClick={() => { if (linkedLoss) { if (!recipient && linkedLoss.reporter) setRecipient(linkedLoss.reporter); if (!recipientEmail && linkedLoss.reporterEmail) setRecipientEmail(linkedLoss.reporterEmail); if (!recipientPhone && linkedLoss.reporterContact) setRecipientPhone(linkedLoss.reporterContact) } setMode(true) }}><Handshake aria-hidden="true" />Serahkan barang</Button></div> : <p className="text-sm">Barang sudah diserahkan. Catatan tersimpan pada Riwayat.</p>}
  </div>
  return <OperationalReportDialog open={open} onOpenChange={value => { if (!pending) onOpenChange(value) }} icon={Package} category="Inventaris Pos Satpam" submittedAt={item.createdAt} status={isStored ? "Tersimpan" : "Diserahkan"} title={item.itemName} updatedAt={item.updatedAt} action={action}>
    {confirmation}
    {editing ? <InventoryCorrectionDialog key={item.version} item={item} onClose={() => setEditing(false)} onSaved={updated => { setRevision(value => value + 1); onUpdated(updated) }} /> : null}
    <Stepper aria-label="Progres barang inventaris" steps={[{ value: "tersimpan", label: "Tersimpan di pos" }, { value: "diserahkan", label: "Diserahkan" }]} value={item.status} />
    {linkedLoss ? <ReportDetailSection icon={Search} title="Bandingkan dengan laporan kehilangan" description="Periksa ciri barang dan keterangan pelapor sebelum menyerahkan barang.">
      <ReportDetailTable rows={[
        { icon: FileText, label: "Judul laporan", value: linkedLoss.title },
        { icon: UserRound, label: "Pelapor", value: linkedLoss.reporter },
        ...(linkedLoss.reporterEmail ? [{ icon: Mail, label: "Email pelapor", value: linkedLoss.reporterEmail }] : []),
        ...(linkedLoss.reporterContact ? [{ icon: Phone, label: "No. HP pelapor", value: linkedLoss.reporterContact }] : []),
        { icon: MapPin, label: "Lokasi kehilangan", value: linkedLoss.location },
        { icon: FileText, label: "Keterangan pelapor", value: linkedLoss.description },
        { icon: ClipboardCheck, label: "Ciri barang", value: linkedLoss.characteristics },
      ]} />
    </ReportDetailSection> : null}
    {detail.error ? <FieldError>{detail.error}<Button variant="outline" size="sm" onClick={() => setRevision(v => v + 1)}>Muat ulang</Button></FieldError> : null}
    <ReportDetailSection icon={Package} title="Detail barang" description="Penerimaan dan penyimpanan barang fisik di pos.">
      <ReportDetailTable rows={[{ icon: FileText, label: "Deskripsi", value: item.description }, { icon: MapPin, label: "Lokasi temuan", value: item.foundLocation }, { icon: MapPin, label: "Disimpan di", value: item.storageLocation }, { icon: UserRound, label: "Penemu", value: item.founderName }, { icon: UserRound, label: "Pencatat awal", value: item.registeredByName }, { icon: CalendarDays, label: "Diterima di pos", value: `${item.createdAt} WIB` }, ...(item.sourceFoundTitle ? [{ icon: FileText, label: "Laporan temuan terkait", value: item.sourceFoundTitle }] : [])]} />
    </ReportDetailSection>
    <ReportDetailSection
      icon={Images}
      title="Foto barang"
      description="Perbandingan foto barang fisik temuan di pos dengan foto pada laporan kehilangan."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <ComparisonPhotoCard
          label="Barang temuan di pos"
          subtitle={item.founderName ? `Penemu: ${item.founderName}` : `Tersimpan di ${item.storageLocation}`}
          badge="Pos / Penemu"
          photoUrl={item.photoUrl}
          downloadUrl={item.photoUrl ? `/api/satpam/inventory/${item.id}/photo` : undefined}
          emptyMessage="Barang fisik belum memiliki foto saat didaftarkan."
        />
        <ComparisonPhotoCard
          label={activeLoss ? `Laporan kehilangan: ${activeLoss.title}` : "Laporan kehilangan"}
          subtitle={activeLoss?.reporter ? `Pelapor: ${activeLoss.reporter}` : activeLoss ? activeLoss.ticket : "Belum ada laporan terkait"}
          badge="Pelapor"
          photoUrl={activeLoss?.photoUrl}
          downloadUrl={activeLoss?.photoUrl}
          emptyMessage={activeLoss ? "Pelapor tidak mengunggah foto pada laporan." : "Pilih atau tautkan laporan kehilangan untuk membandingkan foto."}
        />
      </div>
    </ReportDetailSection>
    <ReportDetailSection icon={ClipboardCheck} title="Riwayat penanganan" description="Pencatatan penerimaan dan penyerahan barang.">
      <ReportDetailTable rows={[
        { icon: UserRound, label: "Diterima melalui akun", value: item.registeredByName },
        ...(isStored ? [] : [
          { icon: UserRound, label: "Penerima", value: item.handoverRecipient },
          ...(item.handoverRecipientEmail ? [{ icon: Mail, label: "Email penerima", value: item.handoverRecipientEmail }] : []),
          ...(item.handoverRecipientPhone ? [{ icon: Phone, label: "No. HP penerima", value: item.handoverRecipientPhone }] : []),
          { icon: UserRound, label: "Petugas penyerah", value: item.handoverOfficer },
          { icon: UserRound, label: "Dicatat melalui akun", value: item.handoverActor },
          { icon: CalendarDays, label: "Waktu penyerahan", value: `${item.handedOverAt ?? "Tidak tercatat"} WIB` },
          { icon: ClipboardCheck, label: "Pemeriksaan kepemilikan", value: item.ownershipEvidence },
          { icon: FileText, label: "Catatan tambahan", value: item.handoverNote },
        ])
      ]} />
      {item.handoverPhotoUrl ? (
        <div className="mt-3 space-y-2 rounded-xl border border-border/60 bg-background/60 p-3">
          <p className="text-xs font-medium text-foreground">Foto dokumentasi penyerahan</p>
          <div className="relative aspect-video max-w-sm overflow-hidden rounded-lg border border-border bg-background">
            <InventoryPhoto url={item.handoverPhotoUrl} name={`Foto penyerahan ${item.itemName}`} sizes="(min-width: 768px) 384px, 100vw" />
          </div>
        </div>
      ) : null}
      {item.corrections?.map((change, index) => <div key={`${change.at}-${index}`} className="rounded-xl border border-border/60 bg-background p-3 text-sm"><p className="font-medium">Koreksi oleh {change.actor}</p><p className="mt-1 text-xs text-muted-foreground">{change.at} WIB</p><p className="mt-2 whitespace-pre-wrap">{change.reason}</p></div>)}
      {item.legacyHandover ? <Badge variant="outline" tone="neutral">Data penyerahan lama; petugas tidak tercatat</Badge> : null}
    </ReportDetailSection>
  </OperationalReportDialog>
}
