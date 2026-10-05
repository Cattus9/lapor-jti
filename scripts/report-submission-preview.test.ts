import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import ts from "typescript"
import { emptyReportPayload, ReportError } from "../src/features/reports/domain/report"
import { createReportSubmissionSnapshot, reportSubmissionBody, reportSubmissionRows } from "../src/features/reports/components/report-submission-state"

const now = new Date("2026-10-04T12:00:00Z")
const payload = { ...emptyReportPayload, category: "kehilangan-temuan" as const, title: " Dompet hilang ", description: " Kronologi\nbaris kedua ", incidentDate: "2026-10-03", incidentTime: "09:00", location: "Lobi JTI", reportType: "Kehilangan", itemName: "Dompet", itemDetails: "Hitam" }
const attachment = { id: "00000000-0000-4000-8000-000000000001", name: "bukti.pdf", mimeType: "application/pdf", size: 100 }
const file = () => new File(["%PDF-1.7"], "bukti-baru.pdf", { type: "application/pdf" })

test("Preview uses complete domain validation before opening, not just HTML required fields", () => {
  for (const patch of [{ title: " " }, { description: "" }, { incidentDate: "2026-10-05" }, { incidentTime: "25:00" }, { reportType: "" }, { itemDetails: "" }, { title: "x".repeat(201) }]) assert.throws(() => createReportSubmissionSnapshot({ ...payload, ...patch }, [], [], now), ReportError)
  const snapshot = createReportSubmissionSnapshot(payload, [], [], now)
  assert.equal(snapshot.payload.title, "Dompet hilang")
  assert.equal(snapshot.payload.description, "Kronologi\nbaris kedua")
})
test("Reviewed payload, facility arrays and attachment lists do not drift when form inputs change", () => {
  const raw = { ...payload, category: "fasilitas", facilities: ["AC", "Lainnya"], otherFacility: "Kipas", location: "Lainnya", otherLocation: "Samping lobi" }
  const retained = [{ ...attachment }], uploads = [file()]
  const snapshot = createReportSubmissionSnapshot(raw, retained, uploads, now)
  raw.title = "Judul diganti"; raw.facilities.push("Komputer"); raw.otherLocation = "Tempat lain"
  retained[0].name = "Nama diganti"; retained.length = 0; uploads.length = 0
  assert.equal(snapshot.payload.title, "Dompet hilang")
  assert.deepEqual(snapshot.payload.facilities, ["AC", "Lainnya"])
  assert.equal(snapshot.retained[0].name, "bukti.pdf")
  assert.equal(snapshot.files.length, 1)
  const rows = reportSubmissionRows(snapshot.payload)
  assert.equal(rows.find((row) => row.label === "Lokasi kejadian")?.value, "Samping lobi")
  assert.equal(rows.find((row) => row.label === "Objek fasilitas")?.value, "AC, Kipas")
  assert.ok(!rows.some((row) => row.label === "Nama barang"))
})
test("Preview shows relevant details for every report category and resolves WIB dates consistently", () => {
  for (const category of ["kehilangan-temuan", "fasilitas", "layanan", "lainnya"] as const) {
    const snapshot = createReportSubmissionSnapshot({ ...payload, category, facilities: ["LCD"], service: "E-Learning", program: "Teknik Informatika", otherCategory: "Usulan" }, [], [], now)
    const rows = reportSubmissionRows(snapshot.payload)
    assert.equal(rows.find((row) => row.label === "Tanggal kejadian")?.value, "3 Oktober 2026")
    assert.equal(rows.find((row) => row.label === "Waktu kejadian")?.value, "09.00 WIB")
    assert.equal(rows.at(-1)?.value, "Kronologi\nbaris kedua")
    const expected = category === "kehilangan-temuan" ? "Ciri-ciri barang" : category === "fasilitas" ? "Objek fasilitas" : category === "layanan" ? "Unit / program studi" : "Kategori umum"
    assert.ok(rows.some((row) => row.label === expected))
  }
})
test("Confirmation serializes the reviewed payload and both retained and new files", async () => {
  const snapshot = createReportSubmissionSnapshot(payload, [attachment], [file()], now)
  const id = "00000000-0000-4000-8000-000000000002"
  const body = reportSubmissionBody(snapshot, id, 3)
  assert.deepEqual(JSON.parse(String(body.get("data"))), { id, revision: 3, payload: snapshot.payload, retainedAttachmentIds: [attachment.id] })
  const upload = body.get("files") as File
  assert.equal(upload.name, "bukti-baru.pdf")
  assert.equal(await upload.text(), "%PDF-1.7")
  // The same id/revision are reused on retry; server idempotency is not bypassed.
  assert.equal(reportSubmissionBody(snapshot, id, 3).get("data"), body.get("data"))
})
test("Preview rejects excessive, empty, unsupported or malformed attachment metadata", () => {
  for (const files of [[file(), file(), file(), file()], [new File([], "empty.pdf", { type: "application/pdf" })], [new File(["test"], "bad.txt", { type: "text/plain" })], [new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.png", { type: "image/png" })], [new File(["test"], "x".repeat(256), { type: "image/jpeg" })]]) assert.throws(() => createReportSubmissionSnapshot(payload, [attachment], files, now), ReportError)
  assert.throws(() => createReportSubmissionSnapshot(payload, [attachment, attachment], [], now), ReportError)
})
test("The form's submit event opens a preview; only its explicit confirmation dispatches submission", () => {
  const code = readFileSync(new URL("../src/features/reports/components/report-form.tsx", import.meta.url), "utf8")
  const source = ts.createSourceFile("form.tsx", code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
  const functions = new Map<string, string>()
  let preview: ts.JsxSelfClosingElement | undefined
  function visit(node: ts.Node) {
    if (ts.isFunctionDeclaration(node) && node.name) functions.set(node.name.text, node.getText(source))
    if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "ReportSubmissionPreview") preview = node
    ts.forEachChild(node, visit)
  }
  visit(source)
  const submit = functions.get("handleSubmit")!
  assert.match(submit, /reportValidity\(\)/)
  assert.match(submit, /createReportSubmissionSnapshot/)
  assert.ok(!submit.includes("save(true") && !submit.includes("fetch("))
  const confirm = preview?.attributes.properties.filter(ts.isJsxAttribute).find((attr) => attr.name.getText(source) === "onConfirm")?.getText(source)
  assert.ok(confirm?.includes("save(true, preview)"))
  const save = functions.get("save")!
  assert.match(save, /busy\.current/)
  assert.match(save, /confirmed !== preview/)
  assert.match(save, /parsePayload\(snapshot\.payload, true\)/)
  assert.match(save, /reportSubmissionBody\(snapshot, draftId, revision\)/)
  assert.match(save, /tone: "success"/)
  assert.match(save, /tone: "warning"/)
})
