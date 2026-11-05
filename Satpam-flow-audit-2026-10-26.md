# Audit alur Satpam — 26 Oktober 2026

**Pembaruan 6 November 2026:** F03 ditangani dengan pilihan asal pada penerimaan/draft dan penautan melalui koreksi barang yang belum diserahkan. F05/F06 ditangani untuk penyerahan baru dengan evidence wajib, idempotensi, dan penyelesaian pasangan dalam satu transaksi. F07 memakai identitas pelapor langsung pada antrean. F09 ditangani dalam batas: koreksi metadata Inventaris sebelum diserahkan dengan audit/versi, penutupan khusus laporan belum tertaut, serta pembatalan pasangan sebelum penyerahan dengan snapshot audit. Pembukaan ulang barang yang sudah diambil dan penggantian tautan asal yang sudah ada tidak disediakan. F01/F02 ditunda sesuai keputusan pengguna untuk mencocokkan saat pemilik datang. F04 tetap hanya dijamin pada jalur form berdraft; API lama tanpa kunci belum mendapat jaminan baru. Uraian audit awal berikut adalah rekam jejak sebelum perubahan, bukan daftar bug yang semuanya masih terbuka.

**Pembaruan 5 November 2026:** F08 ditangani pada Pelaporan Pos Satpam melalui draft terpisah per jenis, autosave, dan pemulihan foto privat. Alur dikembalikan menjadi tiga langkah sesuai arahan pemilik proyek; kembali antar langkah tetap mempertahankan draft. F04 ditangani untuk jalur form baru: Kehilangan memakai ID draft untuk retry idempoten, sedangkan Inventaris mempertahankan kunci pengiriman; pemanggil endpoint lama tanpa ID draft belum memperoleh jaminan baru. F01, F02, dan F03 mengenai penyimpanan kecocokan dan penghubungan barang Temuan tetap terbuka. Uraian di bawah adalah temuan saat audit dan dipertahankan sebagai rekam jejak, bukan representasi bahwa semua poin masih sama.

## Cakupan dan metode

Audit mencakup Pelaporan Pos Satpam, Kehilangan & Temuan (termasuk Pencocokan/Penyerahan), Inventaris, detail modal, validasi domain, repository Drizzle, dan constraint/index terkait. Dashboard dan Riwayat diperiksa sebagai keluaran proses penyerahan. Baseline adalah `main` pada `e26ad09` beserta perbaikan lokal Pencocokan dan styling sesudah commit tersebut.

Metode: penelusuran kode UI → request → validasi → transaksi PostgreSQL → proyeksi daftar/riwayat. Enam perilaku penting dibuktikan dengan fixture PostgreSQL development dalam satu transaksi luar yang di-rollback setelah assertion berhasil. Tidak ada akun/laporan/barang audit yang dipertahankan.

Tidak menjalankan browser automation, Preview Mode, atau Playwright. Kritik visual menggunakan screenshot pengguna dan struktur komponen; perilaku klik, fokus, keyboard, layar sempit, serta kehilangan isian perlu QA manual. Audit ini tidak mengubah implementasi, migration, atau seed.

## Penilaian utama

Pemisahan **laporan sebagai informasi** dan **Inventaris sebagai barang fisik di pos** tepat dan perlu dipertahankan. Namun, keduanya masih mempunyai aturan pencocokan dan penyelesaian yang berbeda. Penyatuan kandidat di UI telah memperbaiki keterlihatan, tetapi belum menyatukan model operasional di belakangnya. Prioritas berikutnya adalah konsistensi lifecycle dan relasi, kemudian pengurangan langkah dan informasi pada layar.

## Peta alur yang tersedia

