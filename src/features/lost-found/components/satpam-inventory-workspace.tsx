"use client"

import { useState } from "react"
import Image from "next/image"
import {
  ArrowRight,
  BadgeCheck,
  CalendarDays,
  Check,
  Clock3,
  FileText,
  Handshake,
  Loader2,
  MapPin,
  MapPinned,
  Package,
  PackagePlus,
  PackageSearch,
  Plus,
  Search,
  ShieldCheck,
  User,
  UserRound,
} from "lucide-react"
import { ContentShell } from "@/components/layout/content-shell"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { PageHeader } from "@/components/layout/page-header"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { FoundItemForm } from "./found-item-form"
import { useDebouncedSatpamQuery, useSatpamResource } from "./use-satpam-data"
import type { CurrentUser } from "@/lib/auth/current-user"
import type { InventoryItem, InventoryStatus } from "../domain/inventory"
import { cn } from "cn"

export function SatpamInventoryWorkspace({ user }: { user: CurrentUser }) {
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

  const resource = useSatpamResource<{ items: InventoryItem[]; total: number }>(
    `/api/satpam/inventory?${queryParams.toString()}`
  )

  const items = resource.data?.items ?? []
  const loading = resource.loading
  const error = resource.error

  function handleItemCreated() {
    setRevision((prev) => prev + 1)
    setRegisterModalOpen(false)
  }

  function handleItemUpdated(updatedItem: InventoryItem) {
    setRevision((prev) => prev + 1)
    setSelectedItem(updatedItem)
  }

  return (
    <DashboardLayout role="satpam">
      <ContentShell>
        <PageHeader
          title="Inventaris Pos Satpam"
          description={`Selamat datang, ${user.name}. Catat dan kelola barang temuan langsung yang diserahkan ke Pos Satpam.`}
          action={
            <Button
              onClick={() => setRegisterModalOpen(true)}
              className="gap-2 font-medium"
            >
              <PackagePlus className="size-4" aria-hidden="true" />
              Tambah Barang
            </Button>
          }
        />

        {/* Toolbar: Search and Filter */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 max-w-md">
            <Search
              className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              placeholder="Cari nama barang, penemu, atau deskripsi..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-10 pl-9 bg-card border-border/80"
              aria-label="Cari barang inventaris"
            />
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(val) => setStatusFilter(val as "semua" | InventoryStatus)}
            >
              <SelectTrigger className="h-10 w-[180px] bg-card border-border/80">
                <SelectValue placeholder="Semua status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="semua">Semua Status</SelectItem>
                <SelectItem value="tersimpan">Tersimpan di Pos</SelectItem>
                <SelectItem value="diserahkan">Sudah Diserahkan</SelectItem>
              </SelectContent>
            </Select>

            {(searchQuery || statusFilter !== "semua") && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("semua")
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset Filter
              </Button>
            )}
          </div>
        </div>

        {/* Status Count Summary */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <p>
            {loading && items.length === 0
              ? "Memuat data inventaris..."
              : `Menampilkan ${items.length} barang inventaris`}
          </p>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="rounded-xl border border-destructive/20 bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Cards Grid (Image 2 style) */}
        {loading && items.length === 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {Array.from({ length: 8 }).map((_, index) => (
              <div
                key={index}
                className="h-80 rounded-2xl border border-border/60 bg-card p-4 animate-pulse space-y-3"
              >
                <div className="aspect-[4/3] w-full rounded-xl bg-muted" />
                <div className="h-4 w-3/4 rounded bg-muted" />
                <div className="h-3 w-1/2 rounded bg-muted" />
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <Card className="rounded-2xl border-border bg-sidebar p-1.5 shadow-xs">
            <div className="rounded-xl border border-border/60 bg-card p-12 text-center flex flex-col items-center justify-center space-y-4">
              <div className="flex size-14 items-center justify-center rounded-2xl border border-border bg-background shadow-xs text-muted-foreground">
                <PackageSearch className="size-7 text-primary" aria-hidden="true" />
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="font-semibold text-foreground text-base">Belum Ada Barang Inventaris</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {searchQuery || statusFilter !== "semua"
                    ? "Tidak ada barang inventaris yang sesuai dengan filter pencarian Anda."
                    : "Barang temuan yang diserahkan langsung oleh civitas kampus ke Pos Satpam akan tercatat di sini."}
                </p>
              </div>
              <Button
                onClick={() => setRegisterModalOpen(true)}
                variant="outline"
                className="gap-2 text-xs"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                Daftarkan Barang Pertama
              </Button>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {items.map((item) => (
              <InventoryCard
                key={item.id}
                item={item}
                onClick={() => setSelectedItem(item)}
              />
            ))}
          </div>
        )}

        {/* Modal: Register Inventory */}
        {registerModalOpen && (
          <RegisterInventoryDialog
            open={registerModalOpen}
            onOpenChange={setRegisterModalOpen}
            onSuccess={handleItemCreated}
          />
        )}

        {/* Modal: Item Detail */}
        {selectedItem && (
          <InventoryDetailDialog
            item={selectedItem}
            open={Boolean(selectedItem)}
            onOpenChange={(open) => {
              if (!open) setSelectedItem(null)
            }}
            onUpdated={handleItemUpdated}
          />
        )}
      </ContentShell>
    </DashboardLayout>
  )
}

/**
 * Product-style Card matching reference Image 2
 */
function InventoryCard({
  item,
  onClick,
}: {
  item: InventoryItem
  onClick: () => void
}) {
  const isStored = item.status === "tersimpan"

  return (
    <article
      onClick={onClick}
      className="group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-border/70 bg-card text-card-foreground shadow-xs transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-md cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault()
          onClick()
        }
      }}
    >
      {/* Top Image Area */}
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted/40 p-2 border-b border-border/40">
        <div className="relative h-full w-full overflow-hidden rounded-xl bg-muted/60">
          {item.photoUrl ? (
            <Image
              src={item.photoUrl}
              alt={item.itemName}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(min-width: 1280px) 25vw, (min-width: 768px) 33vw, 100vw"
              unoptimized
            />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-muted/30 to-muted/80 text-muted-foreground/60">
              <PackageSearch className="size-8 text-muted-foreground/40" aria-hidden="true" />
              <span className="text-[11px] font-medium">Foto tidak tersedia</span>
            </div>
          )}

          {/* Top-Left Founder Badge */}
          <span className="absolute top-2 left-2 inline-flex items-center gap-1.5 rounded-lg border border-border/50 bg-background/85 px-2.5 py-1 text-xs font-medium text-foreground backdrop-blur-md shadow-2xs">
            <User className="size-3 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[120px]">
              {item.founderName ? item.founderName : "Temuan Langsung"}
            </span>
          </span>

          {/* Bottom-Right Status Badge */}
          <span
            className={cn(
              "absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold backdrop-blur-md shadow-2xs border",
              isStored
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                : "bg-muted/85 border-border/60 text-muted-foreground"
            )}
          >
            {isStored ? "Tersimpan" : "Diserahkan"}
          </span>

          {/* Bottom-Left Date Badge */}
          <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 text-[11px] font-medium text-foreground/90 bg-background/80 backdrop-blur-md px-2 py-0.5 rounded-md border border-border/30">
            <Clock3 className="size-3 text-muted-foreground shrink-0" aria-hidden="true" />
            <span className="truncate max-w-[95px]">{item.createdAt}</span>
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
        <div className="inline-flex items-center gap-1 text-xs font-semibold text-primary group-hover:translate-x-0.5 transition-transform">
          Detail
          <ArrowRight className="size-3.5" aria-hidden="true" />
        </div>
      </div>
    </article>
  )
}

