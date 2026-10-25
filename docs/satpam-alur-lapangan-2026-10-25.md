# Audit alur lapangan Satpam dan usulan penyederhanaan

Tanggal: 25 Oktober 2026. Acuan: source workspace saat audit, termasuk perubahan lokal yang belum di-commit. Bagian temuan di bawah merekam kondisi sebelum perbaikan. Implementasi saat ini dijelaskan pada tabel status berikut. QA visual tetap manual; pengujian PostgreSQL dan HTTP dijelaskan di OPERATIONS.md.

## Status implementasi

| Temuan | Hasil implementasi |
| --- | --- |
| Kehilangan tidak ikut penyerahan Inventaris | Selesai: laporan opsional ditautkan pada transaksi penyerahan, ditutup bersama, dan mendapat notifikasi in-app. |
| Riwayat/Dashboard tidak mencakup Inventaris | Selesai: riwayat menggunakan sumber penyerahan bersama; Dashboard memisahkan stok fisik dari jumlah laporan/pasangan. |
| Race dan jejak petugas | Selesai: transaksi, lock laporan berurutan/lock barang, unique constraint, key retry, petugas aktif dan snapshot actor/petugas. Backfill lama tidak mengarang identitas. |
| Wajib dua laporan | Jalur Inventaris kini bisa menyerahkan barang tanpa laporan atau dengan satu kehilangan terkait. Jalur pasangan lama tetap tersedia untuk data yang memang berpasangan. |
| Dua pintu temuan | UI pencocokan memakai satu aksi Terima barang. Temuan daring dapat diterima ke Inventaris dengan relasi unik; kandidat temuan yang sudah diterima tidak muncul lagi sebagai barang kedua. |
| Pemilik vs pencatat | Nama/kontak pelapor langsung opsional dipisahkan dari akun pencatat, dan hanya ditampilkan melalui akses Satpam. |

Normalisasi mencakup modal Inventaris dengan shared shell/shelf, tabel detail dan section header bersama, badge, FieldDescription, ukuran Tailwind standar, FileDropzone, empty/loading/error state, keyboard step navigation, dan fallback foto. URL foto eksternal lama dipertahankan di database tetapi tidak dipakai sebagai gambar runtime Satpam; unggahan baru memakai storage privat.

Penyelesaian di luar pos dan satu form penerimaan+pengembalian sekaligus tetap merupakan opsi pengembangan, bukan perubahan kebijakan yang disisipkan pada perbaikan ini. Penerimaan dan penyerahan saat ini adalah dua aksi ringkas tanpa kewajiban membuat dua laporan. Daftar audit historis e968fa0/38b0a96 tidak otomatis seluruhnya tertutup; khususnya desain salinan `satpam_loss_reports`, idempotensi endpoint laporan kehilangan/temuan staf lama, dan migrasi shelf pada role lain perlu tindak lanjut terpisah. Kunci retry pada implementasi ini mencakup penerimaan Inventaris dan penyerahannya.

## Kesimpulan

Inventaris sudah mendukung barang titipan langsung dan penyerahan tanpa akun/laporan pemilik. Ini dasar yang relevan bagi kondisi lapangan yang dijelaskan pemilik proyek. Kesenjangannya ada pada hubungan antara barang fisik, laporan web, penyerahan, dan riwayat. Pencocokan dua laporan masih menjadi syarat jalur laporan, sementara jalur inventaris berjalan terpisah.

Jangan memaksa mahasiswa membuat laporan web untuk mengambil barang yang sudah terbukti miliknya di pos. Satpam tetap mencatat penerimaan dan pengembalian; relasi dengan laporan web dipakai ketika laporan tersebut memang ada. Keabsahan kepemilikan diperiksa petugas, bukan ditentukan oleh keberadaan dua tiket.

## Yang sudah tersedia dan perlu dipertahankan

