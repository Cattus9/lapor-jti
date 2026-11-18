# Audit backend Satpam — 18 November 2026

## Cakupan

Pemeriksaan kode pada `main` commit `3da4be9`: Pelaporan, kehilangan dan temuan, Inventaris, pencocokan, penyerahan, Dashboard, akses API, database dan penyimpanan foto. Audit ini tidak mencakup review UI/aksesibilitas, load test atau pengukuran query dengan dataset representatif. Temuan bersumber dari kode terkini; penilaian terhadap commit lama harus mempertimbangkan perubahan sesudahnya.

Tindak lanjut: perlindungan foto, retry penyerahan, dan kunci API pencatatan diperbaiki setelah audit. Detail laporan tidak lagi menjalankan query hitung pada pencarian tiket unik. Pemilik memilih batas lima laporan di Dashboard; filter panel tetap terbatas pada lima item. Pengukuran database lokal hanya mencakup enam laporan dan satu barang, sehingga belum menjadi dasar pengujian beban atau penambahan indeks substring. Detail kontrak dan batasan tercatat di `OPERATIONS.md`.

## Temuan

### Tinggi — Lampiran dapat terhapus setelah transaksi inventaris berhasil

`SatpamService.createInventory` menyimpan foto, memanggil repository untuk membuat barang dalam transaksi, lalu melakukan pembacaan `getInventoryPhoto` di dalam blok `try` yang sama. Jika transaksi sudah commit tetapi pembacaan sesudahnya gagal, blok `catch` menghapus foto baru walaupun database sudah menunjuk ke file tersebut. Pola serupa ada pada `createLossReport` untuk jalur unggahan langsung. Ini merupakan jalur kegagalan yang disimpulkan dari source, belum direproduksi dengan fault injection. Dampak: barang/laporan tersimpan dengan foto yang tidak dapat dibuka. Lihat `src/features/lost-found/application/satpam-service.ts` (`createInventory`, `createLossReport`) dan transaksi pada `drizzle-inventory-repository.ts`.

Rekomendasi: pisahkan hasil commit dari pembersihan file, pastikan pembersihan hanya menyasar file yang benar-benar tidak direferensikan, dan uji kegagalan pembacaan setelah commit serta retry. Pertimbangkan kegagalan ambigu saat commit tanpa menghapus file yang mungkin sudah dipakai.

### Sedang — Foto penyerahan retry meninggalkan file tanpa referensi

Kedua alur penyerahan menyimpan foto sebelum memanggil repository. Jika request dengan kunci yang sama diulang setelah transaksi sebelumnya berhasil, repository mengembalikan hasil lama; service hanya membersihkan foto pada error. File baru dari retry tidak digunakan atau dihapus. Fingerprint penyerahan juga tidak mencakup isi foto, sehingga retry dengan foto berbeda tetapi isian lain sama menerima hasil sebelumnya. Ini disimpulkan dari source dan belum direproduksi melalui HTTP. Lihat `satpam-service.ts` (`execute`, `handoverInventory`), `drizzle-satpam-repository.ts` (`handover`) dan `drizzle-inventory-repository.ts` (`handover`).

Rekomendasi: kembalikan informasi retry/file yang digunakan dari transaksi, hapus hanya file staging yang tidak dipakai, dan tentukan kontrak fingerprint foto dengan digest; uji retry identik dan berbeda pada kedua jalur.

### Sedang — Filter prioritas Dashboard hanya mencakup lima laporan

Query `dashboard` membatasi antrean ke lima laporan dan memprioritaskan status Baru, terbaru lebih dahulu. `SatpamPriorityQueue` kemudian melakukan pencarian dan filter hanya pada lima baris tersebut; laporan lain yang memenuhi filter tidak ikut dicari. Opsi terlama membalik urutan lima hasil ini, bukan mengurutkan seluruh antrean berdasarkan waktu. Lihat `drizzle-satpam-repository.ts` (`dashboard`) dan `satpam-dashboard.tsx` (`filteredQueue`). Batas lima berguna sebagai ringkasan, tetapi cakupan filter harus dinyatakan dan dirancang sesuai kebutuhan.

Rekomendasi: pertahankan ringkasan terbatas dan arahkan pencarian seluruh laporan ke endpoint terpaginasikan, atau tambahkan filter dan sort server yang jelas cakupannya. Uji lebih dari lima laporan serta kombinasi status dan waktu.

### Sedang — Jalur API temuan langsung tidak memiliki kunci retry stabil

