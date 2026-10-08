import test from "node:test"
import assert from "node:assert/strict"
import { parseManagementCommand, parseManagementFilter, requireManagement, managementExpectedStatus, requireManagementNotificationId } from "../src/features/management/domain/management"
import { ManagementService } from "../src/features/management/application/management-service"
import { managementCsv, managementCsvCell } from "../src/features/management/domain/management-csv"
import type { ManagementRepository } from "../src/features/management/application/ports"
import type { ManagementReport } from "../src/features/management/types"
import type { AttachmentStorage } from "../src/features/reports/application/ports"
import { assertTransition, ReportError } from "../src/features/reports/domain/report"
import { defaultReportFilters, reportDateBounds } from "../src/features/reports/domain/report-list-filters"

const actor = { id: "00000000-0000-4000-8000-000000000001", role: "manajemen" }
const command = { ticket: "LJ-2026-00001", status: "selesai", note: "Tanggapan akhir disampaikan." }
test("Manajemen is the application database role, not any other role or identity-provider claim", () => {
  requireManagement(actor)
  for (const role of ["pelapor", "satpam", "teknisi", "admin", ""]) assert.throws(() => requireManagement({ ...actor, role }), (e: unknown) => e instanceof ReportError && e.status === 403)
})
test("Management completion and rejection require bounded notes; client identity is ignored", () => {
  assert.deepEqual(parseManagementCommand({ ...command, note: ` ${command.note} `, actorId: "spoof", actorName: "spoof" }), command)
  for (const status of ["selesai", "ditolak"]) for (const note of [undefined, null, " ", {}, "x".repeat(2001), "bad\u0000note"]) assert.throws(() => parseManagementCommand({ ...command, status, note }), ReportError)
  assert.equal(parseManagementCommand({ ticket: command.ticket, status: "diproses" }).note, "")
})
test("Foreign lifecycle actions, malformed tickets and status coercion are rejected", () => {
  for (const status of ["baru", "diverifikasi", "barang_teridentifikasi", "diserahkan", ["selesai"], {}, true, null]) assert.throws(() => parseManagementCommand({ ...command, status }), ReportError)
  for (const ticket of ["bad", "LJ-2026-", "LJ-2026-000000000000000", null]) assert.throws(() => parseManagementCommand({ ...command, ticket }), ReportError)
})
test("Both owned categories follow Baru -> Diproses -> Selesai, or initial rejection", () => {
  for (const category of ["layanan", "lainnya"] as const) {
    for (const [from, to] of [["baru", "diproses"], ["diproses", "selesai"], ["baru", "ditolak"]] as const) { assertTransition(category, from, to); assert.equal(managementExpectedStatus(to), from) }
    for (const [from, to] of [["baru", "selesai"], ["baru", "diverifikasi"], ["diproses", "ditolak"], ["selesai", "diproses"], ["ditolak", "diproses"]] as const) assert.throws(() => assertTransition(category, from, to), ReportError)
  }
})
test("Operational filters deny foreign categories, while monitoring accepts all categories", () => {
  for (const category of ["fasilitas", "kehilangan-temuan"]) { assert.equal(parseManagementFilter({ category }).category, category); assert.throws(() => parseManagementFilter({ category }, true), ReportError) }
  assert.throws(() => parseManagementFilter({ status: "diverifikasi" }, true), ReportError)
  for (const value of [{ category: "__proto__" }, { status: {} }, { sort: "asc" }, { period: "__proto__" }, { q: {} }, { q: "x".repeat(201) }, { cursor: "x".repeat(161) }, { period: "rentang", from: "2026-02-30", to: "2026-03-01" }, { period: "rentang", from: "2026-10-05", to: "2026-10-04" }]) assert.throws(() => parseManagementFilter(value), ReportError)
  assert.equal(parseManagementFilter({ q: " %_ " }).query, "%_")
})
test("Management calendar periods use WIB, independent of host timezone", () => {
  const bounds = reportDateBounds({ ...defaultReportFilters, period: "hari-ini" }, new Date("2026-10-04T17:00:00Z"))
  assert.equal(bounds.from?.toISOString(), "2026-10-04T17:00:00.000Z"); assert.equal(bounds.until?.toISOString(), "2026-10-05T17:00:00.000Z")
})
test("Completion date filters are explicit and restricted to completed reports", () => {
  assert.equal(parseManagementFilter({ status: "selesai", date: "completed", period: "bulan-ini" }, true).dateBasis, "completed")
  for (const value of [{ date: "completed" }, { status: "diproses", date: "completed" }, { date: {} }, { date: "updated" }]) assert.throws(() => parseManagementFilter(value), ReportError)
  assert.equal(parseManagementFilter({ status: "belum-selesai" }, true).status, "belum-selesai")
})
test("Every service read is guarded, and export/operational scope cannot be client-switched", async () => {
  let calls = 0
  const repository = { list: async (_filter: unknown, operational: boolean) => { calls++; return operational }, export: async () => { calls++; return [] } } as unknown as ManagementRepository
  const service = new ManagementService(repository, {} as AttachmentStorage), other = { ...actor, role: "teknisi" }
  for (const read of [() => service.list(other, {}), () => service.dashboard(other), () => service.statistics(other, {}), () => service.notifications(other), () => service.markRead(other)]) assert.throws(read, ReportError)
  await assert.rejects(service.export(other, {}), ReportError)
  await assert.rejects(service.export(actor, { category: "fasilitas" }), ReportError)
  assert.equal(calls, 0)
  assert.equal(await service.list(actor, {}, false), false); assert.equal(await service.list(actor, {}), true)
})
test("Invalid writes stop before repository access", async () => {
  let calls = 0
  const repository = { execute: async () => { calls++ } } as unknown as ManagementRepository
  const service = new ManagementService(repository, {} as AttachmentStorage)
  await assert.rejects(service.execute({ ...actor, role: "pelapor" }, command), ReportError)
  await assert.rejects(service.execute(actor, { ...command, note: "" }), ReportError)
  assert.equal(calls, 0); await service.execute(actor, command); assert.equal(calls, 1)
})
test("Details, private files and recipient updates validate identifiers before IO", async () => {
  let reads = 0
  const repository = { detail: async () => null, attachment: async () => null } as unknown as ManagementRepository
  const service = new ManagementService(repository, { read: async () => { reads++; return new Uint8Array() } } as unknown as AttachmentStorage)
  await assert.rejects(service.detail(actor, command.ticket), (e: unknown) => e instanceof ReportError && e.status === 404)
  await assert.rejects(service.download(actor, actor.id), ReportError)
  await assert.rejects(service.download({ ...actor, role: "pelapor" }, actor.id), ReportError)
  for (const id of ["bad", "", "../"]) assert.throws(() => requireManagementNotificationId(id), ReportError)
  assert.equal(reads, 0)
})
test("Custom analytics ranges are capped before querying", () => {
  const service = new ManagementService({} as ManagementRepository, {} as AttachmentStorage)
  assert.throws(() => service.statistics(actor, { period: "rentang", from: "1000-01-01", to: "9998-01-01" }), ReportError)
})
test("CSV quoting, BOM, multiline content and formula prefixes are handled safely", () => {
  assert.equal(managementCsvCell('Kata "kutip"'), '"Kata ""kutip"""')
  for (const value of ["=1+1", "+cmd", "-1", "@SUM(1)", " \t=1", "\n=1", "\tplain"]) assert.ok(managementCsvCell(value).startsWith('"\''), value)
  const csv = managementCsv([{ ticket: command.ticket, title: "=1+1", category: "Layanan", service: "JTI Surat", reporter: "Pelapor", location: "Portal", status: "Selesai", submittedAt: "7 Okt 2026, 10.00" } as ManagementReport])
  assert.ok(csv.startsWith("\uFEFF")); assert.ok(csv.includes('"\'=1+1"')); assert.ok(csv.includes("\r\n"))
})