- `createInventory` mencatat barang diterima di pos; nama penemu, deskripsi, foto, dan lokasi temuan dapat dilengkapi. `handoverInventory` menerima nama penerima tanpa mensyaratkan akun.
- Jalur laporan daring memiliki pencocokan manual, pemeriksaan status, transaksi, penguncian laporan berurutan, riwayat perubahan, dan notifikasi. Pertahankan perlindungan tersebut ketika relasinya diperluas.
- Daftar inventaris sudah dibatasi di SQL dengan keyset pagination. Perbaikan alur tidak memerlukan pengambilan seluruh inventaris ke browser.
- Session/role dan origin diperiksa oleh HTTP Satpam. Temuan audit penyerahan di bawah bukan klaim endpoint dapat dipakai tanpa login.

## Temuan source sebelum perbaikan

### 1. Laporan kehilangan yang dipilih tidak ikut penyerahan inventaris

**Prioritas tinggi untuk integrasi.** Pada `MatchingWorkspace`, kehilangan dan inventaris dapat dipilih bersamaan, tetapi tombol berikutnya membuka `InventoryDetailDialog`. Dialog hanya mengirim `recipient` dan `note` ke endpoint penyerahan inventaris. ID kehilangan tidak dikirim; repository hanya memperbarui `satpam_inventory`.

Bukti: [pemilihan kandidat dan canValidate](../src/features/lost-found/components/satpam-lost-found-workspace.tsx), [request penyerahan inventaris](../src/features/lost-found/components/satpam-inventory-workspace.tsx), [repository handoverInventory](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts), [endpoint](../src/app/api/satpam/inventory/[id]/handover/route.ts).

Akibat: inventaris dapat menjadi Diserahkan sementara kehilangan tetap Diproses, tanpa notifikasi penyelesaian untuk pemilik. Ini menegaskan kembali ARCH-02 pada audit sebelumnya. Pemilihan di UI belum merupakan hubungan database.

### 2. Riwayat dan Dashboard belum mencakup penyerahan inventaris

**Prioritas tinggi untuk kelengkapan informasi.** `history()` membaca `report_handovers` melalui `lost_found_matches`. Penyerahan inventaris tidak menulis ke sana. Dashboard juga menghitung laporan/pasangan, bukan stok dan penyerahan inventaris.

Akibat: barang yang telah diserahkan dapat dilihat melalui status inventaris tetapi tidak muncul di Riwayat penyerahan bersama. Dashboard dapat menyatakan tidak ada laporan aktif saat masih ada barang tersimpan. Nilai query bisa benar sesuai scope laporan, tetapi belum mewakili seluruh pekerjaan pos.

Bukti: [dashboard, history, handoverInventory](../src/features/lost-found/infrastructure/drizzle-satpam-repository.ts) dan [schema terpisah](../src/db/lost-found-schema.ts).

### 3. Penyerahan inventaris belum memiliki perlindungan dan jejak setara jalur laporan

**Prioritas tinggi untuk integritas.** Repository membaca status lalu melakukan UPDATE berdasarkan ID saja, tanpa kondisi status tersimpan atau lock transaksi. Dua permintaan bersamaan berpotensi sama-sama lolos pemeriksaan awal dan saling menimpa penerima. Ini risiko berdasarkan source; audit ini tidak menjalankan uji race baru.

Tabel menyimpan `registeredBy`/`registeredByName` saat barang masuk, tetapi tidak menyimpan actor/petugas khusus saat penyerahan. Parameter actor pada `handoverInventory` belum dipakai untuk menulis jejak tersebut. Jangan menyamakan pencatat awal dengan orang yang menyerahkan barang.

Arah koreksi: transaksi atau conditional update dengan pemeriksaan hasil, audit penyerahan immutable, actor dari session, snapshot petugas nyata bila akun Satpam dipakai bersama, serta perlindungan retry. Konflik harus menghasilkan 409, bukan menimpa catatan lama.

### 4. Pencocokan dua laporan masih wajib bagi jalur laporan

**Prioritas sedang, keputusan desain.** `match` mensyaratkan kehilangan + temuan sama-sama Diproses. Penyerahan mensyaratkan match; penyelesaian mensyaratkan kedua laporan Diserahkan dan adanya catatan penyerahan. Pelaksanaan penyerahan dan penutupan masih dua aksi.