/**
 * Modal: Register New Inventory Item
 */
export function RegisterInventoryDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: (item: InventoryItem) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 sm:p-7">
        <DialogHeader className="pr-12 md:pr-14 pb-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-primary/10 text-primary shadow-2xs">
              <PackagePlus className="size-5" aria-hidden="true" />
            </span>
            <div className="space-y-0.5">
              <DialogTitle className="text-lg font-semibold tracking-tight text-foreground">
                Daftarkan Barang ke Inventaris
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground leading-relaxed">
                Catat barang temuan yang diserahkan langsung oleh civitas kampus ke Pos Satpam.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="pt-2">
          <FoundItemForm idPrefix="inv" onSuccess={onSuccess} onCancel={() => onOpenChange(false)} />
        </div>
      </DialogContent>
    </Dialog>
  )
}


/**
 * Modal: Inventory Detail & Handover Action
 * Strictly aligns with Report Detail Modal Standard from Dev.md / AGENTS.md
 */
export function InventoryDetailDialog({
  item,
  open,
  onOpenChange,
  onUpdated,
}: {
  item: InventoryItem
  open: boolean
  onOpenChange: (open: boolean) => void
  onUpdated: (item: InventoryItem) => void
}) {
  const [handoverMode, setHandoverMode] = useState(false)
  const [recipient, setRecipient] = useState("")
  const [note, setNote] = useState("")
  const [handoverSubmitting, setHandoverSubmitting] = useState(false)
  const [handoverError, setHandoverError] = useState("")

  const isStored = item.status === "tersimpan"

  async function handleHandover(e: React.FormEvent) {
    e.preventDefault()
    if (!recipient.trim()) {
      setHandoverError("Nama penerima barang wajib diisi.")
      return
    }

    setHandoverSubmitting(true)
    setHandoverError("")

    try {
      const response = await fetch(`/api/satpam/inventory/${item.id}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient: recipient.trim(), note: note.trim() || undefined }),
      })

      const data = await response.json().catch(() => null)
      if (!response.ok) throw new Error(data?.error || "Gagal mencatat penyerahan.")

      onUpdated(data)
      setHandoverMode(false)
    } catch (err) {
      setHandoverError(err instanceof Error ? err.message : "Terjadi kesalahan saat memproses.")
    } finally {
      setHandoverSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl p-6 sm:p-7">
        <DialogHeader className="pr-12 md:pr-14 space-y-3 pb-4 border-b border-border/60">

          {/* Metadata Row: Category, Date/Time, Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="flex size-7 items-center justify-center rounded-lg border border-border bg-primary/10 text-primary">
                <Package className="size-3.5" aria-hidden="true" />
              </span>
              <span className="font-semibold text-foreground">Inventaris Pos Satpam</span>
              <span>·</span>
              <span>{item.createdAt} WIB</span>
            </div>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                isStored
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                  : "bg-muted border-border/60 text-muted-foreground"
              )}
            >
              {isStored ? "Tersimpan" : "Diserahkan"}
            </span>
          </div>

          <div>
            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
              {item.itemName}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
              {isStored
                ? "Barang saat ini tersimpan aman di Pos Satpam dan siap diambil oleh pemilik."
                : `Barang telah diserahkan kembali kepada ${item.handoverRecipient || "pemilik"}.`}
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="space-y-5 pt-2">
          {/* Photo Preview if available */}
          {item.photoUrl && (
            <div className="overflow-hidden rounded-xl border border-border/70 bg-card p-2">
              <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-muted">
                <Image
                  src={item.photoUrl}
                  alt={item.itemName}
                  fill
                  className="object-contain"
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Status Action Panel */}
          {isStored ? (
            <div className="rounded-xl border border-border/80 bg-muted/40 p-4 space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-0.5">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                    <Handshake className="size-4 text-primary" aria-hidden="true" />
                    Penyerahan Barang
                  </h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Jika pemilik yang sah sudah terverifikasi dan mengambil barang ini, tandai barang sudah diserahkan.
                  </p>
                </div>
                {!handoverMode && (
                  <Button
                    onClick={() => setHandoverMode(true)}
                    size="sm"
                    className="shrink-0 gap-1.5"
                  >
                    <Handshake className="size-3.5" aria-hidden="true" />
                    Serahkan Barang
                  </Button>
                )}
              </div>

              {handoverMode && (
                <form
                  onSubmit={handleHandover}
                  className="space-y-3 border-t border-border/60 pt-3"
                >
                  {handoverError && <FieldError>{handoverError}</FieldError>}

                  <Field className="space-y-1">
                    <FieldLabel htmlFor="inv-recipient">
                      Nama Penerima / Pemilik <span className="text-destructive">*</span>
                    </FieldLabel>
                    <Input
                      id="inv-recipient"
                      placeholder="Nama orang yang mengambil barang..."
                      value={recipient}
                      onChange={(e) => setRecipient(e.target.value)}
                      disabled={handoverSubmitting}
                      required
                    />
                    <FieldDescription>
                      Pastikan identitas penerima telah dicocokkan dengan ciri barang.
                    </FieldDescription>
                  </Field>

                  <Field className="space-y-1">
                    <FieldLabel htmlFor="inv-handover-note">Catatan Penyerahan (Opsional)</FieldLabel>
                    <Textarea
                      id="inv-handover-note"
                      placeholder="Contoh: Menunjukkan kartu identitas KTM / KTP..."
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      disabled={handoverSubmitting}
                      rows={2}
                    />
                    <FieldDescription>
                      Catatan bukti atau keterangan identitas saat pengambilan barang.
                    </FieldDescription>
                  </Field>

                  <div className="flex items-center justify-end gap-2 pt-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={handoverSubmitting}
                      onClick={() => {
                        setHandoverMode(false)
                        setHandoverError("")
                      }}
                    >
                      Batal
                    </Button>
                    <Button type="submit" size="sm" disabled={handoverSubmitting} className="gap-1.5">
                      {handoverSubmitting ? (
                        <>
                          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                          Memproses...
                        </>
                      ) : (
                        <>
                          <Check className="size-3.5" aria-hidden="true" />
                          Konfirmasi Penyerahan
                        </>
                      )}
                    </Button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 space-y-2">
              <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-semibold text-sm">
                <ShieldCheck className="size-4.5" aria-hidden="true" />
                Barang Telah Diserahkan
              </div>
              <div className="text-xs space-y-1 text-muted-foreground leading-relaxed">
                <p>
                  Diserahkan kepada:{" "}
                  <strong className="text-foreground">{item.handoverRecipient}</strong>
                </p>
                {item.handedOverAt && (
                  <p>
                    Waktu penyerahan:{" "}
                    <span className="text-foreground">{item.handedOverAt} WIB</span>
                  </p>
                )}
                {item.handoverNote && (
                  <p>
                    Catatan: <span className="text-foreground">{item.handoverNote}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Definition List Table: Report Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="flex size-6 items-center justify-center rounded-md border border-border bg-background text-muted-foreground">
                <FileText className="size-3.5" aria-hidden="true" />
              </span>
              <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">
                Detail Informasi Barang
              </h4>
            </div>

            <div className="overflow-hidden rounded-xl border border-border/80 bg-card text-xs">
              <dl className="divide-y divide-border/60">
                <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                  <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                    <Package className="size-3.5 text-primary" aria-hidden="true" />
                    Nama Barang
                  </dt>
                  <dd className="font-semibold text-foreground col-span-2 sm:col-span-3">
                    {item.itemName}
                  </dd>
                </div>

                <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                  <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                    <UserRound className="size-3.5 text-primary" aria-hidden="true" />
                    Penemu
                  </dt>
                  <dd className="text-foreground col-span-2 sm:col-span-3">
                    {item.founderName || "Anonim / Tidak dicatat"}
                  </dd>
                </div>

                {item.foundLocation ? (
                  <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                    <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                      <MapPinned className="size-3.5 text-primary" aria-hidden="true" />
                      Lokasi Temuan
                    </dt>
                    <dd className="text-foreground col-span-2 sm:col-span-3">
                      {item.foundLocation}
                    </dd>
                  </div>
                ) : null}

                <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                  <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                    <MapPin className="size-3.5 text-primary" aria-hidden="true" />
                    Penyimpanan
                  </dt>
                  <dd className="text-foreground col-span-2 sm:col-span-3">
                    {item.storageLocation}
                  </dd>
                </div>

                <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                  <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                    <CalendarDays className="size-3.5 text-primary" aria-hidden="true" />
                    Waktu Dicatat
                  </dt>
                  <dd className="text-foreground col-span-2 sm:col-span-3">
                    {item.createdAt} WIB
                  </dd>
                </div>

                <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                  <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                    <BadgeCheck className="size-3.5 text-primary" aria-hidden="true" />
                    Pencatat
                  </dt>
                  <dd className="text-foreground col-span-2 sm:col-span-3">
                    {item.registeredByName}
                  </dd>
                </div>

                <div className="grid grid-cols-3 p-3 sm:grid-cols-4">
                  <dt className="flex items-center gap-2 font-medium text-muted-foreground col-span-1">
                    <FileText className="size-3.5 text-primary" aria-hidden="true" />
                    Deskripsi
                  </dt>
                  <dd className="text-foreground whitespace-pre-wrap leading-relaxed col-span-2 sm:col-span-3">
                    {item.description || "Tidak ada deskripsi tambahan."}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end border-t border-border/60 pt-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Tutup
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
