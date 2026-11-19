"use client"

import { useEffect, useRef, useState, useSyncExternalStore } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff, KeyRound, ListMinus, Pencil, Plus, Save, ShieldUser, UserRoundPlus, UsersRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge, type BadgeTone } from "@/components/ui/badge"
import { SectionCard } from "@/components/ui/section-card"
import { CollectionEmptyState } from "@/components/reports/collection-empty-state"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { useDebouncedOperationalQuery } from "@/components/reports/use-operational-data"
import { managedUserBatchSize, operationalRoles, roleLabels, type OperationalRole, type UserRecord, type UsersPage } from "../domain/operations"
import { ConfigSelect, EmptyRows, OperationsStatus, PageControls, SearchField, saveOperation, useOperationsData } from "./operations-ui"

const roleTones: Record<OperationalRole, BadgeTone> = {
  pelapor: "primary",
  satpam: "teal",
  teknisi: "warning",
  manajemen: "violet",
  tefa: "teal",
}
const managedUsersKey = "laporjti:managed-user-ids"
const managedUsersChanged = "laporjti:managed-users-changed"
type ManagedAccount = { id: string; email: string }
const emptyManagedAccounts: ManagedAccount[] = []
let cachedManagedRaw: string | null = null
let cachedManagedAccounts: ManagedAccount[] = emptyManagedAccounts

function readManagedAccounts() {
  try {
    const raw = window.localStorage.getItem(managedUsersKey)
    if (raw !== cachedManagedRaw) {
      const parsed: unknown = raw ? JSON.parse(raw) : []
      cachedManagedAccounts = Array.isArray(parsed) ? parsed.filter((account): account is ManagedAccount => Boolean(account && typeof account === "object" && typeof account.id === "string" && typeof account.email === "string")) : emptyManagedAccounts
      cachedManagedRaw = raw
    }
  } catch {
    cachedManagedAccounts = emptyManagedAccounts
  }
  return cachedManagedAccounts
}

function subscribeManagedIds(listener: () => void) {
  window.addEventListener("storage", listener)
  window.addEventListener(managedUsersChanged, listener)
  return () => {
    window.removeEventListener("storage", listener)
    window.removeEventListener(managedUsersChanged, listener)
  }
}

function useManagedAccounts() {
  return useSyncExternalStore(subscribeManagedIds, readManagedAccounts, () => emptyManagedAccounts)
}

function updateManagedAccounts(update: (accounts: ManagedAccount[]) => ManagedAccount[]) {
  try {
    window.localStorage.setItem(managedUsersKey, JSON.stringify(update(readManagedAccounts())))
    window.dispatchEvent(new Event(managedUsersChanged))
    return true
  } catch {
    return false
  }
}

function rememberManagedAccount(account: ManagedAccount) {
  return updateManagedAccounts((accounts) => accounts.some((item) => item.id === account.id) ? accounts : [account, ...accounts])
}

function useManagedDirectory(accounts: ManagedAccount[]) {
  const [revision, setRevision] = useState(0)
  const key = `${revision}:${accounts.map((account) => account.id).join("|")}`
  const [snapshot, setSnapshot] = useState<{ key: string; items: UserRecord[]; error: string }>({ key: "", items: [], error: "" })
  useEffect(() => {
    const controller = new AbortController()
    async function load() {
      try {
        const byId = new Map<string, UserRecord>()
        for (let offset = 0; offset < accounts.length; offset += managedUserBatchSize) {
          const ids = accounts.slice(offset, offset + managedUserBatchSize).map((account) => account.id).join(",")
          const response = await fetch(`/api/manajemen/users?${new URLSearchParams({ ids })}`, { cache: "no-store", signal: controller.signal })
          const data = await response.json()
          if (!response.ok) throw new Error(data.error || "Data pengguna tidak dapat dimuat.")
          for (const user of data.items as UserRecord[]) byId.set(user.id, user)
        }
        if (!controller.signal.aborted) setSnapshot({ key, items: accounts.flatMap(({ id }) => byId.get(id) ?? []), error: "" })
      } catch (error) {
        if (!controller.signal.aborted) setSnapshot((previous) => ({ ...previous, key, error: error instanceof Error ? error.message : "Data pengguna tidak dapat dimuat." }))
      }
    }
    void load()
    return () => controller.abort()
  }, [accounts, key])
  const selectedIds = new Set(accounts.map(({ id }) => id))
  return { ...snapshot, items: snapshot.items.filter(({ id }) => selectedIds.has(id)), loading: snapshot.key !== key, reload: () => setRevision((value) => value + 1) }
}