| Kondisi lapangan | Perilaku sekarang | Penilaian |
| --- | --- | --- |
| Pemilik melapor langsung di pos | Pelaporan → Kehilangan → informasi → pemeriksaan → laporan Baru | Tersedia; formulir/wizard masih panjang untuk pencatatan rutin. |
| Barang langsung diserahkan tanpa laporan web | Pelaporan jalur Temuan atau tombol Terima barang → Inventaris | Tersedia tanpa membuat dua laporan fiktif; penamaan jalur masih bercampur. |
| Temuan web kemudian diterima di pos, belum dicocokkan | Catat barang di pos dari laporan/kandidat → Inventaris tertaut → kandidat tetap tersedia | Tersedia; langsung menerima dari Baru diperbolehkan dan otomatis menjadi Diproses. |
| Dua laporan sudah cocok sebelum barang tiba | Catat kecocokan → Barang teridentifikasi → penyerahan pasangan | Pasangan dapat disimpan, tetapi penerimaan Inventaris tertaut sesudahnya ditolak. |
| Barang Inventaris cocok dengan laporan Kehilangan, pemilik belum datang | Periksa kecocokan membuka detail/perbandingan | Belum ada penyimpanan hubungan menunggu pengambilan. |
| Barang Inventaris diambil pemilik | Catat penerima/petugas/pemeriksaan → barang Diserahkan; laporan tertaut Selesai | Tersedia dan satu transaksi. Laporan Kehilangan boleh tidak ada. |
| Pasangan dua laporan diserahkan | Catat penyerahan → kedua laporan Diserahkan → Selesaikan laporan terpisah | Berbeda dari jalur Inventaris; ada pekerjaan penutupan tambahan. |
| Pemilik menemukan sendiri / laporan ditarik | Tidak ada aksi domain khusus untuk menutup tanpa pasangan/penyerahan | Belum tertangani secara jujur dalam alur yang tersedia. |

## Temuan prioritas

### F01 — P1: kecocokan Inventaris belum dapat disimpan sebelum pemilik datang

**Bukti kode:** `src/features/lost-found/components/satpam-lost-found-workspace.tsx` pada cabang kandidat Inventaris dan `InventoryDetailDialog`; `src/features/lost-found/components/inventory-detail-dialog.tsx:46` hanya mengirim `lossTicket` pada request penyerahan. `src/features/lost-found/infrastructure/drizzle-inventory-repository.ts:138` menyimpan relasinya di `report_handovers`. Sementara itu, `DrizzleSatpamRepository.pending()` membaca `lost_found_matches`, yang hanya mempunyai pasangan laporan–laporan.

**Kasus:** Satpam sudah memeriksa dompet dan menemukan laporan pemiliknya, tetapi pemilik baru bisa mengambil sore hari. Menutup dialog tidak menghasilkan kecocokan tersimpan. Petugas berikutnya harus mencari dan mencocokkan ulang; antrean Penyerahan tidak mencerminkan hasil pemeriksaan tersebut.

**Saran:** sediakan catatan kecocokan yang tahan pergantian halaman/sesi untuk kedua sumber. Bedakan tindakan **catat kecocokan** dari **konfirmasi penyerahan**. Pencocokan tidak boleh otomatis menyatakan bahwa barang sudah diambil atau mengirim pesan eksternal.

**Status:** terverifikasi dari kontrak UI/API/schema; bukan kegagalan tombol simpan karena tombol tersebut memang belum tersedia untuk sumber Inventaris.

### F02 — P1: urutan cocok dahulu, barang diterima kemudian belum terakomodasi

**Bukti:** `src/features/lost-found/infrastructure/drizzle-inventory-repository.ts:91` menolak penerimaan ketika Temuan sudah mempunyai pasangan atau berstatus di luar Baru/Diproses. Pencocokan pasangan mengubah kedua laporan menjadi Barang teridentifikasi pada `drizzle-satpam-repository.ts:163`. Tombol penerimaan di detail juga hanya tersedia saat Baru/Diproses.

**Kasus:** Kehilangan dan Temuan cocok pukul 10.00; penemu baru menyerahkan barang pukul 10.15. Barang tidak dapat dimasukkan sebagai Inventaris yang terhubung ke laporan tersebut. Mencatat barang baru tanpa tautan justru menciptakan representasi terpisah.

**Risiko UX:** antrean menyebut pasangan siap diserahkan meskipun sistem belum mencatat bahwa barang sudah berada di pos.

**Saran:** penerimaan fisik memperbarui penguasaan barang yang sama, sambil mempertahankan kecocokan. Jangan sekadar menghapus guard server; relasi, lock, uniqueness, dan penyerahan harus direkonsiliasi dalam transaksi. Gunakan keterangan **Cocok, barang belum di pos** dan **Siap diambil** berdasarkan keadaan fisik yang benar.

**Status:** penolakan penerimaan setelah pencocokan dibuktikan pada PostgreSQL.

### F03 — P1: tombol penerimaan umum dapat mencatat barang tanpa menghubungkan Temuan yang sudah ada

**Bukti:** tombol Terima barang di Inventaris membuka `RegisterInventoryDialog` tanpa `sourceFound` pada `satpam-inventory-workspace.tsx:96`; Pelaporan jalur Temuan juga tidak menawarkan pemilihan laporan asal. `matching-candidates.ts` menghindari duplikasi melalui `sourceFoundTicket`, bukan kemiripan nama.

