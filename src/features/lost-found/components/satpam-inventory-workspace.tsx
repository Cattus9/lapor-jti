"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { InventoryPhoto } from "./inventory-photo"
import {
  ArrowRight,
  Clock3,
  MapPin,
  Package,
  PackagePlus,
  PackageSearch,
  Search,
  User,
} from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Skeleton } from "@/components/ui/skeleton"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { FoundItemForm } from "./found-item-form"
import { InventoryDetailDialog } from "./inventory-detail-dialog"
import { useDebouncedSatpamQuery, useSatpamPage } from "./use-satpam-data"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { InventoryItem, InventoryStatus } from "../domain/inventory"

const inventoryStatusOptions: Array<{ value: "semua" | InventoryStatus; label: string }> = [
  { value: "semua", label: "Semua status" },
  { value: "tersimpan", label: "Tersimpan di Pos" },
  { value: "diserahkan", label: "Sudah diserahkan" },
]

export function SatpamInventoryWorkspace({ user }: { user: CurrentUser }) {
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<"semua" | InventoryStatus>("semua")
  const [registerModalOpen, setRegisterModalOpen] = useState(false)
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null)
  const [revision, setRevision] = useState(0)
  const debouncedQuery = useDebouncedSatpamQuery(searchQuery)
  const queryParams = new URLSearchParams()
  if (debouncedQuery.trim()) queryParams.set("q", debouncedQuery.trim())
  if (statusFilter !== "semua") queryParams.set("status", statusFilter)
  queryParams.set("rev", String(revision))
  const resource = useSatpamPage<InventoryItem>(`/api/satpam/inventory?${queryParams.toString()}`)
  const filtered = Boolean(debouncedQuery.trim() || statusFilter !== "semua")
  const waitingForSearch = searchQuery.trim() !== debouncedQuery.trim()
  const loading = resource.loading || waitingForSearch

  function resetFilters() { setSearchQuery(""); setStatusFilter("semua") }
  function handleItemCreated() { setRevision((value) => value + 1); setRegisterModalOpen(false); router.refresh() }
  function handleItemUpdated(item: InventoryItem) { setRevision((value) => value + 1); setSelectedItem(item); router.refresh() }

  return (
    <DashboardLayout role="satpam">
      <ContentShell>
        <PageHeader title="Inventaris Pos Satpam" description={`Selamat datang, ${user.name}. Catat dan kelola barang temuan langsung yang diserahkan ke Pos Satpam.`} action={<Button onClick={() => setRegisterModalOpen(true)}><PackagePlus aria-hidden="true" />Terima barang</Button>} />
        <SectionCard title="Daftar barang inventaris" icon={Package} meta={<Badge variant="secondary">{loading ? "Memuat…" : resource.error ? "Belum termuat" : `${resource.total} barang`}</Badge>} contentClassName="space-y-4">
          <div className="flex flex-col gap-3 border-b border-border/60 pb-4 sm:flex-row sm:items-end">
            <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-3">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="inventory-search" className="text-xs font-normal text-muted-foreground">Cari inventaris</Label>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                  <Input id="inventory-search" type="search" maxLength={100} placeholder="Nama barang, penemu, atau deskripsi" value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} className="bg-background pl-9" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="inventory-status" className="text-xs font-normal text-muted-foreground">Status barang</Label>
                <Select items={inventoryStatusOptions} value={statusFilter} onValueChange={(value) => setStatusFilter(value as "semua" | InventoryStatus)}>
                  <SelectTrigger id="inventory-status" className="w-full bg-background"><SelectValue placeholder="Semua status" /></SelectTrigger>
                  <SelectContent>{inventoryStatusOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
            {searchQuery || statusFilter !== "semua" ? <Button variant="ghost" size="sm" onClick={resetFilters}>Reset filter</Button> : null}
          </div>
          <p className="text-xs text-muted-foreground" role="status">{loading ? "Memuat data inventaris…" : resource.error ? "Daftar inventaris belum berhasil diperbarui." : `Menampilkan ${resource.items.length} dari ${resource.total} barang inventaris`}</p>
          <InventoryResults items={resource.items} loading={loading} error={resource.error} filtered={filtered} onSelect={setSelectedItem} onRetry={() => setRevision((value) => value + 1)} />
          {resource.nextCursor ? <div className="flex justify-center"><Button type="button" variant="outline" disabled={loading || Boolean(resource.error)} onClick={resource.loadMore}>Muat barang berikutnya</Button></div> : null}
        </SectionCard>
        {registerModalOpen ? <RegisterInventoryDialog open={registerModalOpen} onOpenChange={setRegisterModalOpen} onSuccess={handleItemCreated} /> : null}
        {selectedItem ? <InventoryDetailDialog key={selectedItem.id} item={selectedItem} open onOpenChange={(open) => { if (!open) setSelectedItem(null) }} onUpdated={handleItemUpdated} /> : null}
      </ContentShell>
    </DashboardLayout>
  )
}

