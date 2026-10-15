# Audit flow Satpam dan dampak lintas role

Tanggal pencatatan: 15 Oktober 2026 (WIB).

**Status: terbuka, menunggu review manual pemilik proyek. Belum ada perbaikan kode. Jangan menutup temuan atau langsung melakukan fix hanya berdasarkan keberadaan dokumen ini.**

## Cakupan dan versi acuan

| Acuan | Nilai |
| --- | --- |
| Commit pertama | `e968fa03708ac94fea0f83ab5de53e76cf151d89` - Add satpam loss/found reporting |
| Commit kedua | `38b0a96d1d298a1bb2a2bd3ec6ee066179d6a152` - Polish lost-found history and form reset |
| Author kedua commit | Vanilla-Nya |
| Baseline | `06fd77d` |
| HEAD hasil merge yang diperiksa | `3cd4ddd6e01febc8d41b00e0191d205ce5ca249b` |
| Jumlah file berubah pada dua commit | 38 file dibanding baseline |
| Aturan acuan | [AGENTS.md](../AGENTS.md) dan [Dev.md](../Dev.md) |

Mayoritas temuan terkonsentrasi di **flow Satpam**: Pelaporan Pos, kehilangan/temuan, inventaris, pencocokan, API, dan persistence. Dampak lintas role meliputi standar action shelf pada modal bersama untuk Teknisi/Management serta watermark riwayat Pelapor. Ini bukan pernyataan bahwa seluruh backend atau seluruh role bermasalah.

Audit dilakukan melalui diff/source, pemeriksaan statis, tes yang tersedia, probe service, serta transaksi PostgreSQL development lokal yang di-rollback. Tidak dilakukan Preview Mode, browser automation, atau Playwright. Klaim interaksi/visual di bawah yang bersumber dari lifecycle kode tetap perlu QA manual pengguna.

Nomor baris mengacu source pada HEAD audit. Cari kembali simbol/snippet bila kode berubah.

## Ringkasan perubahan

- `e968fa0`: menambah halaman `/satpam/pelaporan`, form kehilangan dan temuan, API kehilangan/temuan/foto, field lokasi temuan inventaris, migration `0011` dan `0012`, filter aktif, serta integrasi kandidat inventaris ke pencocokan.
- Commit tersebut juga mengubah standar detail modal menjadi action shelf sticky di bagian bawah dan menyinkronkan teks standar di AGENTS.md/Dev.md.
- `38b0a96`: menambah watermark selesai pada riwayat Satpam/Pelapor, reset form temuan, penutupan dialog setelah penyimpanan, serta aset gambar.
- Form Pelapor utama dan geometri sidebar tidak diubah oleh dua commit ini. Masalah wizard Pelapor dari commit sebelumnya bukan regresi baru dalam cakupan audit ini.

## Daftar temuan dan prioritas

Prioritas di sini adalah urutan penanganan, bukan klaim bahwa semua temuan merupakan kerentanan keamanan kritis. Tinggi berarti perlu didahulukan karena integritas data atau validasi input; sedang berarti bug alur/kepatuhan yang tetap perlu diperbaiki; rendah berarti hygiene.

