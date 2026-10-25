# Audit frontend: commit 06fd77d

Tanggal audit: 13 Oktober 2026 (WIB).

Commit yang diperiksa: `06fd77d13df310ed32954117485c732181c18ab0`, `Add satpam inventory and history filters`. Pembanding: `ef23001`, versi sebelum push tim. Saat audit, HEAD lokal dan remote `origin/main` sama-sama menunjuk commit yang diperiksa.

Status awal seluruh temuan: **terbuka**. Tindak lanjut Riwayat Pelapor pada 24 Oktober 2026 dicatat di bawah; bagian Inventaris dan alignment sidebar tetap terbuka. Dokumen ini mempertahankan bukti audit awal serta membedakannya dari perbaikan implementasi.

## Cakupan dan metode

Audit berfokus pada perubahan komponen/styling Inventaris Satpam, Riwayat Pelapor, komponen lampiran, serta dugaan perubahan posisi logo sidebar. Pemeriksaan dilakukan melalui diff Git, source komponen, primitive Shadcn, token `src/app/globals.css`, dan gambar yang diberikan pengguna.

Standar acuan: [Dev.md](Dev.md) dan [AGENTS.md](AGENTS.md). Kebutuhan proyek adalah Shadcn, token semantik bersama, helper text `FieldDescription`, dan konsistensi layout.

Tidak dilakukan Preview Mode, browser automation, atau Playwright. Ukuran/alignment yang dibahas merupakan inferensi dari kode, bukan hasil pengukuran browser. Ini bukan audit lengkap seluruh repository atau keamanan/backend.

## Ringkasan temuan

| ID | Temuan | Asal | Status |
| --- | --- | --- | --- |
| UI-01 | Ukuran/typography eksplisit belum dinormalisasi | Ditambahkan pada commit tim | Parsial: Riwayat Pelapor dinormalisasi; Inventaris tetap terbuka |
| UI-02 | Badge/status dan palette warna ditulis ulang di halaman | Ditambahkan pada commit tim | Terbuka |
| UI-03 | Upload foto lokal menduplikasi komponen upload bersama | Ditambahkan pada commit tim | Terbuka |
| UI-04 | Helper format foto tidak memakai FieldDescription | Ditambahkan pada commit tim | Terbuka |
| UI-05 | Glow dan styling status Riwayat Pelapor tersebar di halaman | Ditambahkan pada commit tim | Implementasi Riwayat dinormalisasi 24 Oktober 2026; QA visual manual belum dilakukan |
| LAYOUT-01 | Acuan vertikal brand sidebar berbeda dari toolbar konten | Sudah ada sebelum commit tim | Terbuka |

## UI-01: ukuran dan typography eksplisit

### Tindak lanjut Riwayat Pelapor, 24 Oktober 2026

**Revisi UX 25 Oktober 2026:** keputusan terbaru menggantikan stepper daftar dengan cuplikan deskripsi dua baris. Ikon, kategori, status, waktu kirim dan akses detail tetap dipertahankan. `report-surface` di globals.css memberi lapisan dalam `#FBFBFC` beserta pasangan dark; hover lift 2px dan `shadow-xs` kini diizinkan secara eksplisit pengguna, dengan reduced motion. Modal tetap memakai stepper lengkap. Query daftar menambah preview maksimal 240 karakter dalam query owner yang sama, tanpa N+1; tes PostgreSQL rollback memverifikasi preview dan isolasi owner. Rincian berikut mencatat implementasi 24 Oktober sebelum revisi ini; acuan perilaku terkini ada di OPERATIONS.md.

