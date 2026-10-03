import assert from "node:assert/strict"
import { test } from "node:test"
import { assertTransition, emptyReportPayload, handlerByCategory, parsePayload, ReportError, requireReporter, validateUploads } from "../src/features/reports/domain/report"
import { ReportService } from "../src/features/reports/application/report-service"
import type { AttachmentStorage, ReportRepository } from "../src/features/reports/application/ports"

const actor = { id: "55aaae7e-029c-4aee-a072-33c974ce573c", role: "pelapor" }
const id = "3a2e2715-a970-4a5f-9e27-86f9ce51a9ed"
const complete = { ...emptyReportPayload, title: "Usulan papan informasi", description: "Papan informasi perlu diperbarui.", location: "Lobi JTI", incidentDate: "2026-10-03", incidentTime: "10:15", otherCategory: "Usulan" }
test("draft accepts partial data; submission requires complete category fields", () => {
  assert.equal(parsePayload({ category: "lainnya" }, false).title, "")
  assert.throws(() => parsePayload({ category: "lainnya" }, true), ReportError)
  assert.equal(parsePayload(complete, true).title, complete.title)
})
test("reject malformed dates, time, category, field types, and excessive lengths", () => {
  for (const invalid of [{ incidentDate: "2026-02-30" }, { incidentTime: "25:01" }, { category: "admin" }, { title: 123 }, { title: "x".repeat(201) }]) assert.throws(() => parsePayload({ ...complete, ...invalid }, true), ReportError)
})
test("category details must be complete; hidden data is discarded", () => {
  assert.throws(() => parsePayload({ ...complete, category: "fasilitas", facilities: ["Lainnya"] }, true), ReportError)
  assert.throws(() => parsePayload({ ...complete, category: "kehilangan-temuan", reportType: "Temuan" }, true), ReportError)
  const data = parsePayload({ ...complete, facilities: ["AC"], service: "JTI Surat", itemName: "Dompet" }, true)
  assert.deepEqual(data.facilities, []); assert.equal(data.service, ""); assert.equal(data.itemName, "")
})
test("routing depends on category, not an input role", () => {
  assert.equal(handlerByCategory.fasilitas, "teknisi")
  assert.equal(handlerByCategory["kehilangan-temuan"], "satpam")
  assert.equal(handlerByCategory.layanan, "manajemen")
  assert.throws(() => requireReporter({ ...actor, role: "teknisi" }), ReportError)
})
test("lifecycle rejects skipped, terminal, and category-incompatible transitions", () => {
  assertTransition("fasilitas", "baru", "diverifikasi")
  assertTransition("layanan", "baru", "diproses")
  assertTransition("kehilangan-temuan", "baru", "ditolak")
  for (const [category, from, to] of [["fasilitas", "baru", "selesai"], ["layanan", "baru", "diverifikasi"], ["fasilitas", "diserahkan", "baru"], ["fasilitas", "selesai", "baru"]] as const) assert.throws(() => assertTransition(category, from, to), ReportError)
})
test("attachment limits and signature validation are enforced without UI", () => {
  const file = { name: "bukti.pdf", mimeType: "application/pdf", bytes: new TextEncoder().encode("%PDF-1.7\n") }
  validateUploads([file], 3)
  assert.throws(() => validateUploads([file], 4), ReportError)
  assert.throws(() => validateUploads([{ ...file, mimeType: "image/png" }], 0), ReportError)
  assert.throws(() => validateUploads([{ ...file, bytes: new Uint8Array(5 * 1024 * 1024 + 1) }], 0), ReportError)
})
function dependencies(fail = false, created = true) {
  const removed: string[] = []; let calls = 0
  const stored = { id, name: "bukti.pdf", mimeType: "application/pdf", size: 9, storageKey: id }
  const repository = { write: async () => { calls++; if (fail) throw new ReportError("Conflict", 409); return { created, report: { id, ticketNumber: "LJ-2026-00001" }, removed: [] } } } as unknown as ReportRepository
  const storage: AttachmentStorage = { store: async () => [stored], remove: async (files) => { removed.push(...files.map((file) => file.id)) }, read: async () => new Uint8Array() }
  return { service: new ReportService(repository, storage), removed, calls: () => calls }
}
test("application checks role and payload before persistence", async () => {
  const { service, calls } = dependencies()
  await assert.rejects(service.write({ ...actor, role: "admin" }, {}, [], true), ReportError)
  await assert.rejects(service.write(actor, { id: "invalid", revision: 0 }, [], true), ReportError)
  await assert.rejects(service.write(actor, { id, revision: 0, payload: complete, retainedAttachmentIds: [id, id] }, [], true), ReportError)
  assert.equal(calls(), 0)
})
test("application cleans staged files after a database failure", async () => {
  const { service, removed } = dependencies(true)
  await assert.rejects(service.write(actor, { id, revision: 0, payload: complete }, [], true), ReportError)
  assert.deepEqual(removed, [id])
})
test("idempotent retry discards staged files instead of duplicating committed attachments", async () => {
  const { service, removed } = dependencies(false, false)
  const result = await service.write(actor, { id, revision: 0, payload: complete }, [], true)
  assert.equal(result.report?.id, id); assert.deepEqual(removed, [id])
})