function PasswordResetDialog({ user, onClose, onSaved }: { user: UserRecord; onClose: () => void; onSaved: () => void }) {
  const busy = useRef(false)
  const [password, setPassword] = useState("")
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (busy.current) return
    busy.current = true
    setPending(true)
    setError("")
    try {
      await saveOperation("/api/manajemen/users/password", { id: user.id, updatedAt: user.updatedAt, password })
      onSaved()
    } catch (error) {
      setError(error instanceof Error ? error.message : "Password belum dapat diperbarui.")
    } finally {
      busy.current = false
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !busy.current) onClose() }}>
      <DialogContent showCloseButton={!pending}>
        <DialogHeader>
          <DialogTitle>Reset password lokal</DialogTitle>
          <DialogDescription>Atur password baru untuk {user.name} ({user.email}). Semua sesi akun ini akan berakhir setelah disimpan.</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" aria-busy={pending}>
          <Field>
            <FieldLabel htmlFor="reset-user-password">Password baru</FieldLabel>
            <Input id="reset-user-password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required disabled={pending} value={password} onChange={(event) => setPassword(event.target.value)} aria-describedby="reset-user-password-hint" />
            <FieldDescription id="reset-user-password-hint">Gunakan 12–128 karakter. Sampaikan password langsung kepada pemilik akun melalui kanal pribadi.</FieldDescription>
          </Field>
          {error ? <FieldError role="alert">{error}</FieldError> : null}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>Batal</Button>
            <Button type="submit" disabled={pending}><KeyRound />{pending ? "Menyimpan…" : "Reset password"}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function UserEditor({ user, actorId, onClose, onSaved }: { user?: UserRecord; actorId: string; onClose: () => void; onSaved: () => void }) {
  const { notify } = useActivityNotifications(), busy = useRef(false)
  const [name, setName] = useState(user?.name ?? ""), [email, setEmail] = useState(user?.email ?? "")
  const [identifier, setIdentifier] = useState(user?.identifier ?? ""), [unit, setUnit] = useState(user?.unit ?? ""), [program, setProgram] = useState(user?.studyProgram ?? "")
  const [role, setRole] = useState<OperationalRole>(user?.role ?? "pelapor"), [active, setActive] = useState(user?.isActive ?? true)
  const [password, setPassword] = useState(""), [showPassword, setShowPassword] = useState(false), [confirmed, setConfirmed] = useState(false)
  const [pending, setPending] = useState(false), [error, setError] = useState("")
  const self = user?.id === actorId, accessChanged = Boolean(user && (role !== user.role || active !== user.isActive))
  async function submit(event: React.FormEvent) {
    event.preventDefault(); if (busy.current || accessChanged && !confirmed) return
    busy.current = true; setPending(true); setError("")
    try {
      const saved = await saveOperation("/api/manajemen/users", { id: user?.id, updatedAt: user?.updatedAt, name, email, identifier, unit, studyProgram: program, role, isActive: active, ...(!user ? { password } : {}) })
      if (typeof saved.user?.id === "string") rememberManagedAccount({ id: saved.user.id, email: saved.user.email })
      setPassword(""); notify({ title: "Pengguna tersimpan", description: accessChanged ? "Perubahan akses tersimpan. Pengguna harus login kembali." : "Identitas dan akun pengguna telah disimpan.", tone: "success" }); onSaved()
    } catch (error) { setError(error instanceof Error ? error.message : "Perubahan belum tersimpan.") }
    finally { busy.current = false; setPending(false) }
  }
  return <Dialog open onOpenChange={(open) => { if (!open && !busy.current) onClose() }}><DialogContent className="max-w-xl p-0" showCloseButton={!pending}>
    <DialogHeader className="border-b p-5 pr-12"><DialogTitle>{user ? "Ubah pengguna" : "Tambah pengguna"}</DialogTitle><DialogDescription>{user ? "Kelola identitas dan akses operasional tanpa menghapus riwayat." : "Buat akun email dan password untuk peran operasional JTI."}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-5 p-5" aria-busy={pending}><fieldset disabled={pending} className="space-y-5">
      <Field><FieldLabel htmlFor="user-name">Nama lengkap</FieldLabel><Input id="user-name" aria-describedby="user-name-hint" placeholder="Contoh: Rizky Pratama" autoFocus autoComplete="off" value={name} onChange={(event) => setName(event.target.value)} maxLength={100} required /><FieldDescription id="user-name-hint">Gunakan nama lengkap agar identitas pengguna mudah dikenali pada laporan dan aktivitas.</FieldDescription></Field>
      <Field><FieldLabel htmlFor="user-email">Email akun</FieldLabel><Input id="user-email" type="email" autoComplete="off" value={email} readOnly={Boolean(user)} onChange={(event) => setEmail(event.target.value)} maxLength={254} required /><FieldDescription>{user ? "Email login tetap. Pengaturan ini tidak mengganti kredensial." : "Gunakan email unik milik pengguna. Pendaftaran publik tetap ditutup."}</FieldDescription></Field>
      <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="user-role">Peran</FieldLabel><ConfigSelect id="user-role" label="Peran pengguna" value={role} disabled={self || pending} onChange={(value) => { setRole(value as OperationalRole); setConfirmed(false) }} options={operationalRoles.map((value) => ({ value, label: roleLabels[value] }))} /></Field><Field><FieldLabel htmlFor="user-identifier">NIM / NIP (opsional)</FieldLabel><Input id="user-identifier" value={identifier} onChange={(event) => setIdentifier(event.target.value)} maxLength={80} /></Field></div>
      <div className="grid gap-4 sm:grid-cols-2"><Field><FieldLabel htmlFor="user-unit">Unit (opsional)</FieldLabel><Input id="user-unit" value={unit} onChange={(event) => setUnit(event.target.value)} maxLength={100} /></Field><Field><FieldLabel htmlFor="user-program">Program studi (opsional)</FieldLabel><Input id="user-program" value={program} onChange={(event) => setProgram(event.target.value)} maxLength={100} /></Field></div>
      {!user ? <Field><FieldLabel htmlFor="user-password">Password awal</FieldLabel><div className="relative"><Input id="user-password" type={showPassword ? "text" : "password"} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} minLength={12} maxLength={128} required className="pr-11" /><Button type="button" variant="ghost" size="icon-sm" className="absolute top-1/2 right-1 -translate-y-1/2" aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"} onClick={() => setShowPassword((value) => !value)}>{showPassword ? <EyeOff /> : <Eye />}</Button></div><FieldDescription>12-128 karakter. Sampaikan secara pribadi; jangan gunakan satu password untuk semua akun.</FieldDescription></Field> : null}
      <Field><label className="flex items-center gap-3 text-sm font-medium"><Checkbox aria-label="Akun aktif" checked={active} disabled={self || pending} onCheckedChange={(value) => { setActive(value); setConfirmed(false) }} />Akun aktif</label><FieldDescription>{self ? "Peran dan status akun sendiri tidak dapat diubah di sini." : "Akun nonaktif tidak dapat login. Laporan serta riwayatnya tetap tersimpan."}</FieldDescription></Field>
      {role === "satpam" ? <p className="flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-xs leading-relaxed text-muted-foreground"><ShieldUser className="size-4 shrink-0" />Nama petugas penyerahan dikelola terpisah di Pengaturan Operasional.</p> : null}
      {accessChanged ? <Field className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 dark:border-amber-900 dark:bg-amber-950/30"><p className="text-sm font-medium">Akses pengguna akan berubah</p><FieldDescription>Seluruh sesi login pengguna ini akan diakhiri. Perubahan peran tidak memindahkan atau menghapus laporan lama.</FieldDescription><label className="flex items-start gap-3 text-sm"><Checkbox disabled={pending} aria-label="Konfirmasi perubahan akses" checked={confirmed} onCheckedChange={setConfirmed} /><span>Saya mengonfirmasi perubahan akses ini.</span></label></Field> : null}
    </fieldset>{error ? <FieldError role="alert">{error}</FieldError> : null}<div className="flex justify-end gap-2 border-t pt-4"><Button type="button" variant="outline" disabled={pending} onClick={onClose}>Batal</Button><Button type="submit" disabled={pending || accessChanged && !confirmed}><Save />{pending ? "Menyimpan..." : "Simpan pengguna"}</Button></div></form>
  </DialogContent></Dialog>
}

function PullRegisteredUserDialog({ open, onOpenChange, managedAccounts, onPull }: { open: boolean; onOpenChange: (open: boolean) => void; managedAccounts: ManagedAccount[]; onPull: (user: UserRecord) => void }) {
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const query = useDebouncedOperationalQuery(search)
  const resource = useOperationsData<UsersPage>(`/api/manajemen/users?${new URLSearchParams({ q: query, role: "all", status: "all", page: String(page) })}`)
  const available = resource.data?.items.filter((user) => !managedAccounts.some((account) => account.id === user.id)) ?? []
  return <Dialog open={open} onOpenChange={onOpenChange}>
    <DialogContent className="max-w-xl p-0">
      <DialogHeader className="border-b p-5 pr-12">
        <DialogTitle>Tarik pengguna terdaftar</DialogTitle>
        <DialogDescription>Pilih akun yang sudah terdaftar, lalu kelola perannya dari daftar utama.</DialogDescription>
      </DialogHeader>
      <div className="space-y-4 p-5">
        <SearchField label="Cari nama, email, atau NIM / NIP" value={search} onChange={(value) => { setSearch(value); setPage(1) }} />
        <OperationsStatus loading={resource.loading && !resource.data} error={resource.error} retry={resource.reload} />
        {resource.data ? <>
          {available.length ? <div className="max-h-72 space-y-2 overflow-y-auto">{available.map((user) => <div key={user.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/15 p-3"><div className="min-w-0 flex-1"><p className="text-sm font-medium">{user.name}</p><p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p></div><Badge variant="outline" tone={roleTones[user.role]}>{roleLabels[user.role]}</Badge><Button type="button" size="sm" variant="outline" disabled={resource.loading || Boolean(resource.error)} onClick={() => onPull(user)}><UserRoundPlus />Tarik</Button></div>)}</div> : !resource.loading && !resource.error ? <EmptyRows>{resource.data.total ? "Akun pada halaman ini sudah ditarik. Coba halaman lain atau gunakan pencarian." : "Tidak ada akun terdaftar yang sesuai pencarian."}</EmptyRows> : null}
          <PageControls page={resource.data.page} total={resource.data.total} size={resource.data.pageSize} onChange={setPage} disabled={resource.loading || Boolean(resource.error)} />
        </> : null}
        <p className="text-xs leading-relaxed text-muted-foreground">Pilihan tersimpan di browser ini. Akun yang dikeluarkan dari daftar dapat ditarik kembali.</p>
      </div>
    </DialogContent>
  </Dialog>
}

export function UserManagement({ actorId }: { actorId: string }) {
  const router = useRouter()
  const { notify } = useActivityNotifications()
  const [search, setSearch] = useState(""), [role, setRole] = useState("all"), [status, setStatus] = useState("all"), [page, setPage] = useState(1)
  const [editor, setEditor] = useState<{ user?: UserRecord } | null>(null)
  const [pullOpen, setPullOpen] = useState(false)
  const [passwordTarget, setPasswordTarget] = useState<UserRecord | null>(null)
  const [selectionError, setSelectionError] = useState("")
  const managedAccounts = useManagedAccounts()
  const directory = useManagedDirectory(managedAccounts)
  const normalizedSearch = search.trim().toLowerCase()
  const matchingUsers = directory.items.filter((user) =>
    (role === "all" || user.role === role) && (status === "all" || user.isActive === (status === "active")) &&
    (!normalizedSearch || [user.name, user.email, user.identifier].some((value) => value?.toLowerCase().includes(normalizedSearch))),
  )
  const pageSize = 12, currentPage = Math.min(page, Math.max(1, Math.ceil(matchingUsers.length / pageSize)))
  const managedUsers = matchingUsers.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const unavailable = directory.loading || Boolean(directory.error)

  function pull(user: UserRecord) {
    setPullOpen(false)
    if (!rememberManagedAccount(user)) {
      setSelectionError("Pilihan tidak dapat disimpan di browser ini.")
      return
    }
    setSelectionError("")
    setSearch("")
    setRole("all")
    setStatus("all")
    setPage(1)
    notify({ title: "Pengguna masuk daftar", description: user.name, tone: "success" })
  }

  function remove(user: UserRecord) {
    if (!updateManagedAccounts((accounts) => accounts.filter((account) => account.id !== user.id))) {
      setSelectionError("Perubahan daftar tidak dapat disimpan di browser ini.")
      return
    }
    setSelectionError("")
    notify({ title: "Pengguna dikeluarkan dari daftar", description: `${user.name} dapat ditarik kembali kapan saja.`, tone: "success" })
  }

  return (
    <SectionCard title="Akun yang dikelola" icon={UsersRound} meta={!unavailable ? `${directory.items.length} akun` : undefined} contentClassName="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-muted-foreground">Daftar tarik tersimpan di browser ini.</p>
        <div className="flex flex-wrap gap-2">
          <Button type="button" size="sm" variant="outline" onClick={() => setEditor({})}><Plus />Buat akun manual</Button>
          <Button type="button" size="sm" onClick={() => { setSelectionError(""); setPullOpen(true) }}><UserRoundPlus />Tarik pengguna</Button>
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <SearchField label="Cari nama, email, atau NIM / NIP" value={search} onChange={(value) => { setSearch(value); setPage(1) }} />
        <div className="sm:w-52"><ConfigSelect label="Filter peran pengguna" value={role} onChange={(value) => { setRole(value); setPage(1) }} options={[{ value: "all", label: "Semua peran" }, ...operationalRoles.map((value) => ({ value, label: roleLabels[value] }))]} /></div>
        <div className="sm:w-36"><ConfigSelect label="Filter status pengguna" value={status} onChange={(value) => { setStatus(value); setPage(1) }} options={[{ value: "all", label: "Semua status" }, { value: "active", label: "Aktif" }, { value: "inactive", label: "Nonaktif" }]} /></div>
      </div>
      {selectionError ? <FieldError role="alert">{selectionError}</FieldError> : null}
      <OperationsStatus loading={directory.loading && !directory.items.length} error={directory.error} retry={directory.reload} />
      {directory.loading && directory.items.length ? <p className="sr-only" role="status">Memperbarui pengguna...</p> : null}
      {managedUsers.length ? (
        <>
          <div className="space-y-2">
            {managedUsers.map((user) => (
              <div key={user.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-muted/15 p-4">
                <div className="min-w-0 flex-1">
                  <p className="break-words text-sm font-medium">{user.name}{user.id === actorId ? <span className="ml-2 text-xs font-normal text-muted-foreground">Anda</span> : null}</p>
                  <p className="mt-1 break-all text-xs text-muted-foreground">{user.email}</p>
                  {user.identifier || user.unit ? <p className="mt-1 text-xs text-muted-foreground">{[user.identifier, user.unit].filter(Boolean).join(" · ")}</p> : null}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="outline" tone={roleTones[user.role]}>{roleLabels[user.role]}</Badge>
                  <Badge variant="outline" tone={user.isActive ? "success" : "neutral"}>{user.isActive ? "Aktif" : "Nonaktif"}</Badge>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" variant="outline" aria-label={`Ubah pengguna ${user.name}`} disabled={unavailable} onClick={() => setEditor({ user })}><Pencil />Ubah</Button>
                  {user.hasLocalPassword && user.id !== actorId ? <Button type="button" size="sm" variant="ghost" aria-label={`Reset password ${user.name}`} disabled={unavailable} onClick={() => setPasswordTarget(user)}><KeyRound />Reset password</Button> : null}
                  <Button type="button" size="sm" variant="ghost" aria-label={`Keluarkan ${user.name} dari daftar`} disabled={unavailable} onClick={() => remove(user)}><ListMinus />Keluarkan dari daftar</Button>
                </div>
              </div>
            ))}
          </div>
          <PageControls page={currentPage} total={matchingUsers.length} size={pageSize} onChange={setPage} disabled={unavailable} />
        </>
      ) : !unavailable ? (
        <CollectionEmptyState icon={UsersRound} size="compact"
          title={directory.items.length ? "Tidak ada akun yang sesuai" : "Belum ada akun di daftar"}
          description={directory.items.length ? "Ubah pencarian atau filter untuk menemukan akun." : "Tarik pengguna terdaftar untuk mulai mengelola aksesnya."}
        />
      ) : null}
      {editor ? <UserEditor key={editor.user?.id ?? "new"} user={editor.user} actorId={actorId} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); directory.reload(); router.refresh() }} /> : null}
      {pullOpen ? <PullRegisteredUserDialog open onOpenChange={setPullOpen} managedAccounts={managedAccounts} onPull={pull} /> : null}
      {passwordTarget ? <PasswordResetDialog user={passwordTarget} onClose={() => setPasswordTarget(null)} onSaved={() => {
        setPasswordTarget(null)
        directory.reload()
        notify({ title: "Password lokal diperbarui", description: "Pengguna perlu masuk kembali dengan password baru.", tone: "success" })
      }} /> : null}
    </SectionCard>
  )
}