- Keputusan UX terakhir mempertahankan susunan kartu awal: identitas di atas, status/detail di kanan, progres di bawah. Stepper daftar dibatasi skala tema `max-w-3xl` pada desktop, tidak lagi membentang sepanjang kartu. Ringkasan "Tahap x dari y" dan salinan status di atas bar dihapus. Modal detail tetap memiliki stepper lengkap. Keduanya memakai komponen custom Shadcn `src/components/ui/stepper.tsx`, disusun dari `Badge` dan `Separator` dengan semantik ordered-list. Warna memakai token global `primary`, `muted`, `muted-foreground`, `border`, dan `card`; tidak menambah palette lokal.
- Tahap sebelum posisi saat ini memakai soft blue turunan token primary (bukan abu-abu), tahap saat ini primary solid tanpa glow/ring dekoratif, dan tahap berikutnya memakai track muted netral. Indikator lingkaran dan konektor lampau mengikuti soft blue yang sama; label nonaktif tetap muted agar mudah dibaca tanpa terlalu banyak aksen. Status selesai tetap menonjolkan tahap terakhir, bukan seluruh tahap; status ditolak tetap menjadi pesan penolakan, bukan progres palsu.
- Kartu menggunakan `Card` sebagai trigger dialog non-native yang mempertahankan semantik tombol/keyboard. Ikon dan `ReportCategoryBadge` awal dipertahankan, sedangkan status tetap satu `StatusBadge`. Tanggal dikirim dekat judul; tanggal pembaruan di area progres hanya ditampilkan bila berbeda pada presisi menit tampilan. Tidak menebak pengelola atau keterangan penanganan yang tidak tersedia pada proyeksi server. Glow blur, gambar dekoratif DoneIcon, hover lift/shadow, serta affordance detail yang hanya terlihat saat hover tetap dihapus.
- Label 10/11px menjadi skala `text-xs`. Geometri filter khusus dipusatkan pada `--report-history-filter-width` dan `--report-history-filter-columns` di globals.css; override tinggi Select `!h-9` dihapus karena primitive sudah menyediakan ukuran standar.
- Ring fokus keyboard pada kartu/dialog tetap dipertahankan. Bayangan modal dan wrapper berlapis yang berasal dari primitive/token bersama tidak diubah secara global. Tidak ada perubahan lifecycle, query, indeks, atau migration pada revisi UI ini.
- Regression tersedia di `scripts/pelapor-history-ui.test.tsx`: hierarki kartu semua lifecycle dengan kategori/status terpisah, progres terbatas tanpa ringkasan berulang, tanggal identik/berbeda, seluruh jumlah tahap kategori, aria-current, komposisi Shadcn, tokenisasi, dan penghapusan glow. Tes ini memeriksa source/hasil render statis, bukan hasil klik atau pengukuran visual browser. QA manual terang/gelap/mobile tetap diperlukan.

Pada baris frontend baru ditemukan 10 baris dengan nilai ukuran eksplisit lokal. Rinciannya:

| File | Baris pada commit audit | Nilai lokal |
| --- | --- | --- |
| `src/features/lost-found/components/satpam-inventory-workspace.tsx` | 121 | `w-[180px]` untuk dropdown status |
| File Inventaris yang sama | 277 | `text-[11px]` untuk foto tidak tersedia |
| File Inventaris yang sama | 284 | `max-w-[120px]` untuk nama penemu |
| File Inventaris yang sama | 302 | `text-[11px]` untuk metadata tanggal |
| File Inventaris yang sama | 304 | `max-w-[95px]` untuk tanggal |
| File Inventaris yang sama | 543 | `text-[11px]` untuk helper format foto |
| File Inventaris yang sama | 587 | `min-w-[150px]` untuk tombol submit |
| `src/features/reports/components/pelapor-report-history-list.tsx` | 122 | `text-[11px]` untuk metadata |
| File Riwayat Pelapor yang sama | 149 | `text-[10px]` untuk label tahap |
| File Riwayat Pelapor yang sama | 170 | `text-[11px]` untuk metadata |