Jalur ini cocok untuk dua laporan yang memang ada, tetapi belum mendukung penyelesaian laporan tunggal berdasarkan pengembalian langsung atau informasi lapangan yang dapat dipertanggungjawabkan. Jangan melonggarkan status server tanpa lebih dulu merancang jenis penyelesaian dan bukti/catatan yang sesuai.

### 5. Dua cara mencatat temuan dapat menggandakan representasi barang

**Prioritas sedang, risiko desain.** Tambah Inventaris menulis barang fisik; Catat Temuan membuat `reports` + detail temuan tanpa relasi ke inventaris. Tidak ada relasi yang menjamin keduanya menunjuk barang yang sama. Ini risiko pencatatan ganda, bukan klaim bahwa database lokal saat ini sudah berisi duplikasi.

Satpam yang menerima barang perlu satu pintu pencatatan. Laporan temuan daring harus dibedakan dari konfirmasi barang sudah diterima secara fisik oleh Satpam.

### 6. Orang yang datang langsung belum terpisah jelas dari pencatat

`createLossReport` dan `createFoundReport` menggunakan akun Satpam sebagai `reporterId`. Ini mengidentifikasi pencatat, tetapi tidak mengidentifikasi pemilik sebenarnya yang datang ke pos. Data nama/kontak pemilik opsional dan relasi akun bila tersedia perlu dibedakan dari actor pencatat; jangan membuat akun fiktif agar alur dapat diteruskan.

Audit lama [e968fa0/38b0a96](audit-satpam-e968fa0-38b0a96.md) memuat temuan validasi, idempotensi, dan UI lainnya. Dokumen ini tidak menutup temuan lama atau mengklaim semuanya diuji ulang. Riwayat Git menunjukkan inventaris awal pada 06fd77d dan integrasi kandidat pada e968fa0; audit perilaku sekarang memakai workspace aktual, bukan menyalahkan satu commit atas seluruh keadaan saat ini.

## Usulan alur untuk dibahas

Gunakan Inventaris sebagai pusat barang yang secara fisik berada dalam penguasaan pos. Laporan web adalah informasi/permintaan bantuan yang dapat ditautkan, bukan prasyarat penerimaan atau pengembalian.

| Kasus lapangan | Aksi Satpam | Hubungan laporan web | Hasil |
| --- | --- | --- | --- |
| Mahasiswa menyerahkan barang, belum ada laporan | Terima barang, catat nama barang dan keterangan minimum | Tidak wajib membuat laporan temuan kedua | Barang Tersimpan |
| Pemilik datang dan kepemilikan dapat dikonfirmasi | Buka barang, Konfirmasi penyerahan | Opsional | Barang Dikembalikan/Selesai dan riwayat penyerahan |
| Pemilik sudah membuat laporan kehilangan | Pilih barang, tautkan laporan, Konfirmasi penyerahan | Kehilangan wajib ikut transaksi setelah dipilih | Barang dan laporan selesai bersama; pemilik mendapat pembaruan |
| Temuan dilaporkan online, barang masih di penemu | Terima/tindak lanjuti laporannya | Jangan dianggap stok pos sebelum diterima | Laporan aktif, belum ada stok fisik |
| Barang dan pemilik bertemu langsung di pos | Catat penerimaan dan pengembalian dalam satu form ringkas | Tidak wajib membuat dua laporan buatan | Dua kejadian tercatat dalam satu transaksi, langsung selesai |
| Barang ditemukan sendiri/selesai di luar pos | Catat penyelesaian laporan dengan alasan yang sesuai | Tidak membuat pengembalian stok yang tidak pernah diterima | Laporan ditutup dengan jenis penyelesaian yang benar |

Untuk form penyerahan: penerima dan konfirmasi petugas atas kepemilikan; laporan terkait opsional; waktu dari server; keterangan bila perlu. Pemeriksaan kepemilikan bisa berupa ciri khusus, identitas yang cocok, atau bukti lain yang relevan. Jangan mengharuskan upload identitas atau mempublikasikan detail pembuktian. Detail bukti cukup tersedia bagi petugas sesuai kebijakan kampus.

