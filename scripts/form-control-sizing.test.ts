import test from "node:test"
import assert from "node:assert/strict"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { Input } from "../src/components/ui/input"
import { Select, SelectTrigger, SelectValue } from "../src/components/ui/select"

function selectMarkup(props: Parameters<typeof SelectTrigger>[0] = {}) {
  return renderToStaticMarkup(createElement(Select, null,
    createElement(SelectTrigger, { "aria-label": "Filter", ...props }, createElement(SelectValue, { placeholder: "Pilih filter" })),
  ))
}
function controlClasses(markup: string, slot: "input" | "select-trigger") {
  const tag = markup.match(new RegExp(`<[^>]*data-slot="${slot}"[^>]*>`))?.[0]
  assert.ok(tag, `Missing ${slot} control`)
  return (tag.match(/class="([^"]*)"/)?.[1] ?? "").split(" ")
}

test("Normal Input and SelectTrigger share the global 36px height", () => {
  const input = controlClasses(renderToStaticMarkup(createElement(Input)), "input")
  const select = controlClasses(selectMarkup(), "select-trigger")
  assert.ok(input.includes("h-9"))
  assert.ok(select.includes("h-9"))
  assert.ok(select.includes("py-1"))
  assert.ok(select.every((token) => !/^data-.*:h-/.test(token)), "Attribute height selectors must not override local height utilities")
})

test("Compact Select size remains opt-in and preserves its data-size API", () => {
  const markup = selectMarkup({ size: "sm" })
  const classes = controlClasses(markup, "select-trigger")
  assert.ok(classes.includes("h-7"))
  assert.ok(!classes.includes("h-9"))
  assert.match(markup, /data-size="sm"/)
})

test("Local select height overrides merge normally, without important workarounds", () => {
  for (const className of ["h-11", "h-12", "h-8"]) {
    const classes = controlClasses(selectMarkup({ className }), "select-trigger")
    assert.ok(classes.includes(className))
    assert.ok(!classes.includes("h-9"))
  }
  const compact = controlClasses(selectMarkup({ size: "sm", className: "h-9" }), "select-trigger")
  assert.ok(compact.includes("h-9"))
  assert.ok(!compact.includes("h-7"))
})

test("Existing important overrides and enlarged Login fields remain supported", () => {
  const select = controlClasses(selectMarkup({ className: "!h-11 w-full" }), "select-trigger")
  assert.ok(select.includes("!h-11"))
  const input = controlClasses(renderToStaticMarkup(createElement(Input, { className: "h-12 px-3.5" })), "input")
  assert.ok(input.includes("h-12"))
  assert.ok(!input.includes("h-9"))
})

test("Disabled, invalid and keyboard-focus states remain on both primitives", () => {
  for (const [slot, markup] of [
    ["input", renderToStaticMarkup(createElement(Input, { disabled: true, "aria-invalid": true }))],
    ["select-trigger", selectMarkup({ disabled: true, "aria-invalid": true })],
  ] as const) {
    const classes = controlClasses(markup, slot)
    assert.match(markup, /disabled=""/)
    assert.match(markup, /aria-invalid="true"/)
    assert.ok(classes.includes("focus-visible:ring-3"))
    assert.ok(classes.includes("aria-invalid:border-destructive"))
  }
})
