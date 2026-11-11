import { isUuid, ReportError } from "@/features/reports/domain/report"

export type FoundNoticeSource = "report" | "inventory"
export type FoundNoticeState = "reported" | "stored" | "returned" | "closed"
export type FoundNoticeRef = { source: FoundNoticeSource; id: string }
export type FoundNotice = FoundNoticeRef & {
  itemName: string
  foundLocation: string
  storageLocation: string | null
  publishedAt: string
  state: FoundNoticeState
  read: boolean
  hasPhoto: boolean
}
export type FoundNoticePage = { items: FoundNotice[]; unread: number; total: number; nextCursor: string | null }
export type FoundNoticeDetail = FoundNotice & { description: string }

export const foundNoticeStates = {
  reported: { label: "Dilaporkan ditemukan", tone: "info" },
  stored: { label: "Tersimpan di pos", tone: "success" },
  returned: { label: "Sudah dikembalikan", tone: "neutral" },
  closed: { label: "Informasi ditutup", tone: "neutral" },
} as const

export function parseFoundNoticeRef(raw: unknown): FoundNoticeRef {
  if (!raw || typeof raw !== "object") throw new ReportError("Informasi temuan tidak valid.")
  const value = raw as Record<string, unknown>
  if ((value.source !== "report" && value.source !== "inventory") || !isUuid(value.id)) throw new ReportError("Informasi temuan tidak valid.")
  return { source: value.source, id: value.id }
}

export function parseFoundNoticeCursor(raw?: string) {
  if (!raw) return null
  if (raw.length > 200) throw new ReportError("Halaman informasi temuan tidak valid.")
  try {
    const value = JSON.parse(raw)
    const ref = parseFoundNoticeRef(value)
    if (typeof value.publishedAt !== "string" || new Date(value.publishedAt).toISOString() !== value.publishedAt) throw new Error("date")
    return { ...ref, publishedAt: new Date(value.publishedAt) }
  } catch { throw new ReportError("Halaman informasi temuan tidak valid.") }
}

// Explicit shared projection: never spread report/inventory rows into this response.
export function presentFoundNotice(row: FoundNoticeRef & {
  itemName: string; foundLocation: string; storageLocation: string | null
  publishedAt: Date; state: FoundNoticeState; readAt: Date | null; hasPhoto?: boolean
}): FoundNotice {
  return {
    source: row.source, id: row.id, itemName: row.itemName,
    foundLocation: row.foundLocation, storageLocation: row.storageLocation,
    publishedAt: row.publishedAt.toISOString(), state: row.state, read: row.readAt !== null, hasPhoto: Boolean(row.hasPhoto),
  }
}
