// Query builders are lazy. Await one at a time so this also works on a single
// transaction connection (pg no longer recommends overlapping client.query).
export async function sequentialQueries<const T extends readonly unknown[]>(queries: { [K in keyof T]: PromiseLike<T[K]> }): Promise<T> {
  const values: unknown[] = []
  for (const query of queries) values.push(await query)
  return values as unknown as T
}