**Kasus:** mahasiswa sudah mengirim Temuan, kemudian menyerahkan barang. Petugas memilih tombol umum Terima barang, bukan membuka laporan asal. Barang Inventaris berhasil dibuat, tetapi Temuan lama tetap berdiri sendiri; keduanya menjadi dua kandidat.

**Saran:** saat penerimaan umum, sediakan pilihan ringan **Sudah ada laporan Temuan?** dengan pencarian/pilihan opsional. Barang langsung tanpa laporan harus tetap dapat diterima. Jangan menggabungkan otomatis berdasarkan nama yang sama karena dua barang berbeda dapat mempunyai nama/deskripsi identik.

**Status:** PostgreSQL menerima stok tanpa relasi, dan proyeksi kandidat memperlihatkan dua entri. Ini membuktikan risiko pada skenario tersebut, bukan menyatakan seluruh barang bernama sama adalah duplikat atau database pengguna saat ini sudah rusak.

### F04 — P1: pengiriman ulang laporan Kehilangan belum memiliki perlindungan seperti Inventaris

**Bukti:** `satpam-pelaporan-workspace.tsx:78` mengirim kehilangan tanpa kunci pengiriman stabil; `drizzle-satpam-repository.ts:337` membuat `submissionKey: randomUUID()` baru di setiap pemanggilan. Inventaris sudah memakai kunci/fingerprint pengiriman yang stabil.

**Kasus:** penyimpanan sebenarnya berhasil tetapi respons jaringan terputus. Petugas mencoba lagi dan mendapatkan laporan kedua untuk satu tindakan pencatatan.

**Saran:** gunakan kunci per tindakan pencatatan yang dipertahankan saat retry, validasi fingerprint, dan hasil yang sama untuk pengulangan identik. Jangan membuat unique constraint pada nama/isi laporan; pencatatan dua barang serupa yang memang disengaja harus tetap sah.

**Status:** pengiriman input kehilangan identik dua kali dibuktikan menghasilkan dua ID berbeda pada PostgreSQL. Ini adalah bukti tidak adanya idempotency, bukan klaim setiap input identik seharusnya ditolak.

### F05 — P1: standar pemeriksaan kepemilikan berbeda antara dua jalur penyerahan

**Bukti:** Inventaris mewajibkan `ownershipEvidence` di `domain/inventory.ts:65` dan constraint `handover_inventory_evidence_check`. Penyerahan pasangan pada `domain/satpam.ts:20` tidak mempunyai field tersebut; `HandoverDialog` hanya menawarkan catatan opsional. Event penyerahan pasangan menggunakan nilai default evidence kosong.

**Dampak:** catatan pemeriksaan barang yang sama bergantung pada asal pencatatannya. Nama penerima/petugas tetap tercatat, tetapi dokumentasi cara memastikan kepemilikan tidak setara. Ini tidak membuktikan petugas di lapangan tidak memeriksa; sistem tidak mewajibkan hasil pemeriksaannya dicatat pada satu jalur.

**Saran:** satu formulir/kontrak penyerahan untuk kedua sumber, dengan penerima, petugas aktif, dan hasil pemeriksaan singkat. Tidak perlu memaksa akun web penerima atau mengunggah identitas sensitif.

**Status:** penyerahan pasangan dengan catatan kosong menghasilkan evidence kosong pada PostgreSQL; penyerahan Inventaris memakai evidence wajib.

### F06 — P2: satu kejadian penyerahan mempunyai dua cara penyelesaian

**Bukti:** `drizzle-satpam-repository.ts:174` hanya mengubah pasangan menjadi Diserahkan; `:176` membutuhkan perintah penutupan lain. Penyerahan Inventaris pada `drizzle-inventory-repository.ts:146` langsung menyelesaikan laporan tertaut. Antrean pending mengecualikan pasangan yang sudah mempunyai handover, sehingga tahap penutupan tidak dikerjakan lagi dari antrean Penyerahan.

**Dampak:** petugas harus mengingat menutup pasangan melalui detail laporan, sementara barang Inventaris tidak memerlukan aksi tersebut. Laporan yang sudah diserahkan masih dapat terlihat aktif sampai penutupan tambahan dilakukan.

