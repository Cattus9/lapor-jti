import { emptySatpamDraft, hasSatpamDraftContent, parseSatpamDraft, type SatpamDraftFields, type SatpamDraftKind, type SatpamDraftPhoto, type SatpamDraftView } from "../domain/satpam-draft"

type DraftStatus = "idle" | "saving" | "saved" | "error"
export type SatpamDraftEntry = {
  id: string; revision: number; fields: SatpamDraftFields; file: File | null; savedFile: File | null
  writeId: string
  photo: SatpamDraftPhoto | null; savedFields: string | null; status: DraftStatus; error: string
}
type DraftResult = { draft: SatpamDraftView } | { clearedDraftId: string }
type DraftWriter = (entry: SatpamDraftEntry) => Promise<DraftResult>
const key = (fields: SatpamDraftFields) => JSON.stringify(parseSatpamDraft(fields))

export class SatpamReportDrafts {
  private readonly entries = new Map<SatpamDraftKind, SatpamDraftEntry>()
  private readonly requests = new Map<SatpamDraftKind, Promise<void>>()
  private readonly listeners = new Set<() => void>()
  private version = 0
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getVersion = () => this.version
  private changed() { this.version++; this.listeners.forEach((listener) => listener()) }
  constructor(saved: Array<{ draft: SatpamDraftView; file: File | null }> = []) {
    for (const { draft, file } of saved) this.entries.set(draft.fields.kind, { id: draft.id, revision: draft.revision, fields: draft.fields, file, savedFile: file, photo: draft.photo, savedFields: key(draft.fields), writeId: crypto.randomUUID(), status: "saved", error: "" })
  }
  get(kind: SatpamDraftKind) {
    let entry = this.entries.get(kind)
    if (!entry) { entry = { id: crypto.randomUUID(), revision: 0, fields: emptySatpamDraft(kind), file: null, savedFile: null, photo: null, savedFields: null, writeId: crypto.randomUUID(), status: "idle", error: "" }; this.entries.set(kind, entry) }
    return entry
  }
  isDirty(kind: SatpamDraftKind) {
    const entry = this.get(kind)
    if (!entry.savedFields && !hasSatpamDraftContent(entry.fields, Boolean(entry.file))) return false
    return entry.savedFields !== key(entry.fields) || entry.file !== entry.savedFile
  }
  capture(kind: SatpamDraftKind, fields: SatpamDraftFields, file: File | null) {
    const current = this.get(kind), normalized = parseSatpamDraft(fields)
    if (key(current.fields) === key(normalized) && current.file === file) return
    this.entries.set(kind, { ...current, fields: normalized, file, writeId: crypto.randomUUID(), status: current.status === "saving" ? "saving" : "idle", error: "" })
    this.changed()
  }
  async save(kind: SatpamDraftKind, writer: DraftWriter): Promise<void> {
    const ongoing = this.requests.get(kind)
    if (ongoing) { await ongoing; if (this.isDirty(kind)) return this.save(kind, writer); return }
    const snapshot = this.get(kind)
    if (!this.isDirty(kind)) return
    this.entries.set(kind, { ...snapshot, status: "saving", error: "" }); this.changed()
    const request = writer(snapshot).then((result) => {
      const current = this.get(kind)
      if ("clearedDraftId" in result) {
        if (result.clearedDraftId !== snapshot.id) throw new Error("Konfirmasi pengosongan draft tidak valid.")
        this.entries.set(kind, { ...current, id: crypto.randomUUID(), revision: 0, savedFields: null, savedFile: null, photo: null, writeId: crypto.randomUUID(), status: "idle", error: "" })
      } else {
        if (result.draft.id !== snapshot.id || result.draft.revision !== snapshot.revision + 1 || key(result.draft.fields) !== key(snapshot.fields) || Boolean(result.draft.photo) !== Boolean(snapshot.file) || (result.draft.photo && snapshot.file && (result.draft.photo.name !== snapshot.file.name || result.draft.photo.size !== snapshot.file.size || result.draft.photo.mimeType !== snapshot.file.type))) throw new Error("Konfirmasi draft tidak valid.")
        this.entries.set(kind, { ...current, revision: result.draft.revision, savedFields: key(snapshot.fields), savedFile: snapshot.file, photo: result.draft.photo, status: "saved", error: "" })
      }
    }).catch((error: unknown) => {
      const current = this.get(kind), message = error instanceof Error ? error.message : "Draft belum tersimpan."
      this.entries.set(kind, { ...current, status: "error", error: message })
      throw error
    }).finally(() => { this.requests.delete(kind); this.changed() })
    this.requests.set(kind, request)
    await request
    if (this.isDirty(kind)) await this.save(kind, writer)
  }
  reset(kind: SatpamDraftKind) { this.entries.delete(kind); this.changed() }
}

export async function writeSatpamDraft(entry: SatpamDraftEntry): Promise<DraftResult> {
  const form = new FormData()
  const retainedPhotoId = entry.file && entry.file === entry.savedFile ? entry.photo?.id ?? null : null
  form.set("data", JSON.stringify({ id: entry.id, revision: entry.revision, fields: entry.fields, retainedPhotoId, writeId: entry.writeId }))
  if (entry.file && entry.file !== entry.savedFile) form.set("photo", entry.file)
  const response = await fetch("/api/satpam/drafts", { method: "POST", body: form })
  const body = await response.json().catch(() => null)
  if (!response.ok || !body || !(body.draft || body.clearedDraftId)) throw new Error(body?.error || "Draft belum tersimpan. Isian tetap tersedia.")
  return body as DraftResult
}
