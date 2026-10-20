import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import { renderToStaticMarkup } from "react-dom/server"
import { navigationByRole } from "../src/components/navigation/nav-config"
import { parseTefaFilter, requireTefa } from "../src/features/tefa/domain/tefa"
import { ReportError } from "../src/features/reports/domain/report"
import { parseMasterCommand } from "../src/features/operations/domain/operations"
import { TefaOverview } from "../src/features/tefa/components/tefa-workspace"

test("TEFA only accepts service filters in their own active/history scope", () => {
  assert.equal(parseTefaFilter().lifecycle, "active")
  assert.equal(parseTefaFilter({ view: "history", status: "ditolak", serviceId: "service-1" }).lifecycle, "closed")
  for (const raw of [{ category: "fasilitas" }, { view: "all" }, { status: "selesai" }, { view: "history", status: "baru" }, { serviceId: {} }, { serviceId: "" }, { cursor: "" }]) assert.throws(() => parseTefaFilter(raw), ReportError)
  for (const role of ["pelapor", "satpam", "teknisi", "manajemen", "admin"]) assert.throws(() => requireTefa({ id: "fixture", role }), ReportError)
})
test("Service routing is explicit and cannot target non-service roles", () => {
  const input = { entity: "services", name: "Layanan uji", isActive: true }
  assert.equal(parseMasterCommand({ ...input, handlerRole: "tefa" }).handlerRole, "tefa")
  assert.equal(parseMasterCommand(input).handlerRole, undefined, "Old clients preserve the existing assignment on edit")
  for (const handlerRole of ["admin", "pelapor", "satpam", "teknisi", "", {}, null]) assert.throws(() => parseMasterCommand({ ...input, handlerRole }), ReportError)
})
test("TEFA navigation/pages stay protected and runtime does not import demo reports", () => {
  assert.ok(navigationByRole.tefa.every((item) => item.url.startsWith("/tefa/")))
  for (const page of ["dashboard", "laporan", "riwayat", "profil", "notifikasi"]) assert.match(readFileSync(`src/app/(protected)/tefa/${page}/page.tsx`, "utf8"), /requireRole\("tefa"\)/)
  const workspace = readFileSync("src/features/tefa/components/tefa-workspace.tsx", "utf8")
  assert.doesNotMatch(workspace, /mock\/|PreviewProvider|createTefaPreview/)
  assert.match(workspace, /api\/tefa\/reports/)
  const dialog = readFileSync("src/features/tefa/components/tefa-report-detail.tsx", "utf8")
  assert.match(dialog, /action=\{action\}/)
  assert.ok(dialog.indexOf('aria-label="Progres penanganan"') < dialog.indexOf('title="Detail laporan"'))
  assert.ok(dialog.indexOf('title="Detail laporan"') < dialog.indexOf('title="Lampiran"'))
  assert.ok(dialog.indexOf('title="Lampiran"') < dialog.indexOf("Riwayat status</h3>"))
})
test("Live dashboard renders real totals and safe empty states with shared KPI cards", () => {
  const html = renderToStaticMarkup(<TefaOverview data={{ newReports: 0, inProgress: 0, completedThisMonth: 0, activeServiceReports: 0, queue: [], updatedAt: "", services: [] }} onOpen={() => {}} />)
  assert.equal((html.match(/>Detail<\/span>/g) ?? []).length, 4)
  assert.match(html, /Tidak ada laporan yang perlu ditangani/)
  assert.doesNotMatch(html, /Data contoh|Pratinjau|simulasi/)
})
