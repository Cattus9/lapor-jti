import test from "node:test"
import assert from "node:assert/strict"
import { parseTechnicianCommand, parseTechnicianFilter, requireTechnician, technicianExpectedStatus } from "../src/features/facilities/domain/technician"
import { TechnicianService } from "../src/features/facilities/application/technician-service"
import type { TechnicianRepository } from "../src/features/facilities/application/ports"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import { assertTransition, ReportError } from "../src/features/reports/domain/report"
import { defaultReportFilters, reportDateBounds } from "../src/features/reports/domain/report-list-filters"

const actor = { id: "00000000-0000-4000-8000-000000000001", role: "teknisi" }
const command = { ticket: "LJ-2026-00001", status: "selesai", note: "Lampu diganti dan diuji." }
test("Teknisi authorization uses the database role, independently of login provider", () => {
  requireTechnician(actor)
  for (const role of ["pelapor", "satpam", "manajemen", "admin", ""]) assert.throws(() => requireTechnician({ ...actor, role }), (e: unknown) => e instanceof ReportError && e.status === 403)
})
test("Completion and rejection require bounded, nonempty notes; spoofed identity is ignored", () => {
  assert.deepEqual(parseTechnicianCommand({ ...command, note: ` ${command.note} `, actorId: "spoof", actorName: "spoof" }), command)
  for (const status of ["selesai", "ditolak"]) for (const note of [undefined, null, " ", {}, "x".repeat(2001), "bad\u0000note"]) assert.throws(() => parseTechnicianCommand({ ...command, status, note }), ReportError)
  for (const status of ["diverifikasi", "diproses"]) assert.equal(parseTechnicianCommand({ ticket: command.ticket, status }).note, "")
})
test("Invalid status coercion, foreign lifecycle steps and malformed tickets are rejected", () => {
  for (const status of ["baru", "barang_teridentifikasi", "diserahkan", ["selesai"], {}, true, null]) assert.throws(() => parseTechnicianCommand({ ...command, status }), ReportError)
  for (const ticket of ["bad", "LJ-2026-", "LJ-2026-000000000000000", null]) assert.throws(() => parseTechnicianCommand({ ...command, ticket }), ReportError)
})
test("Shared facility lifecycle is sequential and terminal states cannot reopen", () => {
  for (const [from, to] of [["baru", "diverifikasi"], ["diverifikasi", "diproses"], ["diproses", "selesai"], ["baru", "ditolak"]] as const) { assertTransition("fasilitas", from, to); assert.equal(technicianExpectedStatus(to), from) }
  for (const [from, to] of [["baru", "diproses"], ["baru", "selesai"], ["diproses", "ditolak"], ["selesai", "diproses"], ["ditolak", "diverifikasi"]] as const) assert.throws(() => assertTransition("fasilitas", from, to), ReportError)
})
test("Filters validate sort, scope, calendar ranges and bounded literal search", () => {
  assert.deepEqual(parseTechnicianFilter(), { status: "semua", sort: "terbaru", period: "semua", from: "", to: "", query: "", locationId: undefined, activeOnly: false, classifiedOnly: false, cursor: undefined })
  const filter = parseTechnicianFilter({ q: "  %_  ", active: "1", classified: "1", locationId: "ruang-3-2", sort: "terlama", period: "rentang", from: "2026-10-01", to: "2026-10-05" })
  assert.equal(filter.query, "%_"); assert.equal(filter.activeOnly, true); assert.equal(filter.classifiedOnly, true)
  for (const value of [{ status: "diserahkan" }, { sort: "asc" }, { sort: {} }, { period: "__proto__" }, { period: "rentang", from: "2026-02-30", to: "2026-03-01" }, { period: "rentang", from: "2026-10-05", to: "2026-10-04" }, { active: true }, { classified: true }, { locationId: "../" }, { q: "a".repeat(201) }, { q: {} }, { cursor: "a".repeat(161) }]) assert.throws(() => parseTechnicianFilter(value), ReportError)
})
test("Today means WIB calendar day, including at UTC date boundaries", () => {
  const bounds = reportDateBounds({ ...defaultReportFilters, period: "hari-ini" }, new Date("2026-10-04T17:00:00Z"))
  assert.equal(bounds.from?.toISOString(), "2026-10-04T17:00:00.000Z")
  assert.equal(bounds.until?.toISOString(), "2026-10-05T17:00:00.000Z")
})
test("Service stops unauthorized or invalid writes before repository access", async () => {
  let calls = 0
  const repository = { execute: async () => { calls++ } } as unknown as TechnicianRepository
  const service = new TechnicianService(repository, {} as AttachmentStorage)
  await assert.rejects(service.execute({ ...actor, role: "pelapor" }, command), ReportError)
  await assert.rejects(service.execute(actor, { ...command, note: "" }), ReportError)
  assert.equal(calls, 0)
  await service.execute(actor, command); assert.equal(calls, 1)
})
test("Every service read has a role guard, and history forces completed scope", () => {
  let calls = 0
  const repository = { list: (filter: { status: string; activeOnly: boolean }, history: boolean) => { calls++; assert.equal(filter.status, "selesai"); assert.equal(filter.activeOnly, false); assert.equal(history, true); return Promise.resolve({ items: [], total: 0, nextCursor: null }) } } as unknown as TechnicianRepository
  const service = new TechnicianService(repository, {} as AttachmentStorage)
  const other = { ...actor, role: "satpam" }
  for (const read of [() => service.list(other, {}), () => service.history(other, {}), () => service.dashboard(other), () => service.priorities(other), () => service.notifications(other), () => service.markRead(other)]) assert.throws(read, ReportError)
  service.history(actor, { status: "baru", active: "1" }); assert.equal(calls, 1)
})
test("Details and downloads require valid identifiers and never read storage on denied scope", async () => {
  let reads = 0
  const repository = { detail: async () => null, attachment: async () => null } as unknown as TechnicianRepository
  const service = new TechnicianService(repository, { read: async () => { reads++; return new Uint8Array() } } as unknown as AttachmentStorage)
  await assert.rejects(service.detail(actor, command.ticket), (e: unknown) => e instanceof ReportError && e.status === 404)
  await assert.rejects(service.download(actor, actor.id), ReportError)
  await assert.rejects(service.download({ ...actor, role: "pelapor" }, actor.id), ReportError)
  assert.equal(reads, 0)
})
