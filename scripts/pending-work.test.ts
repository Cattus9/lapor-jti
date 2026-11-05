import test from "node:test"
import assert from "node:assert/strict"
import { flushBeforeSignOut, registerBeforeSignOut } from "../src/lib/pending-work"

test("Pending work must complete before sign-out and failed work prevents continuation", async () => {
  const events: string[] = []
  const unregister = registerBeforeSignOut(async () => { events.push("saved") })
  await flushBeforeSignOut()
  assert.deepEqual(events, ["saved"])
  unregister()
  const removeFailure = registerBeforeSignOut(async () => { throw new Error("offline") })
  await assert.rejects(flushBeforeSignOut(), /offline/)
  removeFailure()
  await flushBeforeSignOut()
  assert.deepEqual(events, ["saved"])
})
