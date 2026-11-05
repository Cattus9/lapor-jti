import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { matchingCandidates } from "../src/features/lost-found/domain/matching-candidates"
import { MatchingCandidateCard } from "../src/features/lost-found/components/satpam-lost-found-workspace"
import type { InventoryItem } from "../src/features/lost-found/domain/inventory"
import type { SatpamLostFoundReport } from "../src/features/lost-found/types"

const report: SatpamLostFoundReport = { id: "report-one", ticket: "LJ-2026-1", title: "Dompet ditemukan", kind: "temuan", status: "Baru", reporter: "Penemu", location: "Lab", description: "Dompet hitam", characteristics: "", attachments: 0, eventDate: "26 Oktober", eventTime: "10.00", submittedAt: "26 Okt 2026, 10.00", updatedAt: "26 Okt 2026, 10.00", submittedAtIso: "2026-10-26T03:00:00.000Z" }
const item: InventoryItem = { id: "stock-one", itemName: "Dompet", description: "Dompet hitam", sourceFoundTicket: report.ticket, sourceFoundTitle: report.title, sourceFoundSubmittedAt: report.submittedAt, matchingDateIso: report.submittedAtIso, status: "tersimpan", storageLocation: "Pos Satpam", registeredByName: "Petugas", createdAt: "26 Okt 2026, 10.10", updatedAt: "26 Okt 2026, 10.10" }

test("a newly submitted report is visible without a processing-status filter", () => {
  assert.equal(matchingCandidates([report], [])[0].custody, "belum-diterima")
})

test("physical receipt retains identity, title, position date and selection key, without duplicate candidates", () => {
  const before = matchingCandidates([report], [])[0]
  const after = matchingCandidates([report], [item])
  assert.equal(after.length, 1, "Overlapping report/inventory refreshes must not duplicate a physical item")
  assert.equal(after[0].id, before.id)
  assert.equal(after[0].title, before.title)
  assert.equal(after[0].sortDate, before.sortDate)
  assert.equal(after.find(candidate => candidate.id === before.id)?.custody, "di-pos")
})

test("custody filters describe physical location rather than report status; direct receipts need no report", () => {
  const direct = { ...item, id: "direct", sourceFoundTicket: undefined }
  const reports = [report, { ...report, id: "second", ticket: "LJ-2026-2", status: "Diproses" as const }]
  assert.equal(matchingCandidates(reports, [item, direct]).length, 3)
  assert.equal(matchingCandidates(reports, [item, direct], "belum-diterima").length, 1)
  assert.equal(matchingCandidates(reports, [item, direct], "di-pos").length, 2)
})

test("terminal reports and handed-over stock cannot be selected again through stale report rows", () => {
  assert.deepEqual(matchingCandidates([{ ...report, status: "Selesai" }], []), [])
  assert.deepEqual(matchingCandidates([report], [{ ...item, status: "diserahkan" }]), [])
  assert.deepEqual(matchingCandidates([{ ...report, inventoryId: item.id }], []), [])
})

test("candidate controls expose selection and cannot act while data is being refreshed", () => {
  const candidate = matchingCandidates([report], [item])[0]
  const html = renderToStaticMarkup(<MatchingCandidateCard candidate={candidate} selected disabled onSelect={() => {}} detail={null} />)
  assert.match(html, /Tersimpan di pos/)
  assert.match(html, /aria-pressed="true"/)
  assert.match(html, /disabled/)
  assert.doesNotMatch(html, /Laporan Temuan|Inventaris Pos|LJ-2026-1/)
  const pending = renderToStaticMarkup(<MatchingCandidateCard candidate={matchingCandidates([report], [])[0]} selected={false} disabled={false} onSelect={() => {}} detail={null} />)
  assert.match(pending, /Belum diterima di pos/)
  assert.match(pending, /aria-pressed="false"/)
})