**Saran:** bila tidak ada pekerjaan nyata sesudah pengambilan, satu konfirmasi penyerahan menyelesaikan proses. Event Diserahkan tetap disimpan sebagai riwayat; tidak perlu menjadikannya tugas manual tambahan. Bila memang ada kewajiban sesudah pengambilan, jelaskan tugas tersebut dan terapkan konsisten pada kedua sumber.

**Status:** kedua perilaku penyelesaian dibuktikan pada PostgreSQL.

### F07 — P2: nama pelapor langsung salah pada antrean Penyerahan

**Bukti:** `drizzle-satpam-repository.ts:99` memproyeksikan `reporter: users.name`, sedangkan akun pencatat laporan langsung menjadi `reports.reporterId`. Daftar/detail sudah membaca `satpam_loss_reports.owner_name`, tetapi proyeksi antrean belum mengikuti aturan tersebut.

**Kasus:** pemilik bernama Pemilik Audit dilayani oleh akun Pencatat Audit. Setelah dicocokkan, antrean menampilkan Pencatat Audit sebagai pelapor.

**Saran:** pakai satu aturan proyeksi identitas: pemilik langsung bila tersedia, identitas pelapor web untuk laporan mandiri, dan akun pencatat ditampilkan terpisah. Fallback harus dinyatakan sebagai pelapor langsung/tidak tercatat, bukan mengubah akun Satpam menjadi pemilik barang.

**Status:** dibuktikan pada PostgreSQL.

### F08 — P2: isian Pelaporan belum aman saat berganti langkah/jenis sebelum pemeriksaan

**Bukti:** `lossData`/`foundData` pada workspace baru diperbarui melalui `onProceedToReview` (`satpam-pelaporan-workspace.tsx:283` dan `:298`). Form memegang state lokal dan di-unmount ketika langkah berubah. Tombol Ganti Jenis/stepper mengubah langkah tanpa menyimpan isian aktif terlebih dahulu.

**Kasus:** isi sebagian informasi, lalu ganti jenis dan kembali. Isian baru belum ada pada state induk; bila sebelumnya pernah masuk pemeriksaan, form dapat kembali ke snapshot lama, bukan revisi terakhir. Reload/navigasi keluar juga tidak mempunyai pemulihan draft khusus Satpam.

**Saran:** pertahankan isian aktif per jenis selama sesi; draft server/lokal terikat akun adalah keputusan tersendiri sesuai kebutuhan. Jangan memaksa pengguna memvalidasi seluruh form hanya untuk mempertahankan isian.

**Status:** ditelusuri dari kepemilikan state/unmount; belum diuji klik di browser karena aturan proyek mewajibkan QA interaksi manual.

### F09 — P2: pembetulan dan penutupan di luar pengambilan belum mempunyai jalur domain

**Bukti:** port layanan dan endpoint Inventaris menyediakan create/read/handover, tanpa koreksi metadata/tautan atau pembatalan kecocokan. Perintah selesai pada laporan mensyaratkan pasangan dan handover. Tidak ada alasan penutupan khusus untuk pemilik menemukan sendiri, menarik laporan, atau koreksi pencatatan.

**Saran:** tambahkan aksi terbatas dengan alasan dan audit trail untuk kasus sah tersebut. Perubahan metadata tidak berarti mengizinkan penghapusan histori, pembukaan ulang penyerahan, atau memberikan Satpam fitur admin database. Pembatalan kecocokan juga perlu mengembalikan status/ketersediaan secara atomik.

**Status:** batas kontrak API/domain yang terverifikasi; bentuk UI dan kebijakan koreksinya memerlukan keputusan produk.

## Kritik UI/UX per halaman

### Pelaporan Pos Satpam

- Tiga langkah untuk dua jenis pencatatan yang pendek masih mahal bagi petugas yang melayani antrean. Sebaiknya pemilih jenis dan form berada dalam satu halaman, dengan pemeriksaan sebagai dialog bila dibutuhkan. Ini usulan, belum perubahan yang diterapkan.
- Nama **Laporan Temuan (Inventaris Pos)** mencampur laporan informasi dan penerimaan barang. Pilihan **Catat kehilangan** dan **Terima barang** lebih menjelaskan tindakan fisik yang dilakukan.
- Form Kehilangan meminta judul, nama barang, lokasi, dan deskripsi wajib. Judul dan nama barang sering tumpang tindih. Nama barang dapat menjadi sumber judul otomatis; pengecualian judul khusus bisa tetap tersedia.
- Form Kehilangan mengisi characteristics dan description dari satu teks yang sama. Dialog perbandingan menampilkan kedua field tersebut, sehingga teks bisa terulang meskipun pengguna hanya mengisi sekali. Proyeksi detail perlu menampilkan satu keterangan bila isinya sama.
- Nama/kontak pemilik opsional dan waktu otomatis dari server sudah sesuai pendekatan less input. Jangan mengembalikan ketergantungan pada akun web pemilik.
- Saat submit, tombol final nonaktif, tetapi navigasi stepper belum menerima status submitting. Cegah perpindahan konteks selama request aktif tanpa membuang isian saat gagal.

