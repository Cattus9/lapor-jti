export type OperationsResourceSnapshot<T> = { key: string; url: string; data?: T; error: string }
export function resolveOperationsSnapshot<T>(url: string, key: string, result: OperationsResourceSnapshot<T>) {
  return { data: result.url === url ? result.data : undefined, loading: result.key !== key, error: result.key === key ? result.error : "" }
}
