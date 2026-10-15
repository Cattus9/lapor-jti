import type { TefaPreviewReport } from "../domain/tefa-preview"

// Explicit demonstration data only, isolated from PostgreSQL, notifications and uploads.
export function createTefaPreviewReports(): TefaPreviewReport[] {
  const rows: Omit<TefaPreviewReport, "history">[] = [
    { id: "tefa-example-elearning", service: "JTI E-Learning", title: "Materi perkuliahan tidak dapat dibuka", reporter: "Rani Wulandari (contoh)", submittedAt: "2026-10-15T02:15:00Z", description: "Materi pada halaman mata kuliah terus memuat setelah dipilih. Sudah mencoba masuk ulang tetapi kendala masih terjadi.", status: "Baru" },
    { id: "tefa-example-evaluation", service: "JTI Evaluasi Pembelajaran", title: "Evaluasi belum dapat dikirim", reporter: "Fajar Prasetyo (contoh)", submittedAt: "2026-10-15T01:40:00Z", description: "Tombol kirim evaluasi tidak memberikan respons meskipun seluruh pertanyaan sudah diisi.", status: "Baru" },
    { id: "tefa-example-letter", service: "JTI Surat", title: "Dokumen surat tidak dapat diunduh", reporter: "Intan Maharani (contoh)", submittedAt: "2026-10-14T06:10:00Z", description: "Halaman menampilkan surat sudah tersedia, tetapi tautan unduh menghasilkan halaman kosong.", status: "Diproses" },
    { id: "tefa-example-reading", service: "JTI Ruang Baca", title: "Pencarian katalog tidak menampilkan hasil", reporter: "Dimas Saputra (contoh)", submittedAt: "2026-10-13T03:20:00Z", description: "Judul yang sebelumnya tersedia tidak muncul saat dicari pada katalog ruang baca.", status: "Selesai" },
  ]
  return rows.map((row) => {
    return { ...row, history: [
      { status: "Baru", at: row.submittedAt, actor: row.reporter, note: "Laporan contoh dikirim." },
      ...(row.status !== "Baru" ? [{ status: "Diproses" as const, at: row.submittedAt, actor: "Petugas TEFA (contoh)", note: "Kendala sedang diperiksa." }] : []),
      ...(row.status === "Selesai" ? [{ status: "Selesai" as const, at: "2026-10-14T02:00:00Z", actor: "Petugas TEFA (contoh)", note: "Indeks katalog telah diperbarui dan pencarian dapat digunakan kembali." }] : []),
    ] }
  })
}