export function InventoryResults({ items, loading, error, filtered, onSelect, onRetry }: {
  items: InventoryItem[]; loading: boolean; error?: string; filtered: boolean
  onSelect: (item: InventoryItem) => void; onRetry: () => void
}) {
  if (loading && !items.length) return <div role="status" aria-label="Memuat inventaris" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }, (_, index) => <Card key={index} className="gap-3 rounded-xl border border-border p-4 shadow-none ring-0"><Skeleton className="aspect-video w-full rounded-lg" /><Skeleton className="h-4 w-3/4" /><Skeleton className="h-3 w-1/2" /></Card>)}</div>

  return <div className="space-y-4">
    {error ? <div role="alert" className="space-y-3 rounded-xl border border-border bg-empty-surface p-4"><FieldError>{error}</FieldError><Button type="button" variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button></div> : null}
    {items.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <InventoryCard key={item.id} item={item} disabled={loading || Boolean(error)} onClick={() => onSelect(item)} />)}</div> : !loading && !error ? (
      <CollectionEmptyState icon={filtered ? Search : PackageSearch} title={filtered ? "Tidak ada barang yang sesuai" : "Belum ada barang inventaris"} description={filtered ? "Ubah kata kunci atau reset filter untuk melihat barang lain." : "Barang temuan yang dicatat di Pos Satpam akan tampil di sini. Gunakan Tambah barang untuk mencatatnya."} />
    ) : null}
  </div>
}

/**
 * Product-style Card matching reference Image 2
 */
function InventoryCard({
  item,
  onClick,
  disabled = false,
}: {
  item: InventoryItem
  onClick: () => void
  disabled?: boolean
}) {
  const isStored = item.status === "tersimpan"

  return (
    <Card
      role="button"
      aria-label={`Lihat detail ${item.itemName}`}
      aria-disabled={disabled}
      onClick={() => { if (!disabled) onClick() }}
      className="group relative cursor-pointer justify-between gap-0 overflow-hidden rounded-xl border border-border bg-card p-0 text-card-foreground shadow-none ring-0 transition duration-200 hover:border-primary/40 hover:shadow-xs motion-safe:hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring aria-disabled:cursor-default aria-disabled:opacity-60 motion-reduce:transition-none"
      tabIndex={disabled ? -1 : 0}
      onKeyDown={(e) => {
        if (!disabled && (e.key === "Enter" || e.key === " ")) {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Top Image Area */}
      <div className="relative aspect-4/3 w-full overflow-hidden bg-muted/40 p-2 border-b border-border/40">
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted/60">
          <InventoryPhoto key={item.photoUrl ?? "empty"} url={item.photoUrl} name={item.itemName} sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw" className="object-cover transition-transform duration-200 motion-safe:group-hover:scale-105 motion-reduce:transition-none" />

          {/* Top-Left Founder Badge */}
          <Badge variant="outline" tone="neutral" className="absolute top-2 left-2 h-auto gap-1.5 rounded-lg px-2.5 py-1">
            <User className="size-3 text-primary shrink-0" aria-hidden="true" />
            <span className="max-w-32 truncate">
              {item.founderName ? item.founderName : "Temuan Langsung"}
            </span>
          </Badge>

          {/* Bottom-Right Status Badge */}
          <Badge variant="outline" tone={isStored ? "success" : "neutral"} className="absolute bottom-2 right-2 h-auto rounded-lg px-2.5 py-1">
            {isStored ? "Tersimpan" : "Diserahkan"}
          </Badge>

          {/* Bottom-Left Date Badge */}
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-xs font-medium text-foreground bg-background/90 px-2 py-0.5 rounded-md border border-border/60">
            <Clock3 className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="max-w-24 truncate">{item.createdAt}</span>
          </span>
        </div>
      </div>

      {/* Middle Content Area */}
      <div className="p-4 space-y-1.5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="font-semibold text-base text-foreground line-clamp-1 group-hover:text-primary transition-colors">
            {item.itemName}
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed mt-1">
            {item.description || "Tidak ada deskripsi tambahan untuk barang ini."}
          </p>
        </div>
      </div>

      {/* Bottom Footer Area */}
      <div className="border-t border-border/60 px-4 py-3 flex items-center justify-between bg-card/40 mt-auto">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
          <MapPin className="size-3 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">{item.storageLocation}</span>
        </div>
        <div className="inline-flex items-center gap-1 text-xs font-medium text-primary-action">
          Detail
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </div>
      </div>
    </Card>
  )
}

export { InventoryDetailDialog } from "./inventory-detail-dialog"

export function RegisterInventoryDialog({ open, onOpenChange, onSuccess, sourceFound }: {
  open: boolean; onOpenChange: (open: boolean) => void; onSuccess: (item: InventoryItem) => void
  sourceFound?: { ticket: string; title: string; location: string; description: string }
}) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
      <DialogTitle>Catat barang di pos</DialogTitle>
      <DialogDescription className="mt-2">Gunakan setelah barang diserahkan secara fisik ke Satpam. Barang akan tercatat sebagai titipan di Inventaris.</DialogDescription>
    </div>
    <div className="p-5 md:p-6"><FoundItemForm key={sourceFound?.ticket ?? "new"} idPrefix="inv" initialData={sourceFound ? { itemName: sourceFound.title, foundLocation: sourceFound.location, description: sourceFound.description.slice(0, 2000) } : undefined} sourceFoundTicket={sourceFound?.ticket} onSuccess={item => { onOpenChange(false); onSuccess(item) }} onCancel={() => onOpenChange(false)} /></div>
  </DialogContent></Dialog>
}