Endpoint `POST /api/satpam/found-reports` masih aktif dan `createFoundReport` membuat `submissionKey` baru pada setiap panggilan. Retry setelah respons terputus berpotensi membuat laporan ganda. Form Pelaporan Satpam saat ini menggunakan endpoint Inventaris dengan kunci draft, sehingga temuan ini berlaku pada jalur API temuan langsung, bukan bukti bahwa form tersebut menggandakan data. Pembuatan Kehilangan tanpa kunci draft dan Inventaris tanpa submission key juga diperbolehkan API. Lihat `src/app/api/satpam/found-reports/route.ts`, `drizzle-satpam-repository.ts` dan validator inventaris.

Rekomendasi: putuskan apakah endpoint lama masih dibutuhkan. Jika dibutuhkan, wajibkan kunci stabil dan fingerprint server pada jalur mutasi yang relevan; bila dipensiunkan, pertimbangkan kompatibilitas sebelum menutup akses. Uji retry dan payload berbeda.

### Perlu pengukuran — Pencarian dan hitungan berulang

Daftar laporan, inventaris dan riwayat memakai pencarian `ILIKE '%kata%'` pada beberapa kolom dan menjalankan hitungan total. Pagination berbasis cursor dan beberapa indeks tanggal/status sudah ada, tetapi indeks B-tree tersebut tidak otomatis mengoptimalkan pencarian substring. Foto sumber inventaris juga memakai subquery per baris hasil. Besarnya dampak belum diukur dan tidak cukup bukti untuk menyatakan aplikasi lambat atau menambahkan indeks tertentu sekarang. Lihat `drizzle-satpam-repository.ts` (`list`, `history`) dan `drizzle-inventory-repository.ts` (`list`, `query`).

Rekomendasi: ukur `EXPLAIN (ANALYZE, BUFFERS)` pada database pengujian dengan volume representatif dan pola pencarian nyata; pertimbangkan indeks teks atau perubahan total hanya bila hasilnya membenarkan biaya tulis dan penyimpanan.

## Status audit sebelumnya

Dokumen `docs/audit-satpam-e968fa0-38b0a96.md` adalah snapshot Oktober, bukan bukti otomatis kondisi saat ini. Berdasarkan source saat ini: validator bersama memeriksa unggahan, body multipart dibatasi sebelum parsing, validator tanggal memeriksa tanggal kalender dan hari WIB, payload kehilangan/temuan memeriksa tipe runtime, dan URL foto respons temuan memakai ID lampiran. Kunci draft sudah tersedia untuk alur kehilangan dari form saat ini; pengecualian jalur tanpa kunci dijelaskan di atas. Kesimpulan ini belum memverifikasi seluruh variasi melalui HTTP/database.

## Hal yang sudah ada

Session dan role diperiksa di API; perubahan memeriksa origin. Penyelesaian/penyerahan memakai transaksi, pemeriksaan status dan lock; ada constraint unik, keyset pagination, indeks tanggal/status dan pembatas unggahan. Foto disimpan pada storage privat lokal. Keberadaan mekanisme ini tidak menjamin semua race atau kondisi gagal sudah tercakup.

## Pemeriksaan

- `node --import tsx --test scripts/satpam-domain.test.ts scripts/satpam-inventory-domain.test.ts scripts/satpam-report-drafts.test.ts`: 23 lulus.
- Dua tes PostgreSQL `satpam-acceptance-db.test.ts`: lulus di database development lokal, dengan fixture transaksi rollback.
- Tiga tes PostgreSQL pada `satpam-inventory-handover-db.test.ts` dan `satpam-exceptions-db.test.ts` lulus, termasuk retry dan penyerahan bersamaan. Tes tersebut tidak memeriksa file foto yang tertinggal saat retry di lapisan service.
- `satpam-dashboard-priority-db.test.ts`: gagal pada perbandingan urutan. Tes membandingkan hasil seluruh database dengan fixture saja, sementara fixture sengaja memakai tanggal tahun 1600; data aktif yang sudah ada dapat ikut masuk lima hasil. Kegagalan ini belum membuktikan query salah. Perlu database terisolasi atau fixture yang mengontrol seluruh populasi sebelum menarik kesimpulan.
- Tidak dilakukan load test, pengukuran `EXPLAIN`, fault injection file, pengujian semua role/API atau perbaikan kode. Tidak ada perubahan schema, migration, atau data permanen yang disengaja.
