// A page can finish saving its own unsaved work before the application session is revoked.
type PendingWork = () => Promise<void>
const beforeSignOut = new Set<PendingWork>()

export function registerBeforeSignOut(task: PendingWork) {
  beforeSignOut.add(task)
  return () => { beforeSignOut.delete(task) }
}

export async function flushBeforeSignOut() {
  for (const task of beforeSignOut) await task()
}
