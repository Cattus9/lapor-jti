"use client"

import { Checkbox } from "@/components/ui/checkbox"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import type { MasterKind } from "../domain/operations"
import { facilityCategories } from "../domain/facility-categories"
import { ConfigSelect } from "./operations-ui"

const nameHints: Record<MasterKind, { placeholder: string; description: string }> = {
  officers: { placeholder: "Contoh: Budi Santoso", description: "Nama petugas penyerahan barang, terpisah dari akun login Satpam." },
  areas: { placeholder: "Contoh: Lantai 2 atau Area Parkir", description: "Gunakan nama lantai atau area yang dikenal pengguna. Nama Lainnya dicadangkan oleh sistem." },
  locations: { placeholder: "Contoh: Lab RSI atau Ruang Dosen", description: "Gunakan nama ruangan atau lokasi yang mudah dikenali. Nama Lainnya dicadangkan oleh sistem." },
  objects: { placeholder: "Contoh: AC, Meja, atau Wastafel", description: "Nama jenis fasilitas, bukan kode atau jumlah unit. Nama Lainnya dicadangkan oleh sistem." },
  services: { placeholder: "Contoh: JTI Surat atau Administrasi", description: "Gunakan nama layanan yang mudah dipahami Pelapor. Nama Lainnya dicadangkan oleh sistem." },
}
const availabilityHints: Record<MasterKind, string> = {
  officers: "Aktif: petugas dapat dipilih saat penyerahan barang. Nonaktif: riwayat penyerahan tetap tersimpan.",
  areas: "Aktif: area dan lokasi aktif di dalamnya muncul pada form Pelapor. Nonaktif: seluruh lokasi di area ini disembunyikan.",
  locations: "Aktif: lokasi dapat dipilih jika area aktif. Nonaktif: pilihan disembunyikan, laporan lama tetap dapat ditangani.",
  objects: "Aktif: fasilitas dapat dipilih di lokasi yang dipetakan. Nonaktif: pilihan disembunyikan, pemetaan dan laporan lama tetap tersimpan.",
  services: "Aktif: layanan dapat dipilih pada laporan baru. Nonaktif: pilihan disembunyikan, laporan lama tetap dapat ditangani.",
}

export function MasterNameField({ entity, value, onChange }: { entity: MasterKind; value: string; onChange: (value: string) => void }) {
  const hint = nameHints[entity]
  return <Field><FieldLabel htmlFor="master-name">Nama</FieldLabel><Input id="master-name" aria-describedby="master-name-hint" placeholder={hint.placeholder} value={value} onChange={(event) => onChange(event.target.value)} maxLength={100} required autoFocus /><FieldDescription id="master-name-hint">{hint.description}</FieldDescription></Field>
}

export function FacilityCategoryField({ value, onChange, disabled = false, legacyCategory }: { value: string; onChange: (value: string) => void; disabled?: boolean; legacyCategory?: string }) {
  return <Field><FieldLabel htmlFor="object-group">Kategori fasilitas</FieldLabel><ConfigSelect id="object-group" descriptionId="object-group-hint" label="Pilih kategori fasilitas" value={value} onChange={onChange} disabled={disabled} options={facilityCategories.map((category) => ({ value: category, label: category }))} /><FieldDescription id="object-group-hint">{legacyCategory && !value ? `Kategori lama "${legacyCategory}" belum termasuk daftar tetap. Pilih kategori yang sesuai sebelum menyimpan.` : "Pilih kategori terdekat. Daftar kategori tetap agar pengelompokan fasilitas konsisten."}</FieldDescription></Field>
}

export function MasterAvailabilityField({ entity, checked, onChange, disabled = false }: { entity: MasterKind; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) {
  return <Field><FieldLabel htmlFor="master-active" className="cursor-pointer"><Checkbox id="master-active" disabled={disabled} aria-describedby="master-active-hint" checked={checked} onCheckedChange={onChange} />Tersedia untuk dipilih</FieldLabel><FieldDescription id="master-active-hint">{availabilityHints[entity]}</FieldDescription></Field>
}
