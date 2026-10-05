export type OperationalResourceResult<T> = { key: string; url?: string; data?: T; error: string }

// Same-ticket refreshes can retain confirmed detail, but never another ticket's data.
export function resolveOperationalResource<T>(url: string | undefined, key: string, result: OperationalResourceResult<T>, keepPreviousData = false) {
  const current = Boolean(key) && result.key === key
  const sameResource = Boolean(url) && result.url === url
  return { data: current || keepPreviousData && sameResource ? result.data : undefined, error: current ? result.error : "", loading: Boolean(key) && (!current || (!result.data && !result.error)) }
}
