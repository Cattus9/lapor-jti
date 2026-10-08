"use client"

import { useEffect, useState } from "react"
import { Headphones, Layers3, MapPinned, Pencil, Plus, ShieldUser, Wrench } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { MasterKind, MasterRecord, OperationalCatalog } from "../domain/operations"
import { cn } from "cn"
import { MasterEditor, sectionNames } from "./master-editor"
import { ConfigSelect, EmptyRows, OperationsStatus, PageControls, SearchField, useOperationsData } from "./operations-ui"

const sections = [
  { key: "officers", icon: ShieldUser, description: "Nama petugas penyerahan. Tidak mengubah akun login Satpam." },
  { key: "areas", icon: Layers3, description: "Kelompokkan lokasi menurut lantai atau area tanpa lantai." },
  { key: "locations", icon: MapPinned, description: "Atur lokasi dan fasilitas yang ditampilkan kepada Pelapor." },
  { key: "objects", icon: Wrench, description: "Katalog jenis fasilitas, bukan inventaris setiap unit barang." },
  { key: "services", icon: Headphones, description: "Layanan yang dapat dilaporkan kepada Manajemen Jurusan." },
] as const
export function SettingsSection({ entity, catalog, onEdit, disabled }: { entity: MasterKind; catalog: OperationalCatalog; onEdit: (entity: MasterKind, record?: MasterRecord) => void; disabled: boolean }) {
  const [search, setSearch] = useState(""), [status, setStatus] = useState("all"), [area, setArea] = useState("all"), [page, setPage] = useState(1)
  const section = sections.find((row) => row.key === entity)!, Icon = section.icon
  const rows = catalog[entity].filter((row) => row.name.toLowerCase().includes(search.trim().toLowerCase()) && (status === "all" || row.isActive === (status === "active")) && (entity !== "locations" || area === "all" || row.areaId === area))
  const size = 6, currentPage = Math.min(page, Math.max(1, Math.ceil(rows.length / size))), visible = rows.slice((currentPage - 1) * size, currentPage * size)
  return <section id={`settings-${entity}`} aria-labelledby={`settings-title-${entity}`} className="scroll-mt-28">
    <Card className="gap-0 rounded-2xl border border-border bg-sidebar p-1.5 shadow-xs ring-0"><div className="overflow-hidden rounded-xl border border-border/60 bg-card">
      <CardHeader className="flex flex-col gap-3 border-b p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border bg-background"><Icon className="size-5 text-primary" /></span><div className="space-y-1"><CardTitle id={`settings-title-${entity}`} className="text-base">{sectionNames[entity]}</CardTitle><CardDescription>{section.description}</CardDescription></div></div><Button size="sm" variant="default" disabled={disabled} onClick={() => onEdit(entity)}><Plus />Tambah {entity === "locations" ? "lokasi" : entity === "areas" ? "area" : entity === "officers" ? "petugas" : entity === "objects" ? "fasilitas" : "layanan"}</Button></CardHeader>
      <CardContent className="space-y-4 p-5"><div className="flex flex-col gap-2 sm:flex-row"><SearchField label={`Cari ${sectionNames[entity].toLowerCase()}`} value={search} onChange={(value) => { setSearch(value); setPage(1) }} />{entity === "locations" ? <div className="sm:w-48"><ConfigSelect label="Filter area / lantai" value={area} onChange={(value) => { setArea(value); setPage(1) }} options={[{ value: "all", label: "Semua area / lantai" }, ...catalog.areas.map((row) => ({ value: row.id, label: row.name }))]} /></div> : null}<div className="sm:w-36"><ConfigSelect label="Status konfigurasi" value={status} onChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: "all", label: "Semua status" }, { value: "active", label: "Aktif" }, { value: "inactive", label: "Nonaktif" }]} /></div></div>
        {visible.length ? <div className="space-y-2">{visible.map((row) => {
          const areaRow = catalog.areas.find((area) => area.id === row.areaId), objects = row.objectIds?.map((id) => catalog.objects.find((object) => object.id === id)?.name).filter(Boolean) ?? []
          const context = entity === "locations" ? `${areaRow?.name ?? "Area belum tersedia"}${areaRow && !areaRow.isActive ? " (area nonaktif)" : ""}` : entity === "areas" ? `${row.kind === "floor" ? "Lantai gedung" : "Area tanpa lantai"} · ${catalog.locations.filter((location) => location.areaId === row.id).length} lokasi` : entity === "objects" ? `${row.group} · ${catalog.locations.filter((location) => location.objectIds?.includes(row.id)).length} lokasi` : entity === "officers" ? "Identitas petugas penyerahan" : "Laporan layanan"
          return <Card key={row.id} role="article" className="flex flex-row flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/15 p-3.5 shadow-none ring-0 transition-colors duration-150 hover:border-primary/40 focus-within:border-primary/40 motion-reduce:transition-none"><div className="min-w-0 flex-1"><p className="break-words text-sm font-medium">{row.name}</p><p className="mt-1 text-xs text-muted-foreground">{context}</p>{entity === "locations" ? <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{objects.length ? objects.join(", ") : "Belum ada fasilitas dipetakan. Pelapor dapat menggunakan Lainnya."}</p> : null}</div><Badge variant="outline" tone={row.isActive ? "success" : "neutral"}>{row.isActive ? "Aktif" : "Nonaktif"}</Badge><Button size="sm" variant="outline" className="border-primary/20 bg-primary/5 text-primary-action-hover hover:bg-primary/10 hover:text-primary-action-hover dark:border-primary/30 dark:bg-primary/10 dark:text-primary dark:hover:bg-primary/15 dark:hover:text-primary motion-reduce:transition-none" aria-label={`Ubah ${row.name}`} disabled={disabled} onClick={() => onEdit(entity, row)}><Pencil />{entity === "locations" ? "Atur lokasi" : "Ubah"}</Button></Card>
        })}</div> : <EmptyRows>{catalog[entity].length ? "Tidak ada data yang sesuai filter." : "Belum ada data. Tambahkan konfigurasi pertama."}</EmptyRows>}
        <PageControls page={currentPage} total={rows.length} size={size} onChange={setPage} disabled={disabled} />
      </CardContent>
    </div></Card>
  </section>
}
export function OperationalSettings() {
  const resource = useOperationsData<OperationalCatalog>("/api/manajemen/configuration")
  const [activeSection, setActiveSection] = useState<MasterKind>("officers")
  const [editor, setEditor] = useState<{ entity: MasterKind; record?: MasterRecord } | null>(null)
  useEffect(() => {
    if (!resource.data) return
    const observer = new IntersectionObserver((entries) => { const visible = entries.filter((entry) => entry.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top); if (visible[0]) setActiveSection(visible[0].target.id.replace("settings-", "") as MasterKind) }, { rootMargin: "-100px 0px -45% 0px" })
    for (const section of sections) { const element = document.getElementById(`settings-${section.key}`); if (element) observer.observe(element) }
    return () => observer.disconnect()
  }, [resource.data])
  return <div className="grid items-start gap-5 lg:grid-cols-[200px_minmax(0,1fr)]">
    <nav aria-label="Bagian pengaturan" className="sticky top-14 z-10 flex gap-1 overflow-x-auto rounded-xl border bg-card p-2 lg:flex-col"><p className="hidden px-3 py-2 text-xs font-medium text-muted-foreground lg:block">Konfigurasi operasional</p>{sections.map(({ key, icon: Icon }) => <Button key={key} variant="ghost" className={cn("shrink-0 justify-start gap-2 font-normal", key === activeSection && "bg-muted font-medium")} aria-current={activeSection === key ? "location" : undefined} onClick={() => { setActiveSection(key); document.getElementById(`settings-${key}`)?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth", block: "start" }) }}><Icon className="size-4 text-muted-foreground" />{sectionNames[key]}</Button>)}</nav>
    <div className="min-w-0 space-y-6" aria-busy={resource.loading}><OperationsStatus loading={resource.loading && !resource.data} error={resource.error} retry={resource.reload} />{resource.data ? <><p role="status" className="text-xs leading-relaxed text-muted-foreground">{resource.loading ? "Memperbarui konfigurasi..." : "Perubahan disimpan per konfigurasi. Data dinonaktifkan, bukan dihapus, agar riwayat tetap utuh."}</p>{sections.map(({ key }) => <SettingsSection key={key} entity={key} catalog={resource.data!} disabled={resource.loading || Boolean(resource.error)} onEdit={(entity, record) => setEditor({ entity, record })} />)}</> : null}</div>
    {editor && resource.data ? <MasterEditor key={`${editor.entity}-${editor.record?.id ?? "new"}-${editor.record?.revision ?? 0}`} {...editor} catalog={resource.data} onClose={() => setEditor(null)} onSaved={resource.reload} /> : null}
  </div>
}
