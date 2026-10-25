import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { ReportCategoryDrafts, hasDraftContent, type CategoryDraft } from "../src/features/reports/components/report-category-drafts"
import { ReportService } from "../src/features/reports/application/report-service"
import type { ReportRepository, AttachmentStorage, DraftView } from "../src/features/reports/application/ports"

const saved = (draft: CategoryDraft): DraftView => ({ id: draft.id, revision: draft.revision + 1, payload: draft.payload, attachments: draft.retained, updatedAt: new Date().toISOString() })
const deferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((done) => { resolve = done })
  return { promise, resolve }
}

test("Category selection alone creates no server draft; actual fields, partial area and files count", async () => {
  const drafts = new ReportCategoryDrafts([]), blank = drafts.ensure("fasilitas")
  let writes = 0
  await drafts.save("fasilitas", async (draft) => { writes++; return saved(draft) })
  assert.equal(writes, 0)
  assert.equal(hasDraftContent(blank), false)
  assert.equal(hasDraftContent({ ...blank, payload: { ...blank.payload, description: "   " } }), false)
  assert.equal(hasDraftContent({ ...blank, payload: { ...blank.payload, incidentDate: "2026-10-25", incidentTime: "09:00" } }), false)
  assert.equal(hasDraftContent({ ...blank, payload: { ...blank.payload, facilityAreaId: "floor-1" } }), true)
  assert.equal(hasDraftContent({ ...blank, files: [new File(["%PDF-"], "note.pdf", { type: "application/pdf" })] }), true)
})

test("Independent category saves finish out of order without replacing another category or losing attachments", async () => {
  const drafts = new ReportCategoryDrafts([]), other = drafts.ensure("lainnya"), facility = drafts.ensure("fasilitas")
  assert.notEqual(other.id, facility.id)
  const file = new File(["%PDF-"], "other.pdf", { type: "application/pdf" })
  drafts.capture("lainnya", { ...other.payload, title: "Usulan lain" }, [], [file])
  drafts.capture("fasilitas", { ...facility.payload, title: "Lampu mati", facilityAreaId: "floor-2" }, [], [])
  const late = deferred<DraftView>(), early = deferred<DraftView>()
  let writes = 0
  const one = drafts.save("lainnya", async () => { writes++; return late.promise })
  const two = drafts.save("fasilitas", async () => early.promise)
  assert.equal(drafts.get("lainnya")?.status, "saving")
  assert.equal(drafts.get("lainnya")?.notice, 0, "No success before server acknowledgment")
  assert.equal(drafts.save("lainnya", async (draft) => saved(draft)), one)
  early.resolve(saved(drafts.get("fasilitas")!)); await two
  const storedFile = { id: crypto.randomUUID(), name: file.name, size: file.size, mimeType: file.type }
  late.resolve({ ...saved(drafts.get("lainnya")!), attachments: [storedFile] }); await one
  assert.equal(writes, 1)
  assert.equal(drafts.get("fasilitas")?.payload.title, "Lampu mati")
  assert.equal(drafts.get("fasilitas")?.payload.facilityAreaId, "floor-2")
  assert.equal(drafts.get("lainnya")?.payload.title, "Usulan lain")
  assert.deepEqual(drafts.get("lainnya")?.retained, [storedFile])
  assert.deepEqual(drafts.get("lainnya")?.files, [])
  assert.equal(drafts.get("lainnya")?.notice, 1)
})

test("Failure retains raw text, file objects and stable identity; retry saves once and unchanged returns do not write", async () => {
  const drafts = new ReportCategoryDrafts([]), draft = drafts.ensure("lainnya")
  const file = new File(["%PDF-"], "fixture.pdf", { type: "application/pdf" })
  drafts.capture("lainnya", { ...draft.payload, title: "Isi tetap ada" }, [], [file])
  const failed = await drafts.save("lainnya", async () => { throw new Error("Offline") })
  assert.equal(failed.status, "error")
  assert.equal(failed.notice, 0)
  assert.equal(failed.files[0], file)
  assert.equal(failed.id, draft.id)
  assert.equal(failed.revision, 0)
  const retried = await drafts.save("lainnya", async (current) => saved(current))
  assert.equal(retried.status, "saved")
  assert.equal(retried.payload.title, "Isi tetap ada")
  assert.equal(retried.revision, 1)
  await drafts.save("lainnya", async () => { throw new Error("Unchanged draft must not write") })
  assert.equal(drafts.get("lainnya")?.status, "saved")
})

