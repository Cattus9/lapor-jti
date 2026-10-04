export type SatpamResourceResult<T> = { key: string; url?: string; data?: T; error: string }

// Refreshing the same report may keep its last confirmed data, never another report's data.
export function resolveSatpamResource<T>(url: string | undefined, key: string, result: SatpamResourceResult<T>, keepPreviousData = false) {
  const current = Boolean(key) && result.key === key
  const sameResource = Boolean(url) && result.url === url
  return {
    data: current || keepPreviousData && sameResource ? result.data : undefined,
    error: current ? result.error : "",
    loading: Boolean(key) && (!current || (!result.data && !result.error)),
  }
}