### Kehilangan & Temuan

- Empat tab adalah pembagian tugas yang bisa dipahami, tetapi tahap Proses laporan, pilihan pasangan, pemeriksaan kecocokan, konfirmasi kecocokan, penyerahan, dan penutupan tetap menambah perpindahan konteks.
- Tab Penyerahan perlu menunjukkan kesiapan nyata, bukan sekadar adanya dua laporan yang sudah cocok. F01/F02/F06 perlu diputuskan sebelum menambah indikator/status baru.
- Daftar kandidat yang menyatukan Temuan/Inventaris dan badge kondisi fisik adalah perbaikan yang tepat. Namun, satu label **Periksa kecocokan** masih menuju dua hasil yang berbeda: konfirmasi pasangan atau detail barang dengan formulir penyerahan. Teks seragam belum menjamin aksi seragam.
- Deskripsi berulang pada modal dan beberapa label masih memakai istilah tiket atau Diserahkan/Selesai tanpa menjelaskan tugas berikutnya. Prioritaskan status saat ini, lokasi barang, dan satu aksi berikutnya.
- Stepper status dapat menjadi informasi sekunder di detail. Riwayat peristiwa dengan waktu/petugas lebih berguna ketika proses di lapangan tidak linear.
- Fokus dan keyboard pada pemilih kehilangan awal perlu QA: beberapa kartu masih memakai div/Card dengan onClick, walaupun tombol pilih dan Detail tersedia. Pemilih kandidat baru memakai tombol dengan aria-pressed; pola tersebut lebih jelas untuk dipertahankan.

### Inventaris Pos Satpam

- Fungsi penyimpanan dan penyerahan tanpa laporan web adalah nilai utama halaman ini. Nama penemu/lokasi temuan opsional sudah tepat.
- Kartu foto rasio 4:3 mendominasi tinggi daftar, termasuk saat foto tidak tersedia. Untuk kerja rutin, thumbnail kecil, nama, lokasi, dan status bisa menjadi tampilan utama; foto besar tetap tersedia di detail. Nilai ini perlu QA dengan jumlah barang nyata, bukan hanya satu kartu.
- Penerimaan satu barang melalui modal singkat di sini, tetapi melalui tiga langkah di Pelaporan. Banyak pintu masuk boleh dipertahankan sebagai shortcut; komponen, data yang diminta, dan hasil penyimpanannya harus sama.
- Detail → Serahkan barang → modal konfirmasi menambah lapisan. Form penyerahan dapat disatukan dalam satu konteks yang ringkas, dengan detail tambahan bisa dibuka bila perlu. Penerima, petugas, dan pemeriksaan kepemilikan tetap bernilai dan tidak sebaiknya dihapus demi mengejar jumlah klik.
- Teks empty state masih menyebut **Tambah barang**, sedangkan CTA saat ini **Terima barang** (`satpam-inventory-workspace.tsx:112`). Ini penyimpangan copy kecil yang konkret.
- Lokasi simpan selalu default Pos Satpam dan belum bisa diatur dari form. Cukup untuk satu titik penyimpanan, tetapi belum mendukung rak/lemari/pos berbeda. Jangan menambah field jika kebutuhan tersebut belum ada.

## Styling, backend, dan database yang sudah baik

