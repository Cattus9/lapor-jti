type GroupableItem = { title: string; group?: string }

// Group adjacent items without changing route order or losing per-item UI metadata.
export function groupNavigationItems<T extends GroupableItem>(items: T[]) {
  const groups: { label: string; items: T[] }[] = []

  for (const item of items) {
    const label = item.group ?? "Workspace"
    const previous = groups.at(-1)
    if (previous?.label === label) previous.items.push(item)
    else groups.push({ label, items: [item] })
  }

  return groups
}
