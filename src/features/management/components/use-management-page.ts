"use client"

import { useContext, useState } from "react"
import { OperationalRefreshContext, useOperationalResource } from "@/components/reports/use-operational-data"
import type { ManagementPage } from "../types"
import { managementCategoryScope, resolveManagementCategoryPreview, type ManagementCategoryPreview } from "./management-category-preview"

const emptyPage: ManagementPage = { items: [], total: 0, nextCursor: null, categoryCounts: { semua: 0, "kehilangan-temuan": 0, fasilitas: 0, layanan: 0, lainnya: 0 }, handlerCounts: { satpam: 0, teknisi: 0, manajemen: 0 } }
// Preserve server aggregates across appended pages; counts must not be inferred from loaded rows.
export function useManagementPage(url: string, options: { keepCategoryPreview?: boolean } = {}) {
  const revision = useContext(OperationalRefreshContext), base = `${url}&revision=${revision}`
  const { scope, category } = managementCategoryScope(url, revision)
  const [cache, setCache] = useState<ManagementCategoryPreview>({ scope, pages: {} })
  const preview = options.keepCategoryPreview ? resolveManagementCategoryPreview(cache, scope, category) : undefined
  const [cursor, setCursor] = useState({ base, value: "", visit: 0 }), [pages, setPages] = useState<{ base: string; data: ManagementPage; source?: ManagementPage; hasData: boolean }>({ base, data: emptyPage, hasData: false })
  if (cache.scope !== scope) setCache({ scope, pages: {} })
  if (cursor.base !== base) { setCursor({ base, value: "", visit: cursor.visit + 1 }); setPages({ base, data: preview ?? emptyPage, hasData: Boolean(preview) }) }
  const value = cursor.base === base ? cursor.value : ""
  // A -> B -> A must revalidate even if B was aborted before it returned a response.
  const visit = options.keepCategoryPreview ? `&view=${cursor.visit}` : ""
  const resource = useOperationalResource<ManagementPage>(`${base}${visit}${value ? `&cursor=${encodeURIComponent(value)}` : ""}`)
  if (resource.data && (pages.base !== base || pages.source !== resource.data)) {
    const previous = value && pages.base === base ? pages.data.items : []
    setPages({ base, source: resource.data, hasData: true, data: { ...resource.data, items: [...new Map([...previous, ...resource.data.items].map((r) => [r.id, r])).values()] } })
    if (options.keepCategoryPreview && category && !value) {
      setCache({ scope, pages: { ...(cache.scope === scope ? cache.pages : {}), [category]: resource.data }, counts: resource.data.categoryCounts })
    }
  }
  const data = pages.base === base ? pages.data : preview ?? emptyPage
  const hasData = pages.base === base ? pages.hasData : Boolean(preview)
  const counts = options.keepCategoryPreview && cache.scope === scope ? cache.counts : undefined
  return { ...data, categoryCounts: counts ?? data.categoryCounts, hasData, hasCounts: hasData || Boolean(counts), loading: resource.loading, error: resource.error, loadMore: () => { if (!resource.loading && !resource.error && data.nextCursor) setCursor({ base, value: data.nextCursor, visit: cursor.visit }) } }
}