Penyimpanan minimal yang disarankan: barang fisik, laporan opsional terkait, dan kejadian penerimaan/penyerahan dengan actor/petugas, penerima, waktu, serta ringkasan pemeriksaan. Relasi laporan tidak dipaksakan NOT NULL. Satu pengembalian final per barang dijaga database; perubahan status, laporan tertaut, audit, dan notifikasi berada dalam transaksi yang sama. Penetapan nama tabel, kardinalitas, retensi, dan backfill menunggu rancangan implementasi.

Untuk UI, pertahankan struktur halaman dan komponen yang masih berguna. Pencocokan menjadi bantuan mencari kandidat, sedangkan Konfirmasi penyerahan menjadi aksi operasional utama. Satu form boleh mencatat beberapa kejadian internal agar pengguna tidak harus mengklik semua tahap. Riwayat menampilkan kedua sumber penyerahan dengan label asal, tanpa menggandakan jumlah barang.

## Pembanding nyata

- [University of Michigan: University Unions Lost & Found](https://campusinfo.umich.edu/article/university-unions-lost-found): barang yang diserahkan ke petugas dicatat dalam inventaris; pemilik dapat mencari barang atau mengajukan klaim; petugas dapat meminta informasi tambahan untuk membuktikan kepemilikan. Ini contoh penerimaan fisik yang berjalan bersama layanan web. Jangan menyalin kebijakan retensi kampus tersebut sebagai kebijakan JTI.
- [MissingX](https://www.missingx.com/en/): mendukung pencatatan barang temuan, pemindahan dan audit; layanan web menghubungkan orang dengan kantor barang hilang, sedangkan kantor bertanggung jawab atas pencocokan fisik dan menghubungi pemilik. Ini tidak membuktikan produk tersebut membolehkan setiap jenis penyerahan tanpa klaim.

Rekomendasi untuk JTI adalah sintesis dari source proyek dan kasus lapangan pengguna, bukan klaim bahwa kedua layanan memiliki implementasi backend yang sama dengan usulan ini.

## Urutan implementasi yang disarankan

1. Amankan penyerahan inventaris dari update bersamaan dan tambahkan jejak petugas penyerah.
2. Tambahkan relasi opsional laporan dan penyerahan dengan transaksi utuh. Uji pengembalian tanpa laporan serta pengembalian dengan laporan tertaut.
3. Satukan pembacaan Riwayat dan perjelas scope KPI Dashboard. Bedakan jumlah barang fisik dari jumlah laporan.
4. Rapikan satu pintu Terima barang dan aksi penyerahan cepat; hindari entri temuan ganda.
5. Tambahkan penyelesaian di luar pos bila kebijakan kampus sudah ditetapkan.

Perubahan struktur relasi/event nantinya memerlukan migration baru yang mempertahankan data lama. Jangan mengedit migration yang telah dibagikan, menghapus stok, atau memindahkan data historis tanpa pemetaan/backfill yang ditinjau. Audit ini tidak mengubah schema dan tidak membutuhkan migration/seed.

## Verifikasi manual untuk rancangan berikutnya

- Barang datang tanpa akun/laporan: dapat diterima dan dikembalikan tanpa entri laporan fiktif.
- Kehilangan tertaut: pengembalian menutup laporan yang benar, menghasilkan satu riwayat, dan mengirim pembaruan pada pemilik yang benar.
- Dua petugas menyerahkan barang bersamaan: tepat satu berhasil; pihak lain menerima konflik tanpa menimpa penerima.
- Retry sesudah respons terputus: tidak menggandakan barang, penyerahan, atau audit.
- Temuan online belum diterima: tidak masuk stok pos.
- Barang sudah diserahkan: tidak bisa dipilih sebagai kandidat yang tersedia.
- Data lama tetap terbaca; pencatat awal dan penyerah dibedakan; jumlah di Dashboard/Riwayat memakai scope yang jelas.
