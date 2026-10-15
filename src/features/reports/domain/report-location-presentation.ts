import { getReportServicePolicy } from "./service-policy"

export function getReportLocationPresentation(category: string, service = "") {
  if (category !== "layanan") return {
    visible: true,
    required: true,
    label: "Lokasi kejadian",
    placeholder: "Contoh: Gedung JTI, Ruang 3.4",
    description: "Sebutkan area, gedung, atau ruangan tempat kejadian berlangsung.",
  }

  if (service && getReportServicePolicy(service).group === "jti") return {
    visible: false,
    required: false,
    label: "Halaman atau fitur terkait",
    placeholder: "Contoh: Halaman login atau fitur yang tidak dapat digunakan",
    description: "Sebutkan halaman, fitur, atau tahapan layanan yang bermasalah. Tidak perlu mengisi lokasi gedung.",
  }

  if (service === "Kebersihan" || service === "Keamanan") return {
    visible: true,
    required: true,
    label: "Lokasi yang perlu ditangani",
    placeholder: service === "Kebersihan" ? "Contoh: Toilet lantai 2 atau tangga Gedung JTI" : "Contoh: Parkiran motor atau pintu samping Gedung JTI",
    description: "Sebutkan area, gedung, atau ruangan agar petugas dapat menemukan lokasinya.",
  }

  return {
    visible: getReportServicePolicy(service).locationMode !== "hidden",
    required: getReportServicePolicy(service).locationMode === "required",
    label: "Lokasi atau kanal layanan",
    placeholder: "Contoh: Loket administrasi, lantai 2, atau portal layanan",
    description: "Untuk layanan langsung, isi gedung atau ruangan. Untuk layanan online, sebutkan kanal atau platformnya.",
  }
}
