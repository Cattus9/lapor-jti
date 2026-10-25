"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { mergeOperationalPage, resolveOperationalResource, type OperationalResourceResult } from "./operational-resource-state"

export const OperationalRefreshContext = createContext(0)
export function useOperationalResource<T>(url?: string, options: { keepPreviousData?: boolean } = {}) {
  const revision = useContext(OperationalRefreshContext)
  const key = url ? `${url}${url.includes("?") ? "&" : "?"}refresh=${revision}` : ""
  const [result, setResult] = useState<OperationalResourceResult<T>>({ key: "", error: "" })
  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    fetch(key, { cache: "no-store", signal: controller.signal }).then(async (response) => {
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Data belum berhasil dimuat.")
      if (!controller.signal.aborted) setResult({ key, url, data, error: "" })
    }).catch((error: unknown) => {
      if (!controller.signal.aborted) setResult((previous) => ({ key, url, data: options.keepPreviousData && previous.url === url ? previous.data : undefined, error: error instanceof Error ? error.message : "Koneksi bermasalah." }))
    })
    return () => controller.abort()
  }, [key, url, options.keepPreviousData])
  return resolveOperationalResource(url, key, result, options.keepPreviousData)
}
export function useOperationalPage<T extends { id: string }, Metadata extends object = object>(url: string) {
  type PageData = { items: T[]; nextCursor: string | null; total: number } & Metadata
  const revision = useContext(OperationalRefreshContext)
  const base = `${url}${url.includes("?") ? "&" : "?"}revision=${revision}`
  const [cursor, setCursor] = useState({ base, value: "" })
  const [pages, setPages] = useState<{ base: string; items: T[]; nextCursor: string | null; total: number; data?: PageData }>({ base, items: [], nextCursor: null, total: 0 })
  if (cursor.base !== base) { setCursor({ base, value: "" }); setPages({ base, items: [], nextCursor: null, total: 0 }) }
  const activeCursor = cursor.base === base ? cursor.value : ""
  const resource = useOperationalResource<PageData>(`${base}${activeCursor ? `&cursor=${encodeURIComponent(activeCursor)}` : ""}`)
  if (resource.data && pages.data !== resource.data) {
    const previous = activeCursor && pages.base === base ? pages.items : []
    setPages({ base, ...mergeOperationalPage(previous, resource.data) })
  }
  const active = pages.base === base ? pages : { items: [], nextCursor: null, total: 0 }
  return { ...active, data: pages.base === base ? pages.data : undefined, loading: resource.loading, error: resource.error, loadMore: () => { if (!resource.loading && !resource.error && active.nextCursor) setCursor({ base, value: active.nextCursor }) } }
}
export function useDebouncedOperationalQuery(value: string) {
  const [query, setQuery] = useState(value)
  useEffect(() => { const timer = setTimeout(() => setQuery(value), 350); return () => clearTimeout(timer) }, [value])
  return query
}
