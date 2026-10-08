import type { ManagementPage } from "../types"

export type WorkspaceCategory = "semua" | "layanan" | "lainnya"
export type ManagementCategoryPreview = {
  scope: string
  pages: Partial<Record<WorkspaceCategory, ManagementPage>>
  counts?: ManagementPage["categoryCounts"]
}

// One filter scope, at most three first-page snapshots. No global/session cache.
export function managementCategoryScope(url: string, revision: number) {
  const parsed = new URL(url, "http://localhost")
  const value = parsed.searchParams.get("category") ?? "semua"
  const category: WorkspaceCategory | undefined = value === "semua" || value === "layanan" || value === "lainnya" ? value : undefined
  parsed.searchParams.delete("category")
  parsed.searchParams.sort()
  return { category, scope: `${parsed.pathname}?${parsed.searchParams}&revision=${revision}` }
}

export function resolveManagementCategoryPreview(cache: ManagementCategoryPreview, scope: string, category?: WorkspaceCategory): ManagementPage | undefined {
  if (cache.scope !== scope || !category || !cache.counts) return undefined
  if (cache.pages[category]) return cache.pages[category]

  // Derive a preview only when the SQL total proves that every matching row is known.
  // A missing row in a paginated "Semua" response never means the category is empty.
  const total = cache.counts[category]
  const all = cache.pages.semua
  const items = all?.items.filter((report) => category === "semua" || report.categoryKey === category) ?? []
  if (items.length !== total) return undefined
  return { items, total, nextCursor: null, categoryCounts: cache.counts, handlerCounts: { satpam: 0, teknisi: 0, manajemen: total } }
}
