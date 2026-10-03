// Domain values are independent of Next.js, React, Drizzle, and the login provider.
export const reportCategories = ["kehilangan-temuan", "fasilitas", "layanan", "lainnya"] as const
export const reportStatuses = ["baru", "diverifikasi", "diproses", "barang_teridentifikasi", "diserahkan", "selesai", "ditolak"] as const
export type ReportCategory = typeof reportCategories[number]
export type ReportStatus = typeof reportStatuses[number]
export type ReportHandler = "satpam" | "teknisi" | "manajemen"
export type ReportActor = { id: string; role: string }
export const statusLabels: Record<ReportStatus, string> = { baru: "Baru", diverifikasi: "Diverifikasi", diproses: "Diproses", barang_teridentifikasi: "Barang teridentifikasi", diserahkan: "Diserahkan", selesai: "Selesai", ditolak: "Ditolak" }
export const handlerByCategory: Record<ReportCategory, ReportHandler> = { "kehilangan-temuan": "satpam", fasilitas: "teknisi", layanan: "manajemen", lainnya: "manajemen" }
export const lifecycleByCategory: Record<ReportCategory, readonly ReportStatus[]> = {
  "kehilangan-temuan": ["baru", "diverifikasi", "diproses", "barang_teridentifikasi", "diserahkan", "selesai"],
  fasilitas: ["baru", "diverifikasi", "diproses", "selesai"],
  layanan: ["baru", "diproses", "selesai"], lainnya: ["baru", "diproses", "selesai"],
}
export class ReportError extends Error {
  constructor(message: string, public readonly status = 400) { super(message) }
}
export function requireReporter(actor: ReportActor) {
  if (actor.role !== "pelapor") throw new ReportError("Akses hanya untuk Pelapor.", 403)
}
export function assertTransition(category: ReportCategory, from: ReportStatus, to: ReportStatus) {
  const stages = lifecycleByCategory[category]
  if (stages.indexOf(from) < 0 || from === "selesai" || from === "ditolak" || (to !== stages[stages.indexOf(from) + 1] && !(from === "baru" && to === "ditolak"))) {
    throw new ReportError("Perubahan status tidak valid.")
  }
}
export type ReportPayload = {
  category: ReportCategory; title: string; description: string; incidentDate: string; incidentTime: string
  location: string; otherLocation: string; reportType: string; itemName: string; itemDetails: string
  facilities: string[]; otherFacility: string; service: string; program: string; otherCategory: string
}
export const emptyReportPayload: ReportPayload = {
  category: "lainnya", title: "", description: "", incidentDate: "", incidentTime: "", location: "", otherLocation: "",
  reportType: "", itemName: "", itemDetails: "", facilities: [], otherFacility: "", service: "", program: "", otherCategory: "",
}
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)
}
export function parsePayload(raw: unknown, submitted: boolean): ReportPayload {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) throw new ReportError("Isian laporan tidak valid.")
  const value = raw as Record<string, unknown>
  if (!reportCategories.includes(value.category as ReportCategory)) throw new ReportError("Pilih kategori laporan yang valid.")
  const payload = { ...emptyReportPayload, category: value.category as ReportCategory }
  for (const key of Object.keys(emptyReportPayload) as (keyof ReportPayload)[]) {
    if (key === "category" || key === "facilities") continue
    const item = value[key] ?? ""
    const limit = key === "description" || key === "itemDetails" ? 5000 : key === "title" ? 200 : 300
    if (typeof item !== "string" || item.length > limit || /\u0000/.test(item)) throw new ReportError(`Isian ${key} tidak valid atau terlalu panjang.`)
    payload[key] = item.trim()
  }
  const objects = value.facilities ?? []
  if (!Array.isArray(objects) || objects.length > 20 || objects.some((item) => typeof item !== "string" || item.length > 100)) throw new ReportError("Pilihan objek fasilitas tidak valid.")
  payload.facilities = [...new Set(objects)]
  if (payload.incidentDate && (!/^\d{4}-\d{2}-\d{2}$/.test(payload.incidentDate) || !Number.isFinite(Date.parse(payload.incidentDate + "T00:00:00Z")) || new Date(payload.incidentDate + "T00:00:00Z").toISOString().slice(0, 10) !== payload.incidentDate)) throw new ReportError("Tanggal kejadian tidak valid.")
  if (payload.incidentTime && !/^([01]\d|2[0-3]):[0-5]\d$/.test(payload.incidentTime)) throw new ReportError("Waktu kejadian tidak valid.")
  if (submitted) {
    const required: (keyof ReportPayload)[] = ["title", "description", "incidentDate", "incidentTime", "location"]
    if (payload.category === "kehilangan-temuan") required.push("reportType", "itemName", "itemDetails")
    if (payload.category === "fasilitas") {
      if (!payload.facilities.length) throw new ReportError("Pilih minimal satu objek fasilitas.")
      if (payload.location === "Lainnya") required.push("otherLocation")
      if (payload.facilities.includes("Lainnya")) required.push("otherFacility")
      const names = payload.facilities.map((name) => (name === "Lainnya" ? payload.otherFacility : name).toLocaleLowerCase("id-ID"))
      if (new Set(names).size !== names.length) throw new ReportError("Objek fasilitas yang sama tidak perlu dipilih dua kali.")
    }
    if (payload.category === "layanan") required.push("service", "program")
    if (payload.category === "lainnya") required.push("otherCategory")
    if (required.some((key) => !payload[key])) throw new ReportError("Lengkapi informasi laporan sebelum mengirim.")
  }
  if (payload.reportType && !["Kehilangan", "Temuan"].includes(payload.reportType)) throw new ReportError("Jenis laporan tidak valid.")
  // Do not persist hidden fields left over after a category change.
  if (payload.category !== "kehilangan-temuan") { payload.reportType = ""; payload.itemName = ""; payload.itemDetails = "" }
  if (payload.category !== "fasilitas") { payload.facilities = []; payload.otherFacility = ""; payload.otherLocation = "" }
  if (payload.category !== "layanan") { payload.service = ""; payload.program = "" }
  if (payload.category !== "lainnya") payload.otherCategory = ""
  return payload
}
export type AttachmentUpload = { name: string; mimeType: string; bytes: Uint8Array }
export type StoredAttachment = { id: string; name: string; mimeType: string; size: number; storageKey: string }
export function validateUploads(files: AttachmentUpload[], retainedCount: number) {
  if (files.length + retainedCount > 4) throw new ReportError("Maksimal 4 lampiran per laporan.")
  for (const file of files) {
    const b = file.bytes
    const valid = file.mimeType === "image/png" ? b.length >= 8 && [137,80,78,71,13,10,26,10].every((v,i) => b[i] === v)
      : file.mimeType === "image/jpeg" ? b.length >= 3 && b[0] === 255 && b[1] === 216 && b[2] === 255
      : file.mimeType === "application/pdf" && b.length >= 5 && String.fromCharCode(...b.subarray(0,5)) === "%PDF-"
    if (!valid || b.length === 0 || b.length > 5 * 1024 * 1024) throw new ReportError("Lampiran harus JPG, PNG, atau PDF yang valid, maksimal 5 MB.")
    if (!file.name || file.name.length > 255 || /[\x00-\x1f\x7f]/.test(file.name)) throw new ReportError("Nama lampiran tidak valid.")
  }
}
