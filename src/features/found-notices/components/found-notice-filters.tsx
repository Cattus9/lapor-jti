"use client"

import { useEffect, useId, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { RotateCcw, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Field, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { foundNoticeStates, type FoundNoticeState } from "../domain/found-notice"

export type FoundNoticeCriteria = { search: string; state?: FoundNoticeState }

const defaultCriteria: FoundNoticeCriteria = { search: "" }
const statuses = [
  { value: "all", label: "Semua status" },
  ...Object.entries(foundNoticeStates).map(([value, state]) => ({ value, label: state.label })),
]

function newsHref({ search, state }: FoundNoticeCriteria) {
  const query = new URLSearchParams()
  if (search.trim()) query.set("search", search.trim())
  if (state) query.set("state", state)
  return query.size ? `/pelapor/berita?${query}` : "/pelapor/berita"
}

export function FoundNoticeFilters({ filters }: { filters: FoundNoticeCriteria }) {
  const router = useRouter()
  const id = useId()
  const serverHref = newsHref(filters)
  const [draft, setDraft] = useState(() => ({ values: filters, serverHref, requests: [] as string[], revision: 0 }))
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const composing = useRef(false)
  const [pending, startTransition] = useTransition()
  const acknowledged = draft.requests.indexOf(serverHref)
  const externalChange = draft.serverHref !== serverHref && acknowledged < 0
  const values = externalChange ? filters : draft.values
  if (draft.serverHref !== serverHref) {
    // Keep typing intact when a previously requested result arrives.
    setDraft(externalChange
      ? { values: filters, serverHref, requests: [], revision: draft.revision + 1 }
      : { ...draft, serverHref, requests: draft.requests.slice(acknowledged + 1) })
  }

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current)
  }, [draft.revision])

  function cancelSearch() {
    if (timer.current !== null) clearTimeout(timer.current)
    timer.current = null
  }

  function change(next: FoundNoticeCriteria, delay = 0) {
    cancelSearch()
    setDraft(current => ({ ...current, values: next }))
    if (composing.current) return
    const href = newsHref(next)
    function navigate() {
      setDraft(current => ({ ...current, requests: [...current.requests.filter(request => request !== href), href] }))
      startTransition(() => router.replace(href, { scroll: false }))
    }
    if (delay) timer.current = setTimeout(navigate, delay)
    else navigate()
  }

  return (
    <form
      role="search"
      aria-label="Cari dan filter barang temuan"
      aria-busy={pending}
      className="@container mb-4 border-b border-border/60 pb-4"
      onSubmit={event => { event.preventDefault(); change(values) }}
    >
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 @lg:grid-cols-[minmax(0,1fr)_auto_auto]">
        <Field className="col-span-2 min-w-0 @lg:col-span-1">
          <FieldLabel htmlFor={`${id}-q`} className="text-xs text-muted-foreground">Pencarian</FieldLabel>
          <div className="relative">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id={`${id}-q`}
              type="search"
              value={values.search}
              onChange={event => change({ ...values, search: event.target.value }, 350)}
              onCompositionStart={() => { composing.current = true; cancelSearch() }}
              onCompositionEnd={event => { composing.current = false; change({ ...values, search: event.currentTarget.value }, 350) }}
              maxLength={100}
              placeholder="Cari nama barang atau lokasi"
              className="h-9 bg-background pl-9"
            />
          </div>
        </Field>
        <Field className="min-w-0 @lg:w-52">
          <FieldLabel htmlFor={`${id}-status`} className="text-xs text-muted-foreground">Status barang</FieldLabel>
          <Select
            items={statuses}
            value={values.state ?? "all"}
            onValueChange={value => change({ ...values, state: value && value !== "all" ? value as FoundNoticeState : undefined })}
          >
            <SelectTrigger id={`${id}-status`} className="w-full bg-background"><SelectValue /></SelectTrigger>
            <SelectContent matchTriggerWidth={false} className="min-w-52">
              {statuses.map(status => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </Field>
        <Button type="button" variant="ghost" className="h-9 text-muted-foreground" onClick={() => change(defaultCriteria)} disabled={!values.search && !values.state && !filters.search && !filters.state}>
          <RotateCcw aria-hidden="true" />Reset<span className="sr-only"> filter</span>
        </Button>
      </div>
      <span className="sr-only" role="status">{pending ? "Memuat barang temuan sesuai filter…" : ""}</span>
    </form>
  )
}
