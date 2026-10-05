import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import ts from "typescript"

// Static navigation contracts; visual and interaction checks remain manual.
function readSource(path: string) {
  return ts.createSourceFile(path, readFileSync(new URL(path, import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
}
function findFunction(source: ts.SourceFile, name: string) {
  const node = source.statements.find((statement): statement is ts.FunctionDeclaration => ts.isFunctionDeclaration(statement) && statement.name?.text === name)
  assert.ok(node, `Missing function ${name}`)
  return node
}
const dashboard = readSource("../src/features/lost-found/components/satpam-dashboard.tsx")
const workspace = readSource("../src/features/lost-found/components/satpam-lost-found-workspace.tsx")
const page = readSource("../src/app/(protected)/satpam/kehilangan-temuan/page.tsx")

test("queue rows provide a compact soft-blue Shadcn link CTA to the encoded ticket detail", () => {
  const queue = findFunction(dashboard, "QueueReport")
  const buttons: ts.JsxOpeningElement[] = []
  function visit(node: ts.Node) {
    if (ts.isJsxOpeningElement(node) && node.tagName.getText(dashboard) === "Button") buttons.push(node)
    ts.forEachChild(node, visit)
  }
  visit(queue)
  assert.equal(buttons.length, 1)
  const attrs = buttons[0].attributes.properties.filter(ts.isJsxAttribute)
  assert.equal(attrs.find((attr) => attr.name.getText(dashboard) === "nativeButton")?.getText(dashboard), "nativeButton={false}")
  assert.equal(attrs.find((attr) => attr.name.getText(dashboard) === "variant")?.getText(dashboard), 'variant="outline"')
  assert.equal(attrs.find((attr) => attr.name.getText(dashboard) === "size")?.getText(dashboard), 'size="xs"')
  const classes = attrs.find((attr) => attr.name.getText(dashboard) === "className")?.getText(dashboard)
  assert.ok(classes?.includes("bg-primary/5 text-primary-action-hover"))
  assert.ok(classes?.includes("hover:text-primary-action-hover"))
  assert.ok(classes?.includes("dark:text-primary"))
  const render = attrs.find((attr) => attr.name.getText(dashboard) === "render")?.getText(dashboard)
  assert.ok(render?.includes("<Link href="))
  assert.ok(render?.includes("/satpam/kehilangan-temuan?ticket=${encodeURIComponent(report.ticket)}&detail=1"))
  assert.ok(attrs.find((attr) => attr.name.getText(dashboard) === "aria-label")?.getText(dashboard).includes("report.ticket"))
})

test("automatic detail opening is explicit and preserves the server role guard", () => {
  const route = findFunction(page, "SatpamLostFoundPage").getText(page)
  assert.ok(route.includes('requireRole("satpam")'))
  assert.ok(route.includes('openDetail={query.detail === "1"}'))
  const content = findFunction(workspace, "SatpamLostFoundContent").getText(workspace)
  assert.ok(content.includes("openDetail = false"))
  assert.ok(content.includes("if (selectTab) setActiveTab(report.kind)"))
})

test("deep links use the shared detail context once, with the matching ticket and focus trigger", () => {
  const notification = findFunction(workspace, "NotificationReport").getText(workspace)
  assert.ok(notification.includes("useContext(ReportDetailContext)"))
  assert.ok(notification.includes("!openDetail || !detail.data"))
  assert.ok(notification.includes("detail.data.report.ticket !== ticket"))
  assert.ok(notification.includes("openedTicket.current === ticket"))
  assert.ok(notification.includes('[data-report-detail]'))
  assert.ok(notification.includes("if (!trigger || !openReport) return"))
  const mark = notification.indexOf("openedTicket.current = ticket")
  const open = notification.indexOf("openReport(detail.data.report, trigger, true)")
  assert.ok(mark >= 0 && open > mark, "Mark the ticket before opening to avoid reopening during refresh or Strict Mode")
  assert.ok(!notification.includes("<ReportDetailDialog"))
})
