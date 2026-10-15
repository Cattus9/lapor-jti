// Frontend-only contract. These examples never authorize access or write to reports.
export const tefaPreviewServices = ["JTI E-Learning", "JTI Evaluasi Pembelajaran", "JTI Ruang Baca", "JTI Surat"] as const
export type TefaPreviewStatus = "Baru" | "Diproses" | "Selesai" | "Ditolak"
export type TefaPreviewReport = {
  id: string
  service: typeof tefaPreviewServices[number]
  title: string
  reporter: string
  submittedAt: string
  description: string
  status: TefaPreviewStatus
  history: Array<{ status: TefaPreviewStatus; at: string; actor: string; note: string }>
}

export function isTefaPreviewClosed(status: TefaPreviewStatus) {
  return status === "Selesai" || status === "Ditolak"
}

export function filterTefaPreview(reports: readonly TefaPreviewReport[], filters: { history: boolean; query?: string; service?: string; status?: string }) {
  const query = filters.query?.trim().toLocaleLowerCase("id-ID") ?? ""
  return reports.filter((report) => isTefaPreviewClosed(report.status) === filters.history
    && (!filters.service || filters.service === "all" || report.service === filters.service)
    && (!filters.status || filters.status === "all" || report.status === filters.status)
    && (!query || [report.title, report.reporter, report.service].some((value) => value.toLocaleLowerCase("id-ID").includes(query))))
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
}

export function updateTefaPreview(reports: readonly TefaPreviewReport[], id: string, status: TefaPreviewStatus, note: string, actor: string, at: string): TefaPreviewReport[] {
  const report = reports.find((row) => row.id === id)
  if (!report || !((report.status === "Baru" && (status === "Diproses" || status === "Ditolak")) || (report.status === "Diproses" && status === "Selesai"))) throw new Error("Tahap penanganan contoh tidak valid.")
  if ((status === "Selesai" || status === "Ditolak") && (!note.trim() || note.length > 2000)) throw new Error("Isi catatan dengan maksimal 2.000 karakter.")
  return reports.map((row) => row.id !== id ? row : { ...row, status, history: [...row.history, { status, note: note.trim() || "Contoh penanganan dimulai.", actor, at }] })
}
