import "server-only"
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises"
import { join, resolve } from "node:path"
import { randomUUID } from "node:crypto"
import { ReportError, type AttachmentUpload, type StoredAttachment } from "../domain/report"
import type { AttachmentStorage } from "../application/ports"

export class PrivateFileStorage implements AttachmentStorage {
  // Runtime volume, not a build asset. Do not trace/upload user files into Next standalone output.
  private readonly root = resolve(/* turbopackIgnore: true */ process.env.REPORT_UPLOAD_DIR || "storage/reports")
  private path(key: string) {
    if (!/^[0-9a-f-]{36}$/.test(key)) throw new Error("Invalid storage key")
    return join(this.root, key)
  }
  async store(files: AttachmentUpload[]) {
    const stored: StoredAttachment[] = []
    try {
      if (files.length) await mkdir(this.root, { recursive: true, mode: 0o700 })
      for (const file of files) {
        const item = { id: randomUUID(), storageKey: randomUUID(), name: file.name, mimeType: file.mimeType, size: file.bytes.length }
        await writeFile(this.path(item.storageKey), file.bytes, { flag: "wx", mode: 0o600 })
        stored.push(item)
      }
      return stored
    } catch (error) { await this.remove(stored); throw error }
  }
  async remove(files: StoredAttachment[]) {
    for (const file of files) {
      try { await unlink(this.path(file.storageKey)) }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") console.error("Private attachment cleanup failed; an orphan file may need maintenance.") }
    }
  }
  async read(file: StoredAttachment) {
    try { return new Uint8Array(await readFile(this.path(file.storageKey))) }
    catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") throw new ReportError("File lampiran tidak tersedia.", 404)
      throw error
    }
  }
}
