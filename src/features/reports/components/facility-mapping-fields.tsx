"use client"

import { useState } from "react"
import { Layers3, MapPin, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { availableFacilities, type OperationalCatalog } from "@/features/operations/domain/operations"
import { cn } from "cn"

export function FacilityMappingFields({ catalog, location, onLocationChange, otherLocation, onOtherLocationChange, facilities, onFacilitiesChange, otherFacility, onOtherFacilityChange, disabled = false }: {
  catalog: OperationalCatalog; location: string; onLocationChange: (value: string) => void; otherLocation: string; onOtherLocationChange: (value: string) => void;
  facilities: string[]; onFacilitiesChange: (value: string[]) => void; otherFacility: string; onOtherFacilityChange: (value: string) => void; disabled?: boolean;
}) {
  const selectedRoom = catalog.locations.find((row) => row.name === location)
  const [areaId, setAreaId] = useState(() => selectedRoom?.areaId ?? "")
  const [notice, setNotice] = useState("")
  const activeArea = selectedRoom?.areaId ?? areaId
  const rooms = catalog.locations.filter((row) => row.areaId === activeArea).sort((a, b) => a.name.localeCompare(b.name, "id-ID", { numeric: true }))
  const choices = availableFacilities(catalog, location)
  const stale = facilities.filter((name) => name !== "Lainnya" && !choices.some((row) => row.name === name))
  function changeLocation(value: string) {
    if (value === location) return
    onLocationChange(value); onFacilitiesChange([]); onOtherFacilityChange("")
    if (value !== "Lainnya") onOtherLocationChange("")
    setNotice(facilities.length ? "Lokasi berubah. Pilih kembali fasilitas sesuai lokasi baru." : "")
  }
  function changeArea(value: string) { setAreaId(value); changeLocation("") }
  const unavailableLocation = Boolean(location && location !== "Lainnya" && !selectedRoom)
  const locationOptions = [...rooms.map((row) => row.name), ...(selectedRoom && !rooms.some((row) => row.id === selectedRoom.id) ? [selectedRoom.name] : []), ...(unavailableLocation ? [location] : []), "Lainnya"]
  return <FieldGroup>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field><FieldLabel htmlFor="facility-area"><Layers3 className="size-4 text-muted-foreground" />Area / lantai</FieldLabel>
        <Select disabled={disabled} value={activeArea} items={catalog.areas.map((row) => ({ value: row.id, label: row.name }))} onValueChange={(value) => changeArea(value ?? "")}>
          <SelectTrigger id="facility-area" className="!h-11 w-full bg-background"><SelectValue placeholder="Pilih area atau lantai" /></SelectTrigger>
          <SelectContent>{catalog.areas.map((row) => <SelectItem key={row.id} value={row.id}>{row.name}</SelectItem>)}</SelectContent>
        </Select><FieldDescription>Area luar tidak memerlukan lantai.</FieldDescription>
      </Field>
      <Field><FieldLabel htmlFor="facility-location"><MapPin className="size-4 text-muted-foreground" />Lokasi fasilitas</FieldLabel>
        <Select disabled={disabled} value={location} items={locationOptions.map((name) => ({ value: name, label: name }))} onValueChange={(value) => changeLocation(value ?? "")}>
          <SelectTrigger id="facility-location" className="!h-11 w-full bg-background"><SelectValue placeholder={activeArea ? "Pilih ruang atau lokasi" : "Pilih area dahulu atau Lainnya"} /></SelectTrigger>
          <SelectContent>{locationOptions.map((name) => <SelectItem key={name} value={name} disabled={unavailableLocation && name === location}>{name}</SelectItem>)}</SelectContent>
        </Select><FieldDescription>{activeArea ? `${rooms.length} lokasi tersedia. Gunakan Lainnya jika belum terdaftar.` : "Lainnya tetap tersedia untuk lokasi yang belum terdaftar."}</FieldDescription>
      </Field>
    </div>
    {location && location !== "Lainnya" && !selectedRoom ? <FieldError>Lokasi draft sudah tidak tersedia. Pilih lokasi baru atau Lainnya.</FieldError> : null}
    {location === "Lainnya" ? <Field><FieldLabel htmlFor="facility-location-detail">Detail lokasi</FieldLabel><Input id="facility-location-detail" value={otherLocation} onChange={(event) => onOtherLocationChange(event.target.value)} placeholder="Contoh: Samping pintu masuk Gedung JTI" maxLength={200} required /><FieldDescription>Sebutkan titik lokasi agar petugas dapat menemukannya.</FieldDescription></Field> : null}
    <Field><FieldLabel><Wrench className="size-4 text-muted-foreground" />Objek fasilitas</FieldLabel><FieldDescription>{location === "Lainnya" ? "Pilih objek yang terdampak pada lokasi lainnya." : location ? `Pilih fasilitas di ${location}.` : "Pilih lokasi dahulu untuk melihat fasilitasnya."}</FieldDescription>
      {location ? <div className="grid gap-2 sm:grid-cols-3">{[...choices.map((row) => row.name), "Lainnya"].map((name) => <label key={name} className={cn("flex min-h-11 cursor-pointer items-center gap-3 rounded-lg border bg-card px-3 py-2.5 text-sm", facilities.includes(name) && "border-primary/30 bg-primary/5")}>
        <Checkbox aria-label={name} checked={facilities.includes(name)} disabled={disabled || !facilities.includes(name) && facilities.length >= 20} onCheckedChange={(checked) => { onFacilitiesChange(checked ? [...facilities, name] : facilities.filter((value) => value !== name)); if (name === "Lainnya" && !checked) onOtherFacilityChange("") }} /><span>{name}</span>
      </label>)}</div> : <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">Daftar fasilitas akan mengikuti lokasi pilihan Anda.</div>}
      {location && !choices.length ? <FieldDescription>Belum ada fasilitas terpetakan. Gunakan Lainnya untuk tetap mengirim laporan.</FieldDescription> : null}
      {stale.length ? <div className="space-y-2"><FieldError>Fasilitas draft tidak lagi tersedia di lokasi ini: {stale.join(", ")}.</FieldError><Button type="button" variant="outline" size="sm" onClick={() => onFacilitiesChange(facilities.filter((name) => !stale.includes(name)))}>Hapus pilihan yang tidak tersedia</Button></div> : null}
      {notice ? <FieldDescription role="status">{notice}</FieldDescription> : null}
    </Field>
    {facilities.includes("Lainnya") ? <Field><FieldLabel htmlFor="other-facility">Objek lainnya</FieldLabel><Input id="other-facility" value={otherFacility} onChange={(event) => onOtherFacilityChange(event.target.value)} placeholder="Contoh: Pintu atau dispenser" maxLength={100} required /><FieldDescription>Tuliskan objek yang belum tersedia pada pilihan.</FieldDescription></Field> : null}
  </FieldGroup>
}
