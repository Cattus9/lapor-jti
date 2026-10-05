import type { PublicAttachment } from "../application/ports"
import { isUuid, parsePayload, ReportError, type ReportPayload } from "../domain/report"

export type ReportSubmissionSnapshot = {
  payload: ReportPayload
  retained: PublicAttachment[]
  files: File[]
}

// Copy the reviewed values. Confirmation must not reread a disabled or edited form.
export function createReportSubmissionSnapshot(raw: unknown, retained: PublicAttachment[], files: File[], now = new Date()): ReportSubmissionSnapshot {
  const payload = parsePayload(raw, true, now)
  if (retained.length + files.length > 4) throw new ReportError("Maksimal 4 lampiran per laporan.")
  if (retained.some((file) => !isUuid(file.id)) || new Set(retained.map((file) => file.id)).size !== retained.length) throw new ReportError("Daftar lampiran tidak valid. Muat ulang draft Anda.")
  for (const file of files) {
    if (!["image/jpeg", "image/png", "application/pdf"].includes(file.type) || file.size === 0 || file.size > 5 * 1024 * 1024) throw new ReportError("Lampiran harus JPG, PNG, atau PDF, maksimal 5 MB per file.")
    if (!file.name || file.name.length > 255 || /[\x00-\x1f\x7f]/.test(file.name)) throw new ReportError("Nama lampiran tidak valid.")
  }
  // File objects are immutable; signature and ownership checks still run on the server.
  return { payload, retained: retained.map((file) => ({ ...file })), files: [...files] }
}

export function reportSubmissionBody(snapshot: ReportSubmissionSnapshot, id: string, revision: number) {
  const body = new FormData()
  body.set("data", JSON.stringify({ id, revision, payload: snapshot.payload, retainedAttachmentIds: snapshot.retained.map((file) => file.id) }))
  for (const file of snapshot.files) body.append("files", file)
  return body
}

export function reportSubmissionRows(payload: ReportPayload) {
  const rows = [
    { label: "Judul laporan", value: payload.title },
    { label: "Tanggal kejadian", value: new Intl.DateTimeFormat("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" }).format(new Date(`${payload.incidentDate}T00:00:00+07:00`)) },
    { label: "Waktu kejadian", value: `${payload.incidentTime.replace(":", ".")} WIB` },
    { label: "Lokasi kejadian", value: payload.category === "fasilitas" && payload.location === "Lainnya" ? payload.otherLocation : payload.location },
  ]
  if (payload.category === "kehilangan-temuan") rows.push(
    { label: "Jenis laporan", value: payload.reportType },
    { label: "Nama barang", value: payload.itemName },
    { label: "Ciri-ciri barang", value: payload.itemDetails },
  )
  if (payload.category === "fasilitas") rows.push({ label: "Objek fasilitas", value: payload.facilities.map((name) => name === "Lainnya" ? payload.otherFacility : name).join(", ") })
  if (payload.category === "layanan") rows.push({ label: "Jenis layanan", value: payload.service }, { label: "Unit / program studi", value: payload.program })
  if (payload.category === "lainnya") rows.push({ label: "Kategori umum", value: payload.otherCategory })
  rows.push({ label: "Deskripsi laporan", value: payload.description })
  return rows
}
