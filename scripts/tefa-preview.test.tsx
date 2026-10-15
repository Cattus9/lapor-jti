import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { navigationByRole } from "../src/components/navigation/nav-config"
import { appRoles } from "../src/lib/auth/roles"
import { parseUserCommand } from "../src/features/operations/domain/operations"
import { filterTefaPreview, tefaPreviewServices, updateTefaPreview } from "../src/features/tefa/domain/tefa-preview"
import { createTefaPreviewReports } from "../src/features/tefa/mock/tefa-reports"
import { TefaOverview, TefaReportList } from "../src/features/tefa/components/tefa-workspace"
import { TefaPreviewNotice } from "../src/features/tefa/components/tefa-ui"
import { requireReporter, ReportError } from "../src/features/reports/domain/report"
import { requireManagement } from "../src/features/management/domain/management"
import { requireSatpam } from "../src/features/lost-found/domain/satpam"
import { requireTechnician } from "../src/features/facilities/domain/technician"

test("TEFA role can be provisioned by the existing operational user command and has only TEFA navigation", () => {
  assert.ok(appRoles.includes("tefa"))
  assert.equal(parseUserCommand({ name: "Petugas TEFA", email: "tefa@example.invalid", role: "tefa", isActive: true, password: "fixture-Password-123" }).role, "tefa")
  assert.ok(navigationByRole.tefa.length >= 4)
  assert.ok(navigationByRole.tefa.every((item) => item.url.startsWith("/tefa/")))
  for (const route of ["dashboard", "laporan", "riwayat", "profil"]) assert.match(readFileSync(`src/app/(protected)/tefa/${route}/page.tsx`, "utf8"), /requireRole\("tefa"\)/)
  assert.match(readFileSync("src/app/(protected)/tefa/layout.tsx", "utf8"), /requireRole\("tefa"\)/)
})

test("TEFA examples support service/search/status filters and separate closed reports", () => {
  const rows = createTefaPreviewReports()
  assert.equal(filterTefaPreview(rows, { history: false }).length, 3)
  assert.equal(filterTefaPreview(rows, { history: true }).length, 1)
  assert.equal(filterTefaPreview(rows, { history: false, query: "  MATERI  " }).length, 1)
  assert.equal(filterTefaPreview(rows, { history: false, service: "JTI Surat", status: "Diproses" }).length, 1)
  assert.equal(filterTefaPreview(rows, { history: false, service: "Administrasi" }).length, 0)
  assert.ok(rows.every((row) => tefaPreviewServices.includes(row.service)))
})

test("TEFA does not inherit any existing role's report permissions", () => {
  for (const guard of [requireReporter, requireManagement, requireSatpam, requireTechnician]) assert.throws(() => guard({ id: "tefa-fixture", role: "tefa" }), (error: unknown) => error instanceof ReportError && error.status === 403)
})

test("Simulated actions retain history and require a note for terminal decisions without mutating fixtures", () => {
  const rows = createTefaPreviewReports()
  const id = rows[0].id
  const now = "2026-10-15T05:00:00Z"
  assert.throws(() => updateTefaPreview(rows, id, "Selesai", "Selesai", "Petugas", now))
  assert.throws(() => updateTefaPreview(rows, id, "Ditolak", " ", "Petugas", now))
  const processing = updateTefaPreview(rows, id, "Diproses", "", "Petugas", now)
  const completed = updateTefaPreview(processing, id, "Selesai", "Akses materi telah pulih.", "Petugas", now)
  assert.equal(completed[0].history.length, 3)
  assert.equal(completed[0].history.at(-1)?.note, "Akses materi telah pulih.")
  assert.equal(filterTefaPreview(completed, { history: true }).length, 2)
  assert.equal(rows[0].status, "Baru")
  assert.equal(createTefaPreviewReports()[0].history.length, 1)
  assert.throws(() => updateTefaPreview(completed, id, "Diproses", "", "Petugas", now))
})

test("TEFA screens disclose simulation, use shared KPIs and render search/filter/empty states", () => {
  const notice = renderToStaticMarkup(<TefaPreviewNotice reset={() => {}} />)
  assert.match(notice, /Data contoh/)
  assert.match(notice, /tidak disimpan ke database/)
  const rows = createTefaPreviewReports()
  const overview = renderToStaticMarkup(<TefaOverview reports={rows} onOpen={() => {}} />)
  assert.match(overview, /Cakupan layanan TEFA/)
  assert.equal((overview.match(/>Detail<\/span>/g) ?? []).length, 4)
  const list = renderToStaticMarkup(<TefaReportList reports={rows} history={false} onOpen={() => {}} />)
  assert.match(list, /type="search"/)
  assert.match(list, /aria-haspopup="dialog"/)
  assert.doesNotMatch(list, /LJ-\d/)
  assert.match(renderToStaticMarkup(<TefaReportList reports={[]} history={true} onOpen={() => {}} />), /Belum ada laporan contoh yang ditutup/)
})