test("Clearing a saved draft persists the deletion, explicit resume overrides latest, and submitting removes only its category", async () => {
  const original = new ReportCategoryDrafts([]), first = original.ensure("lainnya"), second = original.ensure("fasilitas")
  const recent = saved({ ...first, payload: { ...first.payload, title: "Newer draft" } })
  const explicit = { ...recent, id: crypto.randomUUID(), payload: { ...recent.payload, title: "Explicitly chosen draft" } }
  const drafts = new ReportCategoryDrafts([recent, saved(second)], explicit)
  assert.equal(drafts.get("lainnya")?.payload.title, "Explicitly chosen draft")
  drafts.capture("lainnya", { ...explicit.payload, title: "" }, [], [])
  let writes = 0
  const cleared = await drafts.save("lainnya", async (draft) => { writes++; return { clearedDraftId: draft.id } })
  assert.equal(writes, 1)
  assert.equal(cleared.status, "idle")
  assert.equal(cleared.savedKey, undefined)
  assert.equal(cleared.notice, 0)
  assert.notEqual(cleared.id, explicit.id)
  assert.equal(hasDraftContent(cleared), false)
  drafts.remove("lainnya")
  assert.equal(drafts.get("lainnya"), undefined)
  assert.equal(drafts.get("fasilitas")?.id, second.id)
})

test("Clearing removes content and its badge state; a subsequent draft can announce success again", async () => {
  const drafts = new ReportCategoryDrafts([]), blank = drafts.ensure("lainnya")
  drafts.capture("lainnya", { ...blank.payload, title: "First" }, [], [])
  const first = await drafts.save("lainnya", async (draft) => saved(draft))
  drafts.capture("lainnya", { ...blank.payload, title: "   " }, [], [])
  const cleared = await drafts.save("lainnya", async (draft) => ({ clearedDraftId: draft.id }))
  assert.equal(cleared.savedKey, undefined)
  assert.equal(cleared.notice, 0)
  let writes = 0
  await drafts.save("lainnya", async (draft) => { writes++; return saved(draft) })
  assert.equal(writes, 0, "Repeated switches with an empty form must not save again")
  drafts.capture("lainnya", { ...cleared.payload, title: "Second" }, [], [])
  const second = await drafts.save("lainnya", async (draft) => saved(draft))
  assert.ok(second.notice > first.notice)
})

test("Failed clearing remains retryable and does not announce success or remove the other category", async () => {
  const initial = new ReportCategoryDrafts([]), other = saved(initial.ensure("fasilitas"))
  const original = saved({ ...initial.ensure("lainnya"), payload: { ...initial.ensure("lainnya").payload, title: "Original" } })
  const drafts = new ReportCategoryDrafts([original, other])
  drafts.capture("lainnya", { ...original.payload, title: "" }, [], [])
  const failed = await drafts.save("lainnya", async () => { throw new Error("Offline") })
  assert.equal(failed.status, "error")
  assert.equal(failed.id, original.id)
  assert.equal(failed.revision, original.revision)
  assert.equal(failed.notice, 0)
  const cleared = await drafts.save("lainnya", async (draft) => ({ clearedDraftId: draft.id }))
  assert.equal(cleared.status, "idle")
  assert.equal(cleared.savedKey, undefined)
  assert.equal(drafts.get("fasilitas")?.id, other.id)
})

test("Foreign acknowledgments and revision conflicts never mark the local draft as saved", async () => {
  const drafts = new ReportCategoryDrafts([]), draft = drafts.ensure("lainnya")
  drafts.capture("lainnya", { ...draft.payload, title: "Local" }, [], [])
  await drafts.save("lainnya", async (current) => ({ ...saved(current), id: crypto.randomUUID() }))
  assert.equal(drafts.get("lainnya")?.status, "error")
  assert.equal(drafts.get("lainnya")?.notice, 0)
  await drafts.save("lainnya", async () => { throw new Error("Draft telah berubah. Muat ulang sebelum menyimpan lagi.") })
  assert.equal(drafts.get("lainnya")?.payload.title, "Local")
  assert.equal(drafts.get("lainnya")?.revision, 0)
})

test("Resume lookup is role guarded and the form has one page with modal review and native-history updates", async () => {
  let reads = 0
  const service = new ReportService({ categoryDrafts: async () => { reads++; return [] } } as unknown as ReportRepository, {} as AttachmentStorage)
  assert.throws(() => service.categoryDrafts({ id: "other", role: "satpam" }))
  assert.equal(reads, 0)
  await service.categoryDrafts({ id: "owner", role: "pelapor" }); assert.equal(reads, 1)
  const form = readFileSync("src/features/reports/components/report-form.tsx", "utf8")
  assert.doesNotMatch(form, /ReportStepper|setStep|Informasi laporan|router\.replace|router\.refresh/)
  assert.match(form, /window\.history\.replaceState/)
  assert.match(form, /activeCategory\.current === target/)
  assert.match(form, /<Dialog open=\{previewOpen\}/)
  assert.match(form, /Tersimpan sebagai draft/)
  assert.match(readFileSync("src/features/reports/components/report-submission-preview.tsx", "utf8"), /<DialogContent/)
})