| ID | Temuan | Klasifikasi | Prioritas | Bukti saat audit |
| --- | --- | --- | --- | --- |
| SAT-01 | Retry membuat laporan ganda | Bug integritas data | Tinggi | Dua pemanggilan identik menghasilkan dua ID dalam transaksi rollback |
| SAT-02 | Foto hanya diperiksa dari MIME/ukuran | Celah validasi file | Tinggi | Teks berlabel image/png mencapai mock persistence pada probe service |
| SAT-03 | Tanggal kalender/future date tidak divalidasi utuh | Bug validasi server | Tinggi | Validator menerima tanggal invalid; future date tersimpan pada probe rollback |
| SAT-04 | Payload JSON salah tipe menjadi TypeError/500 | Bug kontrak API | Sedang | Probe validator dengan null dan itemName angka |
| SAT-05 | URL foto respons temuan memakai report ID | Bug referensi lampiran | Sedang | Lampiran ada, tetapi lookup dengan ID pada URL mengembalikan null |
| SAT-06 | Multipart diparse sebelum batas total body | Risiko penggunaan resource | Sedang | Pemeriksaan source; belum dilakukan load test |
| SAT-07 | Blob URL foto dicabut saat masuk preview | Bug lifecycle state berdasarkan source | Sedang | Form conditional unmount dan cleanup hook; perlu QA manual |
| SAT-08 | Waktu otomatis dibekukan sebelum kirim | Bug semantik waktu | Sedang | Snapshot waktu browser dikirim eksplisit saat konfirmasi |
| SAT-09 | Kode tiket kembali tampil di layar sukses | Pelanggaran aturan UI | Sedang | Source layar sukses Pelaporan Satpam |
| SAT-10 | Ukuran, badge, upload, dan helper belum dinormalisasi | Pelanggaran sistem desain | Sedang | Diff frontend dan primitive yang tersedia |
| SAT-11 | Sticky action shelf belum dimigrasikan lintas role | Pelanggaran konsistensi shared component | Sedang | Satpam memakai action prop; Teknisi/Management masih menaruh aksi di body |
| SAT-12 | Stepper klik memakai li tanpa kontrol keyboard | Kekurangan aksesibilitas | Sedang | Source stepper |
| ARCH-01 | Salinan data kehilangan tanpa FK ke laporan utama | Risiko desain database | Sedang | Schema dan constraint PostgreSQL; maksud snapshot perlu konfirmasi |
| ARCH-02 | Penyerahan inventaris tidak ditautkan ke kehilangan terpilih | Celah integrasi/aturan bisnis | Sedang | Source flow dan persistence; hasil yang diharapkan perlu konfirmasi |
| QA-01 | Tes terkomit belum mencakup jalur baru secara memadai | Celah regression coverage | Sedang | Seluruh 191 tes lolos tetapi probe tambahan menemukan bug |
| HYGIENE-01 | Aset JPG duplikat dan whitespace EOF | Hygiene repository | Rendah | Hash aset, pencarian pemakai, dan diff check |

Seluruh baris berstatus **terbuka**. Lolos build atau tes lama tidak menutup temuan ini.

## Backend dan database

### SAT-01: retry tidak idempotent

