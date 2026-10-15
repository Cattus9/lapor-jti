import type { ReportPayload } from "./report"
import { getReportServicePolicy } from "./service-policy"

export function getReportServiceHint(service: string) {
  if (!service) return "Pilih layanan yang ingin dilaporkan."
  if (service === "Kebersihan") return "Untuk area kotor atau sampah menumpuk. Objek rusak dilaporkan melalui Kerusakan Fasilitas."
  if (service === "Keamanan") return "Untuk kejadian atau kondisi yang memerlukan penanganan keamanan."
  if (getReportServicePolicy(service).group === "jti") return "Sebutkan fitur yang bermasalah dan kendalanya pada deskripsi."
  return "Pilih unit atau program studi yang berkaitan dengan laporan."
}

export function getReportDescriptionPresentation(category: string, service: string) {
  if (category === "layanan" && service === "Kebersihan") return {
    label: "Kondisi yang perlu dibersihkan",
    placeholder: "Contoh: Sampah menumpuk di dekat tangga dan belum dibersihkan.",
  }
  if (category === "layanan" && service === "Keamanan") return {
    label: "Uraian kejadian",
    placeholder: "Jelaskan kejadian atau kondisi yang Anda lihat beserta informasi yang membantu petugas.",
  }
  if (category === "layanan" && getReportServicePolicy(service).group === "jti") return {
    label: "Deskripsi kendala",
    placeholder: "Sebutkan fitur atau halaman terkait, kendala yang terjadi, dan pesan error jika ada.",
  }
  return {
    label: "Deskripsi laporan",
    placeholder: category === "kehilangan-temuan" ? "Jelaskan ciri barang dan kronologi kehilangan atau penemuan." : "Jelaskan kronologi, kondisi, atau kendala secara singkat dan jelas.",
  }
}

export function getReportServiceTitlePlaceholder(service: string) {
  if (service === "Kebersihan") return "Contoh: Sampah menumpuk di tangga lantai 2"
  if (service === "Keamanan") return "Contoh: Aktivitas mencurigakan di parkiran motor"
  if (service === "Administrasi") return "Contoh: Pengajuan dokumen belum diproses"
  return service ? `Contoh: Kendala saat menggunakan ${service}` : "Contoh: Kendala pada layanan yang dipilih"
}

// Preserve useful text from drafts written before a service's location field was removed.
// Only draft presentation uses this fallback; submitted historical rows are never rewritten.
export function getReportDraftDescription(payload?: ReportPayload) {
  if (!payload) return undefined
  return [
    payload.description,
    payload.category === "kehilangan-temuan" ? payload.itemDetails : "",
    payload.category === "layanan" && getReportServicePolicy(payload.service).locationMode === "hidden" && payload.location
      ? `Konteks dari draft sebelumnya: ${payload.location}` : "",
  ].filter(Boolean).join("\n\n")
}