Bukti: [dropdown Inventaris](src/features/lost-found/components/satpam-inventory-workspace.tsx#L121), [metadata tanggal](src/features/lost-found/components/satpam-inventory-workspace.tsx#L302), dan [typography Riwayat Pelapor](src/features/reports/components/pelapor-report-history-list.tsx#L122).

Dampak: ukuran tersebar di fitur, sulit diselaraskan melalui tema/komponen bersama, dan lebar tanggal `95px` berpotensi memotong informasi waktu yang penting. Pemotongan aktual pada setiap viewport masih perlu QA manual.

Rekomendasi:

- Gunakan skala spacing/typography yang sudah menjadi standar proyek, misalnya `text-xs` bila hierarkinya sesuai.
- Jika nilai khusus memang diperlukan dan berulang, definisikan token semantik di `globals.css` dan/atau variant komponen bersama.
- Untuk tanggal, utamakan layout yang memungkinkan informasi terbaca penuh pada ukuran layar yang relevan.
- Jangan menganggap semua bracket Tailwind sebagai hardcode bermasalah. Ekspresi layout responsif, selector state, dan nilai CSS yang bersumber dari token perlu dinilai menurut fungsinya; temuan ini menunjuk nilai ukuran lokal spesifik di atas.

## UI-02: badge/status dan palette lokal

Inventaris menulis badge status sendiri dengan `<span>`, `inline-flex`, border/radius, serta palette emerald. Pola tersebut muncul pada card dan header dialog:

- [Status pada card Inventaris](src/features/lost-found/components/satpam-inventory-workspace.tsx#L289): `bg-emerald-500/15`, `border-emerald-500/30`, `text-emerald-600`, dan pasangan dark mode lokal.
- [Status pada dialog Inventaris](src/features/lost-found/components/satpam-inventory-workspace.tsx#L675): markup badge lain dengan opacity, border, dan radius berbeda.
- [Panel hasil penyerahan](src/features/lost-found/components/satpam-inventory-workspace.tsx#L810): styling sukses emerald kembali ditulis di fitur.

Proyek sudah memiliki [Badge](src/components/ui/badge.tsx) dengan tone `success` dan [StatusBadge](src/components/ui/status-badge.tsx). Kelas palette Tailwind bukan warna literal hex, tetapi penulisan preset status di halaman tetap melewati normalisasi komponen bersama.

Dampak: status yang sama dapat memiliki warna, radius, spacing, dan treatment berbeda antartampilan. Perubahan visual global tidak otomatis diterapkan pada salinan lokal.

Rekomendasi:

- Gunakan `Badge` dengan tone/variant yang sudah tersedia, atau perluas pemetaan `StatusBadge` untuk status Inventaris secara terpusat.
- Jika ada kebutuhan warna semantik baru, tokenisasikan di `globals.css` dan gunakan melalui komponen bersama.
- Periksa seluruh pemakai sebelum mengubah primitive; jangan mengubah palette/API global hanya untuk memperbaiki satu tampilan tanpa review dampak.

## UI-03: komponen upload foto diduplikasi di fitur

Pada [modal tambah Inventaris](src/features/lost-found/components/satpam-inventory-workspace.tsx#L532), area upload dibuat dengan `<label>` ber-styling sendiri dan `<input type="file">` lokal. Proyek sudah memiliki [FileDropzone](src/components/ui/file-dropzone.tsx) dan [FilePreviewList](src/components/ui/file-preview-list.tsx).

Dampak: treatment upload, focus/keyboard, pesan validasi, preview, dan perubahan standar bisa berkembang berbeda antara Pelapor dan Inventaris. Interaksi aktual belum diuji melalui browser dalam audit ini.

Rekomendasi:

- Utamakan penggunaan/komposisi komponen upload bersama, dengan kebutuhan satu foto JPG/PNG yang divalidasi sesuai fitur.
- Bila komponen bersama belum cukup, tambah API/variant reusable atau komponen custom berbasis Shadcn, setelah memeriksa seluruh pemakainya.
- Tetap periksa validasi file frontend dan backend saat melakukan konsolidasi.

Catatan: native `input` di dalam primitive upload bersama memang diperlukan. Temuan ini bukan larangan terhadap seluruh tag HTML native; yang dipersoalkan adalah pembuatan kontrol upload paralel di fitur.

## UI-04: helper format foto melanggar standar FieldDescription

[Baris 543 pada Inventaris](src/features/lost-found/components/satpam-inventory-workspace.tsx#L543) memakai:

```tsx
<p className="text-[11px] text-muted-foreground">
  Format JPG atau PNG (Maksimal 5 MB)
</p>
```

Ini adalah helper text aturan input file. AGENTS.md mewajibkan helper field memakai `FieldDescription` dengan `text-xs`. [Primitive FieldDescription](src/components/ui/field.tsx#L131) sudah mengatur ukuran, warna muted, dan leading bersama.

Dampak: helper lebih kecil dan berbeda treatment dibanding field lain. Ini merupakan pelanggaran standar yang eksplisit, bukan sekadar preferensi estetika.

Rekomendasi: pindahkan teks tersebut ke `FieldDescription` dan pertahankan hubungan yang jelas dengan kontrol input. Jangan mengganti description halaman/card/modal menjadi helper hanya untuk menyamakan seluruh ukuran teks.

## UI-05: treatment glow dan status Riwayat Pelapor tersebar

[Card Riwayat Pelapor](src/features/reports/components/pelapor-report-history-list.tsx#L35) menambahkan palette emerald untuk status selesai, dan [baris 39 ke bawah](src/features/reports/components/pelapor-report-history-list.tsx#L39) menambahkan beberapa dekorasi glow dengan ukuran/blur/opacity berbeda menurut status.

Untuk primary/destructive, sebagian warna sudah memakai token proyek. Glow itu sendiri bukan bukti adanya warna literal hardcoded. Namun preset visual status selesai dan komposisi efek masih ditulis lokal di halaman, tanpa penambahan token/preset bersama pada commit ini.

Dampak: treatment card berbeda dari pola operasional yang sebelumnya lebih tenang; styling status sulit dijaga konsisten lintas role. Kebutuhan glow sebagai perubahan desain perlu diselaraskan dengan konteks visual proyek.

Rekomendasi:

- Konsolidasikan presentasi status melalui token dan komponen bersama.
- Pertahankan hierarki judul, tanggal, status, dan progress tanpa dekorasi yang mengambil perhatian dari isi laporan.
- Jika efek tetap diperlukan, definisikan treatment reusable yang terukur serta periksa tema terang/gelap, motion preference, dan seluruh viewport secara manual.

## LAYOUT-01: posisi logo sidebar dan toolbar tidak memakai acuan bersama

**Tidak ditemukan perubahan sidebar atau logo pada commit tim yang diaudit.** Diff dari `ef23001` ke `06fd77d` kosong untuk:

- `src/components/app-sidebar.tsx`
- `src/components/ui/sidebar.tsx`
- `src/components/layout/dashboard-layout.tsx`
- `src/app/globals.css`
- `public/logo`

Perubahan terkait navigasi pada commit tim adalah penambahan menu Inventaris Satpam. Perubahan `src/app/layout.tsx` hanya bentuk tipe props RootLayout; markup dan kelas layout di file tersebut tetap sama.

Penyebab yang ditemukan pada layout yang sudah ada:

| Acuan | Bukti kode |
| --- | --- |
| Brand sidebar | [AppSidebar baris 32](src/components/app-sidebar.tsx#L32): tombol `h-11` dan logo `size-8` |
| Padding header sidebar | [SidebarHeader baris 338](src/components/ui/sidebar.tsx#L338): `p-2` |
| Tombol saat collapsed | [Primitive baris 479](src/components/ui/sidebar.tsx#L479): `group-data-[collapsible=icon]:size-8!`, yang memaksa tombol menjadi 32px pada skala standar |
| Posisi panel konten | [DashboardLayout baris 47](src/components/layout/dashboard-layout.tsx#L47): `m-2` dan `md:m-3` |
| Tinggi toolbar konten | [DashboardLayout baris 49](src/components/layout/dashboard-layout.tsx#L49): `h-12`, yaitu 48px pada skala standar |

Dengan skala standar dan state desktop collapsed, pusat brand sidebar dapat berada sekitar 12–13px lebih tinggi dari pusat toolbar konten. Perkiraan ini berasal dari kombinasi padding, margin panel, tinggi kontrol, dan border; bukan pengukuran browser terhadap screenshot.

Rekomendasi:

- Samakan acuan tinggi/posisi area brand dan toolbar melalui token/layout bersama, termasuk state expanded dan collapsed.
- Pertahankan ukuran logo bila masalahnya berada pada alignment kontainer.
- Jangan mengubah ukuran seluruh `SidebarMenuButton` secara global hanya untuk memindahkan logo; hal itu dapat memengaruhi menu/footer semua role. Pertimbangkan variant brand yang terisolasi dan tetap mengikuti primitive Shadcn.
- Lakukan QA manual pada seluruh role, expanded/collapsed, tema terang/gelap, serta viewport terkait.

## Hasil pemeriksaan yang tidak menjadi temuan

- Pada baris frontend yang ditambahkan dalam diff audit, tidak ditemukan warna literal hex/RGB/HSL/OKLCH atau inline `style`.
- Tidak ada perubahan `globals.css` pada commit tim. Karena itu, palette/ukuran lokal baru yang disebut di atas belum disertai penambahan token global pada commit tersebut.
- File sidebar dan aset logo sama dengan versi pembanding. Temuan alignment tidak boleh dilaporkan sebagai regresi yang diperkenalkan oleh commit tim ini.
- Banyak kontrol tetap memakai Shadcn dan token semantik yang benar. Temuan tidak berarti seluruh implementasi Inventaris/Riwayat menggunakan komponen non-Shadcn.

## Urutan tindak lanjut dan kriteria selesai

1. Normalkan helper upload ke `FieldDescription` serta komponen upload bersama.
2. Konsolidasikan badge/status dan palette, kemudian ukuran lokal yang memang perlu menjadi token/variant.
3. Selaraskan treatment Riwayat Pelapor dengan visual operasional bersama.
4. Tangani alignment sidebar sebagai masalah layout yang sudah ada, dengan scope perubahan yang terisolasi.

Setiap perbaikan harus mengikuti workflow Dev.md: review seluruh pemakai, implementasi sesuai scope, lint/typecheck/build dan tes relevan, serta QA visual/interaksi manual. Perbaikan dinyatakan selesai setelah temuan terkait benar-benar diperbaiki dan hasil verifikasinya dicatat. Audit Markdown saja tidak menutup temuan implementasi.

Jika source berkembang setelah commit audit, cari kembali snippet/simbol yang disebut; nomor baris di dokumen ini adalah referensi terhadap `06fd77d`.
