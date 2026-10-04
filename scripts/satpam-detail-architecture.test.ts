import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import ts from "typescript"

// Static lifecycle regression checks, not browser or interaction automation.
const source = ts.createSourceFile("workspace.tsx", readFileSync(new URL("../src/features/lost-found/components/satpam-lost-found-workspace.tsx", import.meta.url), "utf8"), ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX)
const dialogs: ts.JsxSelfClosingElement[] = []
function visit(node: ts.Node) {
  if (ts.isJsxSelfClosingElement(node) && node.tagName.getText(source) === "ReportDetailDialog") dialogs.push(node)
  ts.forEachChild(node, visit)
}
visit(source)

test("the report detail modal is owned once by the workspace, not removable report rows", () => {
  assert.equal(dialogs.length, 1)
  let parent: ts.Node | undefined = dialogs[0].parent
  while (parent && !ts.isFunctionDeclaration(parent)) parent = parent.parent
  assert.ok(parent && ts.isFunctionDeclaration(parent))
  assert.equal(parent.name?.text, "SatpamLostFoundContent")
})

test("refresh revisions do not control modal mounting or its React key", () => {
  const attrs = dialogs[0].attributes.properties.filter(ts.isJsxAttribute)
  const key = attrs.find((attr) => attr.name.getText(source) === "key")?.getText(source)
  assert.ok(key?.includes("selectedReport.id"))
  assert.ok(key?.includes("detailOpenCycle"))
  assert.ok(!key?.includes("revision"))
  assert.equal(attrs.find((attr) => attr.name.getText(source) === "open")?.getText(source), "open={detailOpen}")
})