Bukti: [createLossReport](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts#L412), [submission key kehilangan](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts#L444), dan [submission key temuan](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts#L569).

Setiap request memperoleh `submissionKey: randomUUID()` baru. Unique constraint di database tidak dapat mengenali retry atas pengiriman yang sama karena key selalu berubah. Probe repository membuktikan dua pemanggilan kehilangan dengan payload identik menghasilkan dua ID berbeda. Kasus koneksi terputus setelah commit belum disimulasikan melalui browser, tetapi tidak ada kontrak key stabil untuk mencegah duplikasi pada retry tersebut.

Dampak: pengguna yang mencoba kembali setelah respons gagal/ambigu dapat membuat laporan dan lampiran ganda. Tombol disabled saat pending hanya mengurangi klik ganda dalam satu render, bukan menggantikan idempotensi server.

Arah perbaikan setelah disetujui: gunakan key stabil per pengiriman, pertahankan pada retry, dan kembalikan hasil yang sudah committed. Ikuti pola Pelapor termasuk cleanup file yang terlanjur distage.

### SAT-02: validasi foto tidak memeriksa isi

Bukti: [createLossReport service](../src/features/lost-found/application/satpam-service.ts#L95), [createFoundReport service](../src/features/lost-found/application/satpam-service.ts#L126), serta pembanding `validateUploads` pada [domain laporan](../src/features/reports/domain/report.ts).

Jalur baru hanya memeriksa MIME diawali `image/` dan ukuran maksimal. MIME berasal dari request dan tidak membuktikan isi file. Probe service dengan teks biasa berlabel `image/png` mencapai mock persistence. Ini probe in-memory: tidak menyimpan file palsu ke storage atau database nyata.

Dampak: file bukan gambar dapat lolos; tipe image lain juga dapat diterima walaupun copy menjanjikan JPG/PNG. Temuan ini **bukan bukti XSS atau eksekusi kode berhasil**; endpoint download memiliki perlindungan header yang tetap harus dipertahankan.

Arah perbaikan: allowlist tipe yang tepat, validasi signature/nama/ukuran menggunakan validator bersama, dan tes file kosong serta MIME palsu. Pola serupa pada createInventory sudah ada sebelum dua commit; dua jalur baru meneruskannya, bukan memperkenalkan seluruh masalah upload dari nol.

### SAT-03: tanggal tidak valid dan masa depan

Bukti: [validator kehilangan](../src/features/lost-found/domain/loss-report.ts#L41) dan [validator temuan](../src/features/lost-found/domain/found-report.ts#L45).

Regex hanya memeriksa bentuk `YYYY-MM-DD`, bukan tanggal kalender sesungguhnya atau batas hari ini dalam WIB. Kedua validator menerima `2026-02-30` dan `2099-01-01`. Pada probe PostgreSQL, tanggal masa depan berhasil tersimpan; tanggal invalid ditolak database dengan kode `22008`, yang kemudian jatuh ke respons generik 500.

Arah perbaikan: gunakan pemeriksaan kalender/WIB bersama seperti jalur Pelapor, validasi pasangan tanggal-waktu, dan uji pergantian hari. Jangan mengandalkan Calendar UI sebagai validasi API.

### SAT-04: tipe payload runtime belum dijaga

Bukti: [validateCreateLossReport](../src/features/lost-found/domain/loss-report.ts#L30) dan [validateCreateFoundReport](../src/features/lost-found/domain/found-report.ts#L34).

Input `unknown` dicast ke tipe TypeScript tetapi bentuk runtime tidak diperiksa. `null` atau field angka menghasilkan `TypeError` ketika membaca property/memanggil trim. HTTP wrapper menganggapnya error internal dan mengembalikan 500.

Arah perbaikan: validasi object, tipe field, enum, panjang, dan nullability sebelum normalisasi; kembalikan `ReportError` terkontrol. Tambahkan tes input null, array, angka, object bersarang, dan status yang tidak dikenali.

### SAT-05: URL respons foto tidak menunjuk lampiran

Bukti: [respons createFoundReport](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts#L638) dan [endpoint attachment](../src/app/api/satpam/attachments/[id]/route.ts).

Respons menyusun URL dengan `reportRow.id`, sedangkan repository attachment mencari `reportAttachments.id`. ID lampiran dibuat terpisah. Probe menunjukkan lampiran benar-benar ada, tetapi lookup memakai ID laporan menghasilkan null. Ini tidak berarti seluruh tampilan foto selalu gagal: proyeksi lain yang memakai attachment ID benar dapat tetap bekerja.

Arah perbaikan: gunakan ID lampiran yang benar dalam respons dan uji URL hasil create, download, serta tampilan setelah refresh.

### SAT-06: ukuran body baru diperiksa setelah parsing

Bukti: [loss route](../src/app/api/satpam/loss-reports/route.ts#L19) dan [found route](../src/app/api/satpam/found-reports/route.ts#L12). Pembanding: pembatas stream `limitedBody` pada [HTTP Pelapor](../src/features/reports/infrastructure/http.ts).

`request.formData()` berjalan sebelum pemeriksaan ukuran file 5 MB. Batas file setelah parsing tidak membatasi resource yang digunakan untuk menerima/memproses keseluruhan request. Endpoint tetap memerlukan login dan role Satpam; audit tidak melakukan stress test atau menyatakan server telah kehabisan resource.

Arah perbaikan: gunakan pembatas stream/body bersama sebelum parsing, batas field/jumlah file, serta respons 413 yang terkontrol. Tes ukuran besar dilakukan hanya di lingkungan development yang disepakati.

### ARCH-01: sumber kebenaran data kehilangan perlu diperjelas

Bukti: [schema satpam_loss_reports](../src/db/lost-found-schema.ts#L71), [penulisan salinan](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts#L492), [migration 0011](../drizzle/0011_satpam_pelaporan.sql), dan [migration 0012](../drizzle/0012_satpam_loss_report_details.sql).

Repository memakai ID laporan utama sebagai ID baris satpam_loss_reports, tetapi schema tidak mendefinisikan FK ke reports. Foreign key yang ada pada tabel baru hanya registered_by ke users. Data title/lokasi/deskripsi/waktu/foto disalin. Saat waktu tidak diberikan, laporan utama memperoleh fallback server, sementara tabel salinan menyimpan tanggal null; kondisi ini terverifikasi pada probe rollback. Tanggal/waktu pada salinan berupa text, berbeda dari tipe date/time pada reports.

**Klasifikasi: risiko desain, bukan bukti bahwa data produksi saat ini sudah orphan.** Bila tabel ini sengaja merupakan snapshot audit independen, tentukan field snapshot, provenance, aturan immutable/retensi, dan proyeksi pembacanya. Bila merupakan detail satu-ke-satu, ikat relasinya dan kurangi duplikasi. Koreksi schema harus melalui migration baru; jangan mengedit migration yang sudah dibagikan.

### ARCH-02: inventaris dan laporan kehilangan belum tersambung

Bukti: [aksi kandidat inventaris](../src/features/lost-found/components/satpam-lost-found-workspace.tsx#L1132) dan [handoverInventory](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts#L324).

Setelah pengguna memilih kehilangan dan kandidat inventaris, UI mengarahkan ke detail/penyerahan inventaris. ID laporan kehilangan tidak diteruskan ke transaksi handoverInventory. Operasi tersebut hanya memperbarui inventaris, tidak membuat relasi pencocokan atau memperbarui lifecycle kehilangan.

**Perlu keputusan bisnis:** apakah penyerahan inventaris merupakan transaksi mandiri atau harus menyelesaikan laporan kehilangan yang dipilih? Jangan otomatis menutup laporan atau melompati lifecycle tanpa keputusan tersebut. Jika harus terhubung, rancang relasi, audit penyerahan, status, dan transaksi bersama.

## Frontend dan konsistensi UI

### SAT-07: foto tidak dimiliki state yang hidup sepanjang preview

Bukti: [cleanup useItemPhoto](../src/features/lost-found/components/item-photo-field.tsx#L20), [form conditional](../src/features/lost-found/components/satpam-pelaporan-workspace.tsx#L338), [initialData form kehilangan](../src/features/lost-found/components/loss-item-form.tsx#L65), dan [form temuan](../src/features/lost-found/components/found-item-form.tsx#L46).

Perpindahan details ke review melepas form dari tree. Cleanup hook mencabut blob URL yang masih disimpan parent untuk preview. Kembali ke details membuat hook baru tanpa memulihkan photoFile/photoPreviewUrl dari initialData. File di parent masih ada pada preview pertama, sehingga jangan menyimpulkan upload pertama selalu gagal; masalah tambahan muncul saat kembali mengedit dan menyerahkan state baru tanpa foto.

Arah perbaikan: pindahkan kepemilikan file/URL ke state yang bertahan sepanjang alur, restore file saat edit, dan revoke hanya ketika benar-benar tidak digunakan. QA manual diperlukan untuk memeriksa hasil visual/klik aktual.

### SAT-08: mode waktu otomatis berubah menjadi timestamp browser

Bukti: [resolusi waktu di form](../src/features/lost-found/components/loss-item-form.tsx#L106) dan [pengiriman snapshot](../src/features/lost-found/components/satpam-pelaporan-workspace.tsx#L83).

Walau useCustomTime false, form mengambil tanggal/waktu browser saat menuju preview. Parent kemudian mengirim keduanya eksplisit. Server mengutamakan nilai tersebut alih-alih waktu konfirmasi/pengiriman. Penundaan di preview atau jam perangkat yang meleset menyebabkan semantik otomatis tidak sesuai standar. Dialog Catat Temuan juga menginisialisasi waktu di state komponen; evaluasi perilakunya saat lama terbuka atau dibuka kembali.

Arah perbaikan: kirim mode automatic/custom secara eksplisit dan jadikan server sumber waktu automatic. Pertahankan waktu khusus sesuai pilihan pengguna yang telah divalidasi.

### SAT-09: kode tiket kembali menjadi informasi UI

Bukti: [layar sukses Pelaporan](../src/features/lost-found/components/satpam-pelaporan-workspace.tsx#L98).

Judul sukses mengutamakan ticketNumber, dan deskripsi menambahkan teks Tiket beserta kodenya. Ini bertentangan dengan aturan menyembunyikan kode internal. ID/tiket tetap boleh digunakan internal untuk relasi, API, dan tautan; yang perlu disesuaikan adalah presentasinya.

Arah perbaikan: tampilkan judul/nama barang serta waktu pengiriman yang informatif. Cari ulang copy, aria-label, preview, toast, dan state sukses agar tidak ada sisa kode yang tampil.

### SAT-10: normalisasi Shadcn dan token belum konsisten

Pemindaian diff menemukan 19 baris tambahan dengan ukuran eksplisit lokal. Contoh:

| Contoh | Lokasi |
| --- | --- |
| min-w-[150px] / min-w-[160px] | Tombol FoundItemForm / LossItemForm |
| min-w-[170px] | Tombol konfirmasi Pelaporan |
| sm:w-[185px] / sm:w-[210px] | Filter pencocokan |
| text-[10px] / text-[11px] | Badge, metadata, helper, dan state pilihan |
| blur-[2px] | Watermark riwayat Satpam dan Pelapor |

19 adalah jumlah baris tambahan yang cocok dengan pola ukuran pada diff, **bukan 19 bug independen**, dan sebagian berasal dari markup lama yang dipindahkan. Tidak semua bracket Tailwind merupakan pelanggaran; selector state, ekspresi responsif, serta nilai berbasis token harus dinilai menurut fungsinya.

Pelanggaran/pola yang perlu ditinjau:

- Helper format foto memakai p text-[11px], bukan FieldDescription: [ItemPhotoField](../src/features/lost-found/components/item-photo-field.tsx#L106).
- Upload manual label/input dipindahkan ke komponen fitur baru, sementara FileDropzone/FilePreviewList bersama sudah tersedia. Native input di dalam primitive upload boleh; persoalannya adalah kontrol paralel yang tidak memakai pola bersama.
- Dua card jenis Pelaporan memakai native button ber-styling lokal, bukan Button/komposisi Shadcn: [workspace](../src/features/lost-found/components/satpam-pelaporan-workspace.tsx#L213).
- Badge/status sukses ditulis dengan span dan palette lokal, padahal Badge/StatusBadge sudah ada.
- Watermark riwayat menambah treatment lokal dan arbitrary blur. Glow/palette sebagian sudah ada pada baseline; bedakan penambahan watermark dari masalah lama yang masih dipertahankan.

Tidak ditemukan warna literal hex/RGB/HSL/OKLCH atau inline style pada baris frontend tambahan. Kelas palette Tailwind bukan warna literal, tetapi tetap perlu konsolidasi ke token/preset status bersama sesuai Dev.md. Jangan menyatakan seluruh fitur tidak memakai Shadcn; banyak kontrol sudah memakainya.

Arah perbaikan: gunakan skala standar, token globals.css bila memang perlu, variant shared component, FieldDescription text-xs, serta komponen upload bersama. Jangan langsung mengubah primitive global tanpa meninjau semua pemakainya.

### SAT-11: migrasi action shelf lintas role belum selesai

Bukti: [shared shell](../src/components/reports/operational-report-dialog.tsx#L58), [Teknisi](../src/features/facilities/components/technician-report-detail-dialog.tsx#L53), dan [Management](../src/features/management/components/management-report-detail-dialog.tsx#L47).

Satpam mengirim action melalui prop baru untuk shelf sticky. Teknisi dan Management tetap menaruh panel aksi di children setelah stepper. Standar AGENTS.md/Dev.md sudah diperbarui untuk seluruh modal operasional, tetapi caller lintas role belum ikut dimigrasikan.

Arah perbaikan: petakan seluruh caller dan pindahkan aksi sesuai kontrak bersama, sambil mempertahankan state pending/error, focus restore, dan nested confirmation. Ini perubahan lintas role; jangan menganggap cukup memeriksa Satpam saja.

### SAT-12: stepper tidak menyediakan kontrol keyboard

Bukti: [SatpamPelaporanStepper](../src/features/lost-found/components/satpam-pelaporan-stepper.tsx#L29).

Langkah sebelumnya menerima click melalui li, tanpa button yang dapat difokuskan atau keyboard handler. Pointer dapat menavigasi, tetapi kontrol langkah tersebut tidak dapat diakses dengan Tab/Enter/Space. Pengguna mungkin masih memiliki tombol Kembali lain; itu tidak membuat affordance stepper sendiri aksesibel.

Arah perbaikan: gunakan Button Shadcn di dalam item list dan pertahankan aria-current, disabled state, serta focus yang masuk akal setelah berpindah.

## Tes dan hygiene

### QA-01: coverage belum mewakili jalur baru

Perubahan tes yang terkomit menambah dukungan filter aktif, foundLocation, validasi dasar kehilangan, dan role guard kehilangan. Tidak ada tambahan integration test terkomit yang mencakup createLossReport/createFoundReport, retry, foto respons, rollback gabungan, atau lifecycle preview baru. Temuan ini bukan klaim bahwa kontributor tidak pernah menjalankan tes manual; yang dinilai adalah cakupan bukti regression di repository.

191 tes non-database yang tersedia lolos, tetapi probe tambahan mengungkap masalah SAT-01 sampai SAT-05. Setelah fix disetujui, tambahkan regression yang memeriksa perilaku, bukan hanya keberadaan markup/snippet. Tes database harus memakai fixture terisolasi, guard target development lokal, dan rollback/cleanup yang benar.

### HYGIENE-01: aset duplikat dan whitespace

- DoneIcon.jpg di root dan public/assets/DoneIcon.jpg identik menurut SHA256. Pencarian pemakai source menemukan referensi ke versi PNG, bukan dua JPG tersebut. Tinjau sebelum menghapus; audit ini tidak menghapus aset.
- git diff --check pada rentang audit menemukan blank line tambahan di akhir application/ports.ts, application/satpam-service.ts, dan infrastructure/drizzle-satpam-repository.ts.
- Ini temuan rendah, jangan diprioritaskan di atas integritas laporan atau foto.

## Yang sudah sesuai

- PostgreSQL di Docker, Drizzle ORM, dan Better Auth tetap menjadi stack proyek. Tidak ada ORM atau engine auth kedua yang ditambahkan.
- Halaman baru memakai requireRole satpam. API memakai session/role guard dan pemeriksaan origin untuk mutasi; adapter session membaca akun aktif dari database.
- Pembuatan laporan, detail kehilangan/temuan, attachment, status history, dan counter dilakukan dalam transaksi database.
- Jalur baru createLossReport/createFoundReport mencoba membersihkan foto staged bila persistence gagal.
- Migration 0011/0012 memiliki journal dan snapshot dengan prevId yang konsisten. Snapshot hanya mengubah tabel inventaris/tabel kehilangan baru sesuai cakupan; migration lama tidak ditulis ulang dalam diff ini.
- Role aplikasi berhasil SELECT/INSERT pada tabel baru saat diperiksa. Koneksi PostgreSQL lokal berfungsi.
- Tidak ada perubahan Dockerfile, Compose, dependency/lockfile, konfigurasi Better Auth, atau globals.css pada dua commit ini.
- Salinan standar sticky shelf di AGENTS.md dan Dev.md disinkronkan; yang belum selesai adalah implementasi seluruh caller.

## Hasil verifikasi yang benar-benar dijalankan

| Pemeriksaan | Hasil |
| --- | --- |
| npm run lint | Lolos |
| npm run typecheck | Lolos |
| npm run build | Lolos |
| Seluruh file scripts/*.test.ts dan *.test.tsx, kecuali file integration *-db.test.* | 191 lolos, 0 gagal, 0 skip |
| Subset awal 51 tes terkait | Lolos; termasuk dalam 191, jangan dijumlahkan menjadi 242 |
| npm run db:check | Lolos; hanya bukti koneksi/tabel users, bukan bukti seluruh domain benar |
| Hak role aplikasi pada tabel baru | SELECT dan INSERT diizinkan |
| Probe validator dan service | Mereproduksi input invalid, future date, dan MIME palsu seperti rincian temuan |
| Probe repository PostgreSQL | Mereproduksi duplikasi retry, future date, referensi foto salah, dan beda waktu default pada tabel salinan |
| Rollback probe | Dikonfirmasi selesai; actor fixture tidak tersisa; seluruh penulisan probe berada dalam transaksi yang sama |
| git diff --check rentang audit | Menemukan tiga blank line EOF, belum diperbaiki |
| Upgrade bersih dari baseline pada database kosong | Belum dijalankan |
| QA visual/interaksi manual | Belum dijalankan oleh agent; menunggu pengguna |
| Stress/load test request besar | Tidak dijalankan |

Probe database menggunakan actor sementara dan metadata foto tanpa membuat file storage. Probe MIME palsu menggunakan mock storage/repository in-memory. Script probe khusus dijalankan langsung melalui Node/tsx dan belum disimpan sebagai script npm baru; jangan mengarang command regression yang belum ada.

## Checklist cek manual sebelum fix

Gunakan akun/data development yang jelas. Jangan melakukan percobaan payload besar atau request retry pada production. Jika membuat data contoh manual, catat ID dan jangan menghapus data lain untuk membersihkannya. Uji API negatif/idempotensi memerlukan lingkungan uji terisolasi dan lebih tepat dijadikan regression backend daripada klik berulang pada data nyata.

- [ ] **Foto kehilangan:** unggah foto, lanjut preview, periksa gambar; kembali ubah teks, lanjut lagi, periksa apakah foto masih ada dan ikut tersimpan.
- [ ] **Foto temuan/inventaris:** ulangi langkah foto di atas untuk jenis Temuan pada halaman Pelaporan.
- [ ] **Ganti jenis sebelum preview:** isi sebagian form lalu kembali ke jenis; catat apakah input hilang tanpa peringatan. Jangan menganggap perilaku ini sudah diverifikasi browser oleh audit.
- [ ] **Waktu otomatis:** gunakan mode otomatis, diamkan di preview, lalu kirim; bandingkan waktu kejadian dengan waktu kirim server/WIB. Uji pergantian hari bila memungkinkan tanpa mengubah jam perangkat bersama.
- [ ] **Waktu khusus:** pilih waktu historis yang valid; pastikan hasil sesuai pilihan. Invalid calendar/future date harus diperiksa di API karena UI mungkin memblokirnya lebih dahulu.
- [ ] **Layar sukses:** setelah kehilangan tersimpan, periksa apakah kode LJ kembali muncul sebagai judul/deskripsi.
- [ ] **Catat Temuan dari pencocokan:** buat satu temuan dengan foto development; bandingkan respons create, akses URL fotonya, dan foto setelah refresh. URL salah pada respons tidak selalu berarti seluruh proyeksi foto gagal.
- [ ] **Pencocokan inventaris:** pilih kehilangan dan inventaris, lakukan penyerahan contoh hanya jika memang diinginkan; periksa status kehilangan dan tempat riwayat penyerahannya muncul. Putuskan ekspektasi bisnis ARCH-02 sebelum implementasi.
- [ ] **Modal lintas role:** bandingkan Satpam, Teknisi, dan Management pada modal panjang. Periksa posisi aksi, scroll, focus, pending/error, serta nested confirmation.
- [ ] **Keyboard:** gunakan Tab, Enter, dan Space untuk mencoba navigasi langkah sebelumnya. Jangan hanya menguji klik mouse.
- [ ] **Riwayat selesai:** periksa watermark, keterbacaan judul/status/waktu, tema terang/gelap, dan layar sempit pada Satpam/Pelapor.
- [ ] **Standar input/upload:** bandingkan helper, tombol, badge, dan upload dengan primitive bersama; tandai kebutuhan token/variant, bukan hardcode pengganti.

Catatan hasil QA: tulis tanggal, role, alur, hasil aktual, hasil yang diharapkan, screenshot bila perlu, dan ID temuan. Hindari memasukkan password, cookie/session, data pribadi, atau secret ke dokumen.

## Keputusan dan urutan setelah review

1. Konfirmasi hasil manual serta aturan ARCH-01/ARCH-02 dengan pemilik proyek.
2. Prioritaskan idempotensi dan validasi server/file/body; tambahkan regression.
3. Perbaiki referensi foto, lifecycle preview/edit, dan semantik waktu otomatis.
4. Selesaikan integrasi/relasi database sesuai keputusan; gunakan migration baru bila schema berubah. Jangan menulis ulang migration 0011/0012 yang sudah dibagikan.
5. Normalkan UI, sembunyikan tiket, migrasikan modal lintas role, dan benahi keyboard stepper.
6. Bersihkan hygiene setelah pemakai aset dan diff ditinjau.

Tidak perlu menjalankan seed untuk sekadar menambahkan tabel pada migration ini. Kebutuhan migration/seed untuk perbaikan berikutnya ditentukan dari desain fix yang disetujui, bukan ditebak sekarang. Tidak ada commit/push atau perbaikan kode yang dilakukan dalam pencatatan audit ini.
