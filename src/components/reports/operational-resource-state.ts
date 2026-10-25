export type OperationalResourceResult<T> = { key: string; url?: string; data?: T; error: string }

export function mergeOperationalPage<T extends { id: string }, Page extends { items: T[]; nextCursor: string | null; total: number }>(previous: T[], data: Page) {
  const items = new Map([...previous, ...data.items].map((item) => [item.id, item]))
  return { items: [...items.values()], nextCursor: data.nextCursor, total: data.total, data }
}

// Same-ticket refreshes can retain confirmed detail, but never another ticket's data.
export function resolveOperationalResource<T>(url: string | undefined, key: string, result: OperationalResourceResult<T>, keepPreviousData = false) {
  const current = Boolean(key) && result.key === key
  const sameResource = Boolean(url) && result.url === url
  return { data: current || keepPreviousData && sameResource ? result.data : undefined, error: current ? result.error : "", loading: Boolean(key) && (!current || (!result.data && !result.error)) }
}