- Komponen pada tiga halaman menggunakan Shadcn dan helper field `FieldDescription`; tidak ditemukan warna hex lokal atau ukuran teks arbitrary pada scan komponen lost-found saat audit ini.
- Masih ada override stacking `z-[80]` dan `z-[70]` pada dialog keputusan laporan. Normalisasikan di primitive/token jika pola dialog bertingkat dipertahankan; tidak perlu mengubah seluruh sistem warna untuk itu.
- Inventaris dan laporan tertaut memakai FK/unique constraint, transaksi, penguncian, petugas aktif, actor dari session, serta snapshot identitas. Penyerahan ganda pada barang yang sama dilindungi. Audit alur tidak membatalkan manfaat fondasi ini.
- Lampiran dibaca melalui endpoint privat. Thumbnail memiliki cache proses yang dibatasi; gambar tidak perlu dipublikasikan agar UI lebih cepat.
- Daftar dibatasi dan memakai keyset pagination; beberapa proyeksi mengambil lampiran dalam batch. Index status/tanggal/ID dan relasi unique mendukung query tersebut. Belum dilakukan benchmark volume besar atau EXPLAIN ANALYZE pada audit ini; tidak ada klaim bahwa seluruh halaman sudah cepat berdasarkan pembacaan kode saja.
- Proyeksi kandidat masih memuat dua sumber dengan pagination masing-masing lalu menggabungkannya di UI. Aman untuk menampilkan jumlah **yang sudah dimuat**, tetapi bukan total gabungan yang dihitung global. Hindari mengklaim urutan seluruh kandidat sudah global bila hanya sebagian halaman kedua sumber dimuat.
- `satpam_loss_reports.id` belum mempunyai FK eksplisit ke `reports.id`, sementara data kehilangan dicatat pada keduanya. Kedua insert saat ini satu transaksi, tetapi constraint hubungan dan sumber data yang berulang adalah utang integritas yang perlu ditinjau terpisah; audit ini tidak menemukan bukti korupsi data aktual.

## Arah flow yang disarankan

1. **Catat informasi** bila orang melaporkan kehilangan/temuan. Tidak mensyaratkan barang sudah di pos.
2. **Catat penerimaan fisik** kapan pun barang tiba; tautkan ke informasi/kecocokan yang sudah ada, tanpa membuat kandidat baru.
3. **Catat kecocokan** untuk kedua sumber dengan hubungan yang persisten. Penemuan kecocokan dan kedatangan barang boleh terjadi dalam urutan mana pun.
4. **Siap diambil** hanya bila kecocokan cukup terkonfirmasi dan barang memang berada pada penguasaan yang sesuai untuk penyerahan.
5. **Konfirmasi pengambilan sekali** dengan penerima, petugas, dan hasil pemeriksaan; stok dan laporan terkait selesai dalam transaksi yang sama. Riwayat mempertahankan seluruh peristiwa.
6. **Tutup dengan alasan lain** bila kasus sah selesai tanpa pengambilan di pos; jangan mengarang pasangan/penyerahan untuk sekadar menutup status.

Pemisahan informasi, penguasaan barang, kecocokan, dan penyerahan adalah model data/peristiwa. Tidak semua peristiwa harus berubah menjadi satu layar, satu modal, atau satu langkah wajib tambahan bagi petugas.

## Urutan pengerjaan yang disarankan

1. Putuskan model kecocokan/penerimaan yang menangani F01–F03 sekaligus, termasuk urutan kedatangan barang yang berbeda.
2. Samakan kontrak pemeriksaan dan penyelesaian penyerahan (F05/F06), lalu koreksi proyeksi identitas (F07).
3. Lindungi retry pencatatan Kehilangan (F04).
4. Ringkas Pelaporan serta pertahankan isian/draft (F08); konsistenkan istilah dan pintu masuk penerimaan.
5. Tambahkan koreksi/penutupan sah yang terbatas sesuai keputusan produk (F09).
6. Uji dengan petugas/manual QA, termasuk barang datang belakangan, pergantian shift, koneksi putus setelah simpan, dua barang mirip, pemilik tanpa akun, salah pilih pasangan, dan pemilik menemukan sendiri. Baru sesudah itu sesuaikan kepadatan foto/teks berdasarkan penggunaan nyata.

## Bukti PostgreSQL pada audit ini

Assertion yang berhasil dalam fixture rollback:

1. Dua pengiriman input kehilangan identik membuat dua record dengan ID berbeda.
2. Laporan Temuan dan penerimaan umum tanpa source link muncul sebagai dua kandidat.
3. Setelah pasangan dicatat, penerimaan Inventaris yang menunjuk Temuan tersebut ditolak.
4. Antrean pasangan untuk laporan langsung menampilkan nama akun pencatat, bukan owner_name.
5. Penyerahan pasangan menerima evidence kosong dan berhenti pada Diserahkan.
6. Penyerahan Inventaris dengan laporan Kehilangan tertaut langsung mengubah laporan menjadi Selesai.

Transaksi selesai di-rollback setelah seluruh assertion berhasil. Tidak melakukan commit/push, migration, seed, atau perubahan implementasi sebagai bagian audit ini.
