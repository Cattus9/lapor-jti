"use client"

import { useEffect, useRef, useState } from "react"
import { Save, MapPinned } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import type { MasterKind, MasterRecord, OperationalCatalog } from "../domain/operations"
import { isFacilityCategory } from "../domain/facility-categories"
import { FacilityCategoryField, MasterAvailabilityField, MasterNameField } from "./master-editor-fields"
import { ConfigSelect, SearchField, saveOperation } from "./operations-ui"

export const sectionNames: Record<MasterKind, string> = { officers: "Petugas Satpam", areas: "Area / lantai", locations: "Ruangan & lokasi", objects: "Fasilitas", services: "Layanan" }
export function MasterEditor({ entity, record, catalog, onClose, onSaved }: { entity: MasterKind; record?: MasterRecord; catalog: OperationalCatalog; onClose: () => void; onSaved: () => void }) {
  const { notify } = useActivityNotifications(), busy = useRef(false)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(record?.name ?? ""), [isActive, setActive] = useState(record?.isActive ?? true)
  const [kind, setKind] = useState(record?.kind ?? "floor"), [order, setOrder] = useState(String(record?.sortOrder ?? 0))
  const [areaId, setAreaId] = useState(record?.areaId ?? ""), [group, setGroup] = useState<string>(isFacilityCategory(record?.group) ? record.group : "")
  const legacyCategory = record?.group && !isFacilityCategory(record.group) ? record.group : undefined
  const [objectIds, setObjects] = useState<string[]>(record?.objectIds ?? []), [search, setSearch] = useState("")
  const [pending, setPending] = useState(false), [error, setError] = useState("")
  const objects = catalog.objects.filter((row) => row.name !== "Lainnya" && (row.isActive || record?.objectIds?.includes(row.id)) && row.name.toLowerCase().includes(search.trim().toLowerCase()))
  const groups = [...new Set(objects.map((row) => row.group ?? "Fasilitas"))]
  useEffect(() => {
    const frame = requestAnimationFrame(() => setOpen(true))
    return () => cancelAnimationFrame(frame)
  }, [])
  function close() {
    if (!busy.current) setOpen(false)
  }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current) return
    if (entity === "objects" && !isFacilityCategory(group)) { setError("Pilih kategori fasilitas dari daftar yang tersedia."); return }
    busy.current = true; setPending(true); setError("")
    try {
      await saveOperation("/api/manajemen/configuration", { entity, id: record?.id, revision: record?.revision, name, isActive, kind, sortOrder: Number(order), areaId, group, objectIds })
      notify({ title: "Konfigurasi tersimpan", description: `${name.trim()} telah diperbarui. Laporan lama tetap tersimpan.`, tone: "success" }); onSaved(); setOpen(false)
    } catch (error) { setError(error instanceof Error ? error.message : "Perubahan belum tersimpan.") }
    finally { busy.current = false; setPending(false) }
  }
  return <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) close() }} onOpenChangeComplete={(nextOpen) => { if (!nextOpen) onClose() }}><DialogContent className="max-w-xl p-0 motion-reduce:transition-none" overlayClassName="motion-reduce:transition-none" showCloseButton={!pending}>
    <DialogHeader className="border-b p-5 pr-12"><DialogTitle>{record ? "Ubah" : "Tambah"} {sectionNames[entity].toLowerCase()}</DialogTitle><DialogDescription>{entity === "locations" ? "Petakan lokasi dan fasilitas yang benar-benar tersedia." : "Perubahan katalog tidak mengubah laporan atau riwayat yang sudah tercatat."}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-5 p-5" aria-busy={pending}><fieldset disabled={pending} className="space-y-5">
      <MasterNameField entity={entity} value={name} onChange={setName} />
      {entity === "areas" ? <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="area-kind">Jenis</FieldLabel><ConfigSelect disabled={pending} id="area-kind" label="Jenis area" value={kind} onChange={setKind} options={[{ value: "floor", label: "Lantai gedung" }, { value: "area", label: "Area (tanpa lantai)" }]} /></Field><Field><FieldLabel htmlFor="area-order">Urutan tampilan</FieldLabel><Input id="area-order" type="number" min={0} max={999} step={1} value={order} onChange={(event) => setOrder(event.target.value)} required /></Field></div> : null}
      {entity === "objects" ? <FacilityCategoryField value={group} onChange={setGroup} disabled={pending} legacyCategory={legacyCategory} /> : null}
      {entity === "locations" ? <>
        <Field><FieldLabel htmlFor="room-area"><MapPinned className="size-4 text-muted-foreground" />Area / lantai</FieldLabel><ConfigSelect disabled={pending} id="room-area" label="Pilih area / lantai" value={areaId} onChange={setAreaId} options={catalog.areas.filter((row) => row.isActive || row.id === record?.areaId).map((row) => ({ value: row.id, label: `${row.name}${row.isActive ? "" : " (nonaktif)"}` }))} /><FieldDescription>Tambahkan area terlebih dahulu jika lokasinya belum tersedia.</FieldDescription></Field>
        <Field><FieldLabel>Fasilitas di lokasi ini <span className="font-normal text-muted-foreground">({objectIds.length} dipetakan)</span></FieldLabel><FieldDescription>Pilih berdasarkan kondisi ruang, bukan semua fasilitas pada katalog.</FieldDescription><SearchField label="Cari fasilitas" value={search} onChange={setSearch} />
          <div className="max-h-64 space-y-4 overflow-y-auto rounded-xl border bg-muted/20 p-3">{groups.map((group) => <section key={group} className="space-y-2"><h3 className="text-xs font-medium text-muted-foreground">{group}</h3><div className="grid gap-2 sm:grid-cols-2">{objects.filter((row) => (row.group ?? "Fasilitas") === group).map((row) => <label key={row.id} className="flex cursor-pointer items-center gap-3 rounded-lg border bg-card p-3 text-sm"><Checkbox disabled={pending} aria-label={row.name} checked={objectIds.includes(row.id)} onCheckedChange={(checked) => setObjects(checked ? [...objectIds, row.id] : objectIds.filter((id) => id !== row.id))} /><span>{row.name}{!row.isActive ? <span className="ml-1 text-xs text-muted-foreground">(nonaktif)</span> : null}</span></label>)}</div></section>)}{!objects.length ? <p className="p-3 text-sm text-muted-foreground">Tidak ada fasilitas yang sesuai.</p> : null}</div>
          <FieldDescription>Lokasi tanpa pemetaan tetap menerima laporan melalui objek Lainnya.</FieldDescription>
        </Field>
      </> : null}
      <MasterAvailabilityField entity={entity} checked={isActive} onChange={setActive} disabled={pending} />
    </fieldset>{error ? <FieldError role="alert">{error}</FieldError> : null}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={close}>Batal</Button><Button type="submit" disabled={pending || entity === "locations" && !areaId || entity === "objects" && !isFacilityCategory(group)}><Save />{pending ? "Menyimpan..." : "Simpan perubahan"}</Button></div></form>
  </DialogContent></Dialog>
}
