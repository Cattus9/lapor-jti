import test from "node:test"
import assert from "node:assert/strict"
import { renderToStaticMarkup } from "react-dom/server"
import { getReportServicePolicy, groupReportServices } from "../src/features/reports/domain/service-policy"
import { emptyReportPayload, handlerByCategory, parsePayload, ReportError } from "../src/features/reports/domain/report"
import { createReportSubmissionSnapshot, reportSubmissionBody, reportSubmissionRows } from "../src/features/reports/components/report-submission-state"
import { ServiceReportFields } from "../src/features/reports/components/service-report-fields"
import { ReportLocationField } from "../src/features/reports/components/report-location-field"
import { getReportLocationPresentation } from "../src/features/reports/domain/report-location-presentation"
import { getReportDescriptionPresentation, getReportDraftDescription, getReportServiceTitlePlaceholder } from "../src/features/reports/domain/report-form-copy"

const operationalServices = ["Administrasi", "Keamanan", "Kebersihan"]
const jtiServices = ["JTI E-Learning", "JTI Evaluasi Pembelajaran", "JTI Ruang Baca", "JTI Surat"]
const fieldServices = ["Keamanan", "Kebersihan"]
const services = [...operationalServices, ...jtiServices]
const now = new Date("2026-10-15T03:00:00Z")
const base = { ...emptyReportPayload, category: "layanan" as const, title: "Kendala layanan", description: "Layanan tidak dapat digunakan.", location: "Portal JTI", incidentTimeMode: "automatic" as const }

test("Service metadata distinguishes the seven known services without guessing from a JTI prefix", () => {
  assert.deepEqual(getReportServicePolicy("Administrasi"), { group: "operasional", requiresProgram: true, locationMode: "hidden" })
  for (const name of fieldServices) assert.deepEqual(getReportServicePolicy(name), { group: "operasional", requiresProgram: false, locationMode: "required" })
  for (const name of jtiServices) assert.deepEqual(getReportServicePolicy(name), { group: "jti", requiresProgram: false, locationMode: "hidden" })
  for (const name of ["", "Layanan custom", "JTI Layanan Baru", "__proto__"]) assert.equal(getReportServicePolicy(name).requiresProgram, true)
  assert.equal(getReportServicePolicy(" JTI Surat ").requiresProgram, false)
  assert.equal(handlerByCategory.layanan, "manajemen", "TEFA routing is outside this change")
})

test("Grouped choices only contain services supplied by the active catalog", () => {
  assert.deepEqual(groupReportServices(["JTI Surat", "Keamanan", "JTI Surat", "Layanan custom"]), [
    { id: "operasional", label: "Operasional", options: ["Keamanan", "Layanan custom"] },
    { id: "jti", label: "Layanan JTI", options: ["JTI Surat"] },
  ])
  assert.deepEqual(groupReportServices([]), [])
  assert.deepEqual(groupReportServices(["JTI Surat"]).map((group) => group.id), ["jti"])
})

test("Administration/custom services require a program on submission but allow incomplete drafts", () => {
  for (const service of ["Administrasi", "Layanan custom"]) {
    assert.throws(() => parsePayload({ ...base, service }, true, now), ReportError)
    assert.equal(parsePayload({ ...base, service }, false, now).program, "")
    assert.equal(parsePayload({ ...base, service, program: "TKK" }, true, now).program, "TKK")
  }
  assert.throws(() => parsePayload({ ...base, service: "", program: "TKK" }, true, now), ReportError)
})

test("JTI, security and cleaning discard stale programs in submissions and drafts", () => {
  for (const service of [...jtiServices, ...fieldServices]) {
    for (const submit of [false, true]) {
      const normalized = parsePayload({ ...base, service, program: "TKK" }, submit, now)
      assert.equal(normalized.program, "")
      assert.equal(normalized.service, service)
    }
    assert.equal(parsePayload({ ...base, service }, true, now).program, "")
  }
  const operational = parsePayload({ ...base, service: "Administrasi", program: "TKK" }, false, now)
  const jti = parsePayload({ ...operational, service: "JTI Surat" }, false, now)
  assert.equal(jti.program, "")
  assert.throws(() => parsePayload({ ...jti, service: "Administrasi" }, true, now), ReportError)
})

test("JTI preview and confirmation omit a hidden program; operational preview retains it", () => {
  const id = "00000000-0000-4000-8000-000000000010"
  for (const service of jtiServices) {
    const snapshot = createReportSubmissionSnapshot({ ...base, service, program: "TKK" }, [], [], now)
    assert.ok(!reportSubmissionRows(snapshot.payload).some((row) => row.label === "Unit / program studi"))
    const serialized = JSON.parse(String(reportSubmissionBody(snapshot, id, 0).get("data")))
    assert.equal(serialized.payload.program, "")
    assert.equal(serialized.payload.service, service)
  }
  const snapshot = createReportSubmissionSnapshot({ ...base, service: "Administrasi", program: "TKK" }, [], [], now)
  assert.equal(reportSubmissionRows(snapshot.payload).find((row) => row.label === "Unit / program studi")?.value, "TKK")
})

function render(service: string, program = "TKK") {
  return renderToStaticMarkup(<ServiceReportFields services={services} service={service} program={program} onServiceChange={() => {}} onProgramChange={() => {}} />)
}

