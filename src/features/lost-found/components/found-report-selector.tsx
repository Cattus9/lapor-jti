"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useDebouncedSatpamQuery, useSatpamPage, useSatpamResource } from "./use-satpam-data"
import type { SatpamDetail, SatpamLostFoundReport } from "../types"

export function FoundReportSelector({ id, value, onChange, disabled = false }: {
  id: string; value: string; onChange: (ticket: string, report?: SatpamLostFoundReport) => void; disabled?: boolean
}) {
  const [search, setSearch] = useState("")
  const query = useDebouncedSatpamQuery(search)
  const page = useSatpamPage<SatpamLostFoundReport>(`/api/satpam/reports?kind=temuan&matching=1&q=${encodeURIComponent(query)}`)
  const selected = useSatpamResource<SatpamDetail>(value ? `/api/satpam/reports/${encodeURIComponent(value)}` : undefined)
  const choices = [...new Map([...(selected.data ? [selected.data.report] : []), ...page.items].map(report => [report.ticket, report])).values()]
  return <Field>
    <FieldLabel htmlFor={id}>Laporan Temuan terkait (opsional)</FieldLabel>
    <Input type="search" aria-label="Cari laporan Temuan" placeholder="Cari nama barang atau lokasi temuan" value={search} maxLength={100} disabled={disabled} onChange={event => setSearch(event.target.value)} className="h-11 bg-background/70" />
    <Select value={value || "none"} disabled={disabled || page.loading} items={[{ value: "none", label: "Tanpa laporan Temuan" }, ...(value && !choices.some(report => report.ticket === value) ? [{ value, label: "Laporan terpilih" }] : []), ...choices.map(report => ({ value: report.ticket, label: `${report.title} · ${report.reporter}` }))]} onValueChange={next => onChange(next === "none" ? "" : next ?? "", choices.find(report => report.ticket === next))}>
      <SelectTrigger id={id} className="h-11 w-full bg-background/70"><SelectValue /></SelectTrigger>
      <SelectContent><SelectItem value="none">Tanpa laporan Temuan</SelectItem>{value && !choices.some(report => report.ticket === value) ? <SelectItem value={value}>Laporan terpilih</SelectItem> : null}{choices.map(report => <SelectItem key={report.id} value={report.ticket}>{report.title} · {report.reporter}</SelectItem>)}</SelectContent>
    </Select>
    <FieldDescription>Pilih jika barang sudah dilaporkan di web agar tidak tercatat dua kali.</FieldDescription>
    {page.error || selected.error ? <FieldError>{page.error || selected.error}</FieldError> : null}
    {page.nextCursor ? <Button type="button" size="sm" variant="outline" disabled={disabled || page.loading} onClick={page.loadMore}>Muat laporan berikutnya</Button> : null}
  </Field>
}
