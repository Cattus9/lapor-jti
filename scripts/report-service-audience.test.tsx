import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { emptyReportPayload, parsePayload } from "../src/features/reports/domain/report"
import { getReportFormCategory, servicesForFormCategory } from "../src/features/reports/domain/report-form-category"
import { ReportCategoryDrafts, hasDraftContent, type CategoryDraft } from "../src/features/reports/components/report-category-drafts"
import { ReportCategoryBadge } from "../src/features/reports/components/report-category-badge"
import { createReportSubmissionSnapshot, reportSubmissionBody } from "../src/features/reports/components/report-submission-state"
import type { DraftView } from "../src/features/reports/application/ports"

const ack = (draft: CategoryDraft): DraftView => ({ id: draft.id, revision: draft.revision + 1, payload: parsePayload(draft.payload, false), attachments: draft.retained, updatedAt: new Date().toISOString() })

test("choosing TEFA alone is not draft content and keeps the canonical service category", async () => {
  const drafts = new ReportCategoryDrafts([]), tefa = drafts.ensure("tefa"), operational = drafts.ensure("layanan")
  assert.equal(tefa.payload.category, "layanan")
  assert.equal(tefa.payload.serviceAudience, "tefa")
  assert.equal(operational.payload.serviceAudience, "operasional")
  assert.notEqual(tefa.id, operational.id)
  assert.equal(hasDraftContent(tefa), false)
  await drafts.save("tefa", async () => { throw new Error("Blank selection must not write") })
  assert.equal(drafts.get("tefa")?.status, "idle")
})

test("operational and TEFA drafts save independently, restore separately and clear only their own slot", async () => {
  const drafts = new ReportCategoryDrafts([]), tefa = drafts.ensure("tefa"), operational = drafts.ensure("layanan")
  const proof = { id: crypto.randomUUID(), name: "proof.pdf", mimeType: "application/pdf", size: 5 }
  drafts.capture("tefa", { ...tefa.payload, title: "Kendala E-Learning", service: "JTI E-Learning" }, [proof], [])
  drafts.capture("layanan", { ...operational.payload, title: "Dokumen belum diproses", service: "Administrasi", program: "TIF" }, [], [])
  let finish!: (value: DraftView) => void
  const late = new Promise<DraftView>(resolve => { finish = resolve })
  const tefaSave = drafts.save("tefa", async () => late)
  const ops = await drafts.save("layanan", async draft => ack(draft))
  assert.equal(drafts.get("tefa")?.status, "saving")
  finish(ack(drafts.get("tefa")!))
  const savedTefa = await tefaSave
  const restored = new ReportCategoryDrafts([ack(ops), ack(savedTefa)])
  assert.equal(restored.get("tefa")?.payload.title, "Kendala E-Learning")
  assert.equal(restored.get("layanan")?.payload.title, "Dokumen belum diproses")
  assert.deepEqual(restored.get("tefa")?.retained, [proof])
  restored.capture("tefa", { ...emptyReportPayload, category: "layanan" }, [], [])
  await restored.save("tefa", async draft => ({ clearedDraftId: draft.id }))
  assert.equal(hasDraftContent(restored.get("tefa")!), false)
  assert.equal(restored.get("layanan")?.payload.title, "Dokumen belum diproses")
})

test("wrong-audience acknowledgments preserve raw TEFA input and do not announce a successful save", async () => {
  const drafts = new ReportCategoryDrafts([]), tefa = drafts.ensure("tefa")
  drafts.capture("tefa", { ...tefa.payload, title: "Masih diisi" }, [], [])
  const result = await drafts.save("tefa", async draft => ({ ...ack(draft), payload: { ...draft.payload, serviceAudience: "operasional" } }))
  assert.equal(result.status, "error")
  assert.equal(result.notice, 0)
  assert.equal(result.payload.title, "Masih diisi")
  assert.equal(drafts.get("layanan"), undefined)
})

test("legacy JTI drafts restore to TEFA and server-supplied metadata handles custom service names", () => {
  const legacy = { ...emptyReportPayload, category: "layanan" as const, service: "JTI Surat", title: "Draft lama" }
  assert.equal(getReportFormCategory(legacy), "tefa")
  assert.equal(getReportFormCategory({ ...legacy, service: "Layanan baru", serviceAudience: "tefa" }), "tefa")
  const draft: DraftView = { id: crypto.randomUUID(), revision: 1, payload: legacy, attachments: [], updatedAt: new Date().toISOString() }
  assert.equal(new ReportCategoryDrafts([draft]).get("tefa")?.id, draft.id)
  const catalog = [{ name: "Tanpa prefiks JTI", handlerRole: "tefa" as const }, { name: "JTI tetapi dikelola Manajemen", handlerRole: "manajemen" as const }]
  assert.deepEqual(servicesForFormCategory(catalog, "tefa").map(row => row.name), [catalog[0].name])
  assert.deepEqual(servicesForFormCategory(catalog, "layanan").map(row => row.name), [catalog[1].name])
})

test("preview preserves the explicit audience while old payloads and unrelated categories remain compatible", () => {
  const now = new Date("2026-11-08T01:00:00Z")
  const raw = { ...emptyReportPayload, category: "layanan", service: "JTI Surat", serviceAudience: "tefa", title: "Surat tidak terbuka", description: "Halaman tidak terbuka", incidentTimeMode: "automatic" }
  const snapshot = createReportSubmissionSnapshot(raw, [], [], now)
  const body = JSON.parse(String(reportSubmissionBody(snapshot, crypto.randomUUID(), 0).get("data")))
  assert.equal(body.payload.category, "layanan")
  assert.equal(body.payload.serviceAudience, "tefa")
  assert.equal(parsePayload({ ...raw, serviceAudience: undefined }, true, now).serviceAudience, undefined)
  assert.throws(() => parsePayload({ ...raw, serviceAudience: "admin" }, false), /kelompok layanan/)
  assert.equal(parsePayload({ ...raw, category: "lainnya" }, false).serviceAudience, undefined)
  assert.match(renderToStaticMarkup(<ReportCategoryBadge category="layanan" serviceAudience="tefa" />), /Layanan JTI \(TEFA\)/)
  assert.match(renderToStaticMarkup(<ReportCategoryBadge category="layanan" serviceAudience="operasional" />), /Layanan Operasional/)
})