test("Service location context uses clear physical/channel or page/feature labels", () => {
  for (const service of jtiServices) {
    const presentation = getReportLocationPresentation("layanan", service)
    assert.equal(presentation.label, "Halaman atau fitur terkait")
    assert.equal(presentation.visible, false)
    assert.ok(!presentation.placeholder.includes("Gedung"))
  }
  for (const service of ["Administrasi", "", "Layanan custom"]) {
    assert.equal(getReportLocationPresentation("layanan", service).label, "Lokasi atau kanal layanan")
  }
  for (const category of ["kehilangan-temuan", "fasilitas", "lainnya"]) {
    assert.equal(getReportLocationPresentation(category, "JTI Surat").label, "Lokasi kejadian")
  }
  for (const service of fieldServices) assert.equal(getReportLocationPresentation("layanan", service).label, "Lokasi yang perlu ditangani")
})

test("Only relevant location inputs render and keep their conditional required contract", () => {
  for (const service of [...fieldServices, "Layanan custom"]) {
    const html = renderToStaticMarkup(<ReportLocationField category="layanan" service={service} value="Konteks yang sudah diisi" onValueChange={() => {}} />)
    assert.ok(html.includes(getReportLocationPresentation("layanan", service).label))
    assert.match(html, /for="location"/)
    assert.match(html, /name="location"/)
    assert.match(html, /value="Konteks yang sudah diisi"/)
    assert.match(html, /aria-describedby="location-description"/)
    assert.match(html, /required=""/)
    assert.match(html, /data-slot="field-description"[^>]*id="location-description"/)
  }
  for (const service of ["Administrasi", ...jtiServices]) assert.equal(renderToStaticMarkup(<ReportLocationField category="layanan" service={service} value="Old context" onValueChange={() => {}} />), "")
})

test("Preview retains relevant locations and discards hidden locations", () => {
  for (const service of services) {
    const location = "Halaman atau lokasi yang dilaporkan"
    const snapshot = createReportSubmissionSnapshot({ ...base, service, program: "TKK", location }, [], [], now)
    const label = getReportLocationPresentation("layanan", service).label
    if (service === "Administrasi" || jtiServices.includes(service)) {
      assert.ok(!reportSubmissionRows(snapshot.payload).some((row) => row.label === label))
      assert.equal(snapshot.payload.location, "")
    } else assert.equal(reportSubmissionRows(snapshot.payload).find((row) => row.label === label)?.value, location)
    assert.ok(!reportSubmissionRows(snapshot.payload).some((row) => row.label === "Lokasi kejadian"))
  }
})

test("Service fields hide the program for JTI and show a linked Shadcn helper without an empty grid column", () => {
  for (const service of [...jtiServices, ...fieldServices]) {
    const html = render(service)
    assert.match(html, /id="service"/)
    assert.match(html, /aria-describedby="service-description"/)
    assert.match(html, /data-slot="field-description"[^>]*id="service-description"/)
    assert.doesNotMatch(html, /id="program"|sm:grid-cols-2/)
  }
  for (const service of ["Administrasi"]) {
    const html = render(service)
    assert.match(html, /id="program"/)
    assert.match(html, /sm:grid-cols-2/)
    assert.match(html, /Unit atau program studi/)
  }
  assert.doesNotMatch(render(""), /id="program"/)
})

test("Field requirements follow actionable information rather than the handler role", () => {
  for (const service of jtiServices) {
    const payload = parsePayload({ ...base, service, location: "", program: "" }, true, now)
    assert.equal(payload.location, "")
    assert.equal(payload.program, "")
  }
  assert.equal(parsePayload({ ...base, service: "Administrasi", program: "TKK", location: "" }, true, now).location, "")
  for (const service of fieldServices) {
    assert.equal(parsePayload({ ...base, service, program: "" }, true, now).program, "")
    assert.throws(() => parsePayload({ ...base, service, program: "", location: "" }, true, now), ReportError)
  }
  for (const category of ["kehilangan-temuan", "fasilitas", "lainnya"] as const) assert.throws(() => parsePayload({ ...base, category, location: "" }, true, now), ReportError)
})

test("Legacy Administration/JTI draft context is offered in description without rewriting the original payload", () => {
  for (const service of ["Administrasi", ...jtiServices]) {
    const draft = { ...base, service, program: "TKK", location: "Konteks pengajuan sebelumnya", description: "Tidak dapat melanjutkan" }
    const description = getReportDraftDescription(draft)!
    assert.ok(description.includes(draft.description))
    assert.ok(description.includes(draft.location))
    assert.equal(draft.description, "Tidak dapat melanjutkan")
    for (const submitted of [false, true]) {
      const normalized = parsePayload({ ...draft, description }, submitted, now)
      assert.equal(normalized.location, "")
      assert.equal(getReportDraftDescription(normalized), description)
      assert.equal(normalized.program, service === "Administrasi" ? "TKK" : "")
    }
  }
  assert.equal(getReportDescriptionPresentation("layanan", "Kebersihan").label, "Kondisi yang perlu dibersihkan")
  assert.equal(getReportDescriptionPresentation("layanan", "Keamanan").label, "Uraian kejadian")
  assert.match(getReportServiceTitlePlaceholder("Kebersihan"), /Sampah/)
  assert.match(getReportServiceTitlePlaceholder("Keamanan"), /parkiran/)
  assert.match(getReportServiceTitlePlaceholder("JTI Surat"), /JTI Surat/)
})
