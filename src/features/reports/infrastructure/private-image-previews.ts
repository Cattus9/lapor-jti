import sharp from "sharp"
import { ReportError } from "../domain/report"

type Preview = { bytes: Uint8Array; mimeType: string }

// Private, bounded process cache, never Next's public image optimizer/cache.
// Callers MUST authorize and resolve the current database record before calling read().
export class PrivateImagePreviews {
  private readonly entries = new Map<string, { preview: Preview; expires: number }>()
  private readonly pending = new Map<string, Promise<Preview>>()
  private readonly waiters: (() => void)[] = []
  private active = 0
  private bytes = 0

  async read(key: string, load: () => Promise<Uint8Array>): Promise<Preview> {
    const cached = this.entries.get(key)
    if (cached && cached.expires > Date.now()) {
      this.entries.delete(key); this.entries.set(key, cached)
      return cached.preview
    }
    if (cached) this.forget(key)
    const inFlight = this.pending.get(key)
    if (inFlight) return inFlight
    if (this.pending.size >= 32) throw new ReportError("Pratinjau sedang sibuk. Coba lagi sebentar.", 503)
    const task = this.create(key, load)
    this.pending.set(key, task)
    try { return await task } finally { this.pending.delete(key) }
  }

  forget(key: string) {
    const old = this.entries.get(key)
    if (old) { this.bytes -= old.preview.bytes.length; this.entries.delete(key) }
  }

  private async create(key: string, load: () => Promise<Uint8Array>): Promise<Preview> {
    if (this.active >= 2) await new Promise<void>((resolve) => this.waiters.push(resolve))
    else this.active++
    try {
      const input = await load()
      if (!input.length || input.length > 5 * 1024 * 1024) throw new ReportError("Foto tidak dapat dipratinjau.", 422)
      let output: Buffer
      try {
        const image = sharp(input, { limitInputPixels: 24_000_000, failOn: "warning", animated: false })
        const meta = await image.metadata()
        if (!["jpeg", "png", "webp"].includes(meta.format ?? "")) throw new Error("Unsupported preview format")
        output = await image.rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).webp({ quality: 75 }).timeout({ seconds: 5 }).toBuffer()
      } catch { throw new ReportError("Foto tidak dapat dipratinjau. Gunakan unduhan file asli.", 422) }
      const preview = { bytes: new Uint8Array(output), mimeType: "image/webp" }
      while (this.entries.size >= 64 || this.bytes + output.length > 8 * 1024 * 1024) {
        const oldest = this.entries.keys().next().value
        if (oldest === undefined) break
        this.forget(oldest)
      }
      if (output.length <= 8 * 1024 * 1024) {
        this.entries.set(key, { preview, expires: Date.now() + 60_000 }); this.bytes += output.length
      }
      return preview
    } finally {
      const next = this.waiters.shift()
      if (next) next()
      else this.active--
    }
  }
}

export const privateImagePreviews = new PrivateImagePreviews()
