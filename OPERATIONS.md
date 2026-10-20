# Pengaturan Operasional dan Kelola Pengguna

Menu Manajemen:

- `/manajemen/pengaturan`: halaman panjang dengan navigasi per bagian, pencarian, filter, dan pagination enam baris per bagian. Kelola Petugas Satpam, Area/Lantai, Ruangan/Lokasi, Fasilitas, dan Layanan. Dialog lokasi menyimpan pemetaan fasilitas bersama lokasi dalam satu transaksi.
- `/manajemen/pengguna`: pencarian dan pagination server (12 akun), tambah akun, ubah identitas/peran, aktif/nonaktif. Tidak menyediakan akses admin, hapus akun, ganti email login, reset password, atau koreksi tiket teknis.

## TEFA: backend operasional dan akses antar-role

TEFA memakai login/session Better Auth yang sama. Halaman Ringkasan, Kelola Laporan, Riwayat, Notifikasi, dan Profil dilindungi guard server `requireRole("tefa")`. API `/api/tefa` memeriksa akun aktif dan role database pada setiap request; mutasi memerlukan Origin yang sesuai dan JSON dibatasi 12 KB. Pendaftaran publik tetap ditutup dan role tidak dapat dipilih melalui login/update profil mandiri.

### Routing dan hubungan data

- Pengelola layanan disimpan pada `services.handler_role`, hanya `manajemen` atau `tefa`. Submit memvalidasi ulang layanan aktif di server di bawah lock katalog yang sama dengan Pengaturan, kemudian menyimpan snapshot `reports.handler_role`. Tidak ada tebakan nama, awalan JTI, atau kepercayaan pada role yang dikirim klien.
- Migration `0014_tefa_service_routing.sql` mengarahkan ID katalog asli `service-1` sampai `service-4` (Surat, Ruang Baca, Evaluasi Pembelajaran, E-Learning) ke TEFA. Administrasi, Keamanan, dan Kebersihan tetap Manajemen. Verifikasi katalog lingkungan tim bila pernah dikustomisasi.
- Manajemen dapat mengatur Pengelola laporan pada editor Layanan. Perubahan nama/pengelola/nonaktif hanya berpengaruh pada pengiriman berikutnya. Laporan lama, termasuk antrean JTI lama milik Manajemen, tidak dipindahkan massal; snapshot, catatan, notifikasi, dan pemilik penanganannya dipertahankan.
- `reports.reporter_id` mengacu ke `users.id`; detail layanan memiliki PK/FK `report_id` dan FK `service_id`. Nama layanan disimpan sebagai snapshot. History mengacu ke report dan actor melalui ID serta menyimpan nama actor saat aksi. Lampiran mengacu ke report/draft serta owner; notifikasi mengacu ke report dan recipient. FK restriktif mempertahankan identitas historis; akun dinonaktifkan, bukan dihapus.
- Role adalah izin akun, bukan identitas petugas. Tidak dibuat FK ke `users.role` yang bukan unique key. Constraint kategori/pengelola hanya membolehkan TEFA pada kategori layanan, Satpam pada kehilangan/temuan, Teknisi pada fasilitas, dan Manajemen pada layanan/lainnya.
- TEFA hanya membaca/mengubah laporan ber-snapshot pengelola TEFA. Lampiran draft dan laporan role lain tidak dapat diakses walaupun UUID diketahui. Notifikasi serta hitungan unread dibatasi recipient **dan** laporan TEFA; notifikasi sisa role sebelumnya tidak bocor. Menandai dibaca juga memakai scope tersebut.
- Manajemen tetap bisa membaca laporan TEFA pada Monitoring dan agregat Statistik, tetapi tidak mengubahnya melalui antrean/endpoint operasional Manajemen. Kelola Laporan/rekap operasional Manajemen tetap ber-scope pemilik Manajemen. TEFA tidak memperoleh akses pengguna, pengaturan, atau API role lain.

### Transaksi, status, dan indeks

Aksi memakai lifecycle layanan Baru -> Diproses -> Selesai atau penolakan dari Baru. Catatan wajib untuk selesai/ditolak, maksimal 2.000 karakter. Dalam satu transaksi: actor aktif/role terkini dikunci share, laporan scoped dikunci update, status awal diperiksa, status/completedAt diperbarui, history dengan actor dari database ditulis, lalu Pelapor diberi notifikasi. Dua request tahap yang sama menghasilkan satu keberhasilan dan konflik 409, bukan dua history/notifikasi. Retry pengiriman Pelapor tetap memakai submission key/draft yang sama. Bila hasil request tidak pasti, UI mempertahankan input dan memuat ulang status; tidak mengasumsikan sukses lokal.

| Query/relasi | Indeks yang digunakan/disiapkan |
| --- | --- |
| Antrean role + status + urutan tanggal/ID | `reports_handler_status_date_idx` yang sudah ada |
| Antrean role dengan semua status/keyset | `reports_handler_date_idx` yang sudah ada |
| Filter/rekap berdasarkan service ID | `report_service_details_service_report_idx(service_id, report_id)` baru |
| Layanan aktif per pengelola | `services_handler_active_idx(handler_role, is_active, id)` baru |
| Lampiran report, history report, dan notifikasi recipient | Indeks relasi yang sudah ada; notifikasi memakai date/ID untuk cursor |

Tidak menambah indeks duplikat hanya karena role bertambah. Antrean TEFA mengambil enam baris + satu penanda next cursor, memakai tanggal/UUID sebagai tie-breaker, pencarian literal terparameter, dan batch relasi yang terbatas. List beserta total, detail beserta history/lampiran, dashboard, statistik, dan ekspor repository operasional memakai snapshot read-only repeatable-read agar hasil multi-query tidak tercampur pembaruan concurrent. Query pada satu koneksi transaksi dijalankan berurutan melalui `sequentialQueries`, bukan overlapping `client.query`. Indeks dan keyset telah diverifikasi pada fixture; ini bukan benchmark beban production. Ukuran data nyata tetap perlu dipantau sebelum menambah indeks pencarian fuzzy/trigram.

Migration 0014 memperluas enum pengelola dengan penggantian tipe transaksional agar instalasi seluruh journal pada database kosong tidak gagal karena ADD VALUE lalu langsung memakai enum baru dalam transaksi yang sama. Konversi kolom dapat mengunci/rewrite tabel reports: untuk deployment dengan data besar, siapkan backup dan maintenance window. Jangan mengedit migration yang sudah dibagikan, menghapus volume, atau memakai push-schema/force recreate sebagai solusi. Jalankan migration sebelum app versi baru; Compose development biasa melakukannya. Migration tidak membuat akun atau memindahkan laporan lama. Tidak perlu seed untuk mengaktifkan routing.

### Frontend dan verifikasi

Data simulasi/provider TEFA telah diganti sumber API/PostgreSQL. Dashboard, antrean, filter service ID/status, pagination, detail, lampiran, history, dan notifikasi persisten. Komponen tetap Shadcn/token global/`KpiCard` dan shell detail Satpam, termasuk action shelf sticky. Buat akun TEFA melalui Manajemen > Kelola Pengguna > Buat akun manual atau ubah role akun yang sah; password awal 12-128 karakter. Seed fixture TEFA development tetap opsional, bukan reset password dan tidak otomatis dijalankan.

- Domain/UI: `node --import tsx --test scripts/tefa-backend.test.tsx`, lint, typecheck, build, dan suite regression role terkait.
- PostgreSQL dengan `NODE_ENV=development`: `node --conditions=react-server --import tsx --test scripts/tefa-backend-db.test.ts scripts/tefa-auth-db.test.ts`. Fixture memakai satu transaksi dan rollback juga saat sukses; master asli hanya dibaca. Mencakup FK/constraint, routing, snapshot, batas role/lampiran, notifikasi, pagination timestamp sama, dan indeks.
- Upgrade diuji pada PostgreSQL lokal; pemasangan journal dari nol dan pengulangan idempotent diuji dengan `node --import tsx --test scripts/tefa-migration-db.test.ts` dalam environment development. Tes ini memerlukan izin CREATE DATABASE, membuat database lokal acak ber-prefix khusus lalu menghapus **hanya** database buatan run tersebut setelah pool ditutup. Database utama/volume tidak di-reset.
- Setelah rebuild app lokal/Docker, dengan environment development: `node --import tsx --test scripts/tefa-flow-http.test.ts` menguji pengiriman Pelapor, retry, TEFA, Monitoring, history, penolakan Origin, dan dua request status bersamaan. `scripts/tefa-auth-http.test.ts` menguji auth/guard. Keduanya memakai fixture UUID yang di-commit agar terlihat pool app dan dibersihkan di finally. Counter tiket dapat maju karena HTTP sudah commit; jangan mereset counter. Jalankan berurutan agar rate limit login tetap dihormati.
- HTTP tests bukan browser automation. QA visual/klik tetap manual: buat laporan baru JTI dan Administrasi, pastikan antrean berbeda, tangani lewat TEFA, lihat hasil di Pelapor/Monitoring, buka lampiran/notifikasi, lalu reload dan uji mobile/tema.
- Kebijakan field form (prodi/lokasi) masih registry eksplisit seperti bagian Pelapor di bawah. Pengelola/routing sudah metadata database stabil; mengganti pengelola tidak otomatis mendesain ulang kebutuhan field layanan custom.

## Pemakaian oleh Pelapor

Form fasilitas memilih area/lantai, kemudian lokasi dalam area tersebut, lalu checkbox fasilitas yang dipetakan. Pencarian lokasi dibatasi pada area terpilih. Area luar tidak memerlukan lantai. Mengganti lokasi menghapus pilihan fasilitas sebelumnya dengan umpan balik. `Lainnya` tetap tersedia untuk lokasi/objek belum terdaftar. Pada lokasi lainnya, seluruh jenis fasilitas aktif boleh dipilih karena lokasi belum memiliki katalog sendiri.

Katalog lokasi, fasilitas, serta layanan dibaca dari database, bukan daftar statis frontend. Program studi masih referensi tetap. Backend memvalidasi ulang katalog aktif dan pemetaan pada pengiriman, termasuk area yang dinonaktifkan. Draft lama dapat disimpan meskipun pilihan katalognya berubah; pengguna harus memperbaiki pilihan sebelum mengirim.

## Form Pelapor dan waktu laporan

Proporsi form desktop dikembalikan ke dua kolom pada breakpoint XL: form utama di kiri dan panduan di kanan, dengan rasio lama 1.45:0.55 serta batas minimum kolom panduan melalui token `--report-form-desktop-columns` di globals.css. Stepper tetap di atas kedua kolom, sedangkan panduan tampil pada seluruh langkah dan sticky pada desktop. Di bawah XL, form dan panduan bertumpuk dalam satu kolom. Perubahan proporsi ini tidak mengganti wizard, posisi relatif label/toggle, field, validasi, atau routing laporan.

Jenis layanan tetap berasal dari katalog database aktif, dengan satu dropdown berkelompok Operasional dan Layanan JTI. Metadata form terpusat di `src/features/reports/domain/service-policy.ts` menentukan kebutuhan tiap layanan, bukan menyamakan field karena pengelolanya sama:

| Layanan | Unit/Prodi | Lokasi/kanal | Informasi inti |
| --- | --- | --- | --- |
| Administrasi | Wajib | Tidak ditampilkan | Kendala proses, dokumen, informasi, atau pelayanan administrasi secara umum |
| Keamanan | Tidak ditampilkan | Wajib | Lokasi dan uraian kejadian |
| Kebersihan | Tidak ditampilkan | Wajib | Area dan kondisi yang perlu dibersihkan |
| JTI E-Learning, JTI Evaluasi Pembelajaran, JTI Ruang Baca, JTI Surat | Tidak ditampilkan | Tidak ditampilkan | Fitur/kendala dijelaskan dalam Deskripsi |

Dropdown Unit/Prodi hanya muncul untuk layanan yang memerlukannya; layout tanpa field kedua memakai lebar penuh tanpa kolom kosong. Kebersihan tidak meminta objek eksplisit: kondisi area cukup dijelaskan. Kategori fasilitas pada UI Pelapor dinamai "Kerusakan Fasilitas" untuk membedakan objek rusak/tidak berfungsi dari area kotor; nilai kategori internal tetap `fasilitas` dan routing tetap Teknisi.

Keamanan/Kebersihan memakai label "Lokasi yang perlu ditangani" beserta contoh area yang konkret. Administrasi tetap bersifat umum sampai cakupannya dikonfirmasi; Unit/Prodi menjadi konteks layanan tanpa meminta lokasi loket lagi. Field lokasi Administrasi dan field konteks JTI terpisah dihapus; helper Deskripsi JTI meminta fitur/halaman dan kendalanya. Form, draft, preview, dan validasi server mengikuti kebijakan bersama. Lokasi tetap wajib untuk kehilangan/temuan, fasilitas, dan laporan lainnya. Field kosong tidak ditampilkan sebagai baris kosong di detail Pelapor/Management. Bila laporan Administrasi/JTI lama sudah memiliki lokasi/konteks, snapshot tersebut tetap terbaca.

Metadata ini sementara dipetakan ke nama katalog yang eksplisit, bukan pemeriksaan awalan JTI. Layanan custom atau nama yang diubah di luar pemetaan tetap meminta Unit/Prodi seperti sebelumnya; perubahan nama/kebijakan perlu diselaraskan di registry ini sampai tersedia metadata layanan yang dapat dikelola. Registry tidak menambahkan pilihan layanan yang tidak aktif/terdaftar di database.

Regression form/domain/preview: `node --import tsx --test scripts/report-service-policy.test.tsx scripts/report-domain.test.ts scripts/report-submission-preview.test.ts`. Integration PostgreSQL: dengan `NODE_ENV=development` yang diatur sementara sesuai workflow Dev.md, jalankan `node --conditions=react-server --import tsx --test scripts/report-service-policy-db.test.ts`. Tes SQL dibatasi ke host lokal, memerlukan layanan JTI terpetakan, Administrasi, Keamanan, dan Kebersihan aktif, hanya membaca master katalog, dan me-rollback actor/laporan/draft fixture bahkan setelah assertion sukses. QA klik, keyboard dropdown berkelompok, mobile, dan tema tetap manual oleh pengguna.

Prodi tersembunyi dibersihkan pada layanan JTI, Keamanan, dan Kebersihan. Lokasi tersembunyi Administrasi/JTI tidak ikut payload/preview baru; draft lama yang masih memiliki konteks tersebut menampilkannya di Deskripsi saat dibuka agar pengguna dapat meninjaunya, bukan menghilangkannya diam-diam. Draft disesuaikan saat disimpan berikutnya; tidak ada perubahan massal database. Laporan yang sudah terkirim tetap mempertahankan snapshot lama. Key `location`/`program` tetap string; nilai tidak diperlukan disimpan sebagai string kosong, bukan lokasi/prodi tebakan. Perubahan field ini sendiri tidak memerlukan migration/seed; routing layanan kini memakai snapshot pengelola dari katalog sesuai backend TEFA di atas.

Semua kategori memakai tanggal/waktu kejadian otomatis saat pengiriman secara default. Toggle "Gunakan tanggal & waktu tertentu" membuka input tanggal dan waktu dalam WIB untuk kejadian pada waktu lain. Mode otomatis disimpan pada JSON draft tanpa membekukan waktunya; ketika dikirim, backend memakai satu timestamp server untuk waktu kejadian dan `submittedAt`. Draft lama dengan waktu yang sudah diisi tetap memakai mode khusus. Preview mode otomatis menjelaskan bahwa waktu baru dicatat saat Konfirmasi kirim.

Laporan Kehilangan/Temuan memakai Deskripsi untuk ciri barang dan kronologi; Ciri-ciri tidak lagi menjadi field wajib terpisah. Isi ciri dari draft lama digabung ke Deskripsi saat dibuka. Laporan yang telah terkirim tetap mempertahankan ciri lama. Kode tiket tetap menjadi identitas internal API/relasi/tautan, sedangkan UI memakai judul dan waktu laporan dikirim. Riwayat Satpam menampilkan waktu pengiriman laporan Kehilangan dan Temuan masing-masing. Revisi ini tidak mengubah schema PostgreSQL sehingga tidak memerlukan migration atau seed baru.

## Inventaris Pos Satpam

Menu Satpam:
- `/satpam/inventaris`: pencatatan dan pengelolaan barang temuan langsung di Pos Satpam. Satpam dapat mendaftarkan barang yang diserahkan langsung oleh civitas kampus (nama barang wajib; nama penemu, deskripsi, dan foto via file upload atau URL tautan opsional). Tersedia filter status (semua, tersimpan, diserahkan), kolom pencarian, kartu inventaris dengan thumbnail foto/badge, modal registrasi, serta modal detail dan alur penyerahan barang kembali ke pemilik sah.
- Endpoint API: `GET/POST /api/satpam/inventory`, `GET /api/satpam/inventory/[id]/photo`, `POST /api/satpam/inventory/[id]/handover`.

## Data dan migrasi

Migrasi `0008` menambah `location_areas`, relasi many-to-many `location_facility_objects`, revision master, dan `operational_audit`. `0009` menambah index daftar/peran/status akun. `0010` menambah tabel `satpam_inventory` untuk pencatatan barang inventaris fisik di Pos Satpam. ID master tetap stabil. Tidak ada penghapusan master atau akun dari UI.


Lokasi lama dipetakan ke lantai berdasarkan nama/group yang eksplisit. Lobi/koridor tidak diberi lantai tebakan. Pemetaan awal untuk katalog bawaan merupakan template: ruang belajar/lab memakai perangkat/furnitur, toilet memakai sanitasi/lampu, area lain memakai fasilitas dasar. **Management perlu memeriksa template ini sesuai kondisi lapangan.** Lokasi custom/baru mulai tanpa pemetaan; tetap bisa dilaporkan melalui Lainnya. Ini bukan inventaris unit, jumlah aset, atau bukti fasilitas tersedia di lapangan.

Nama lokasi/objek/layanan/petugas dalam laporan dan penyerahan lama tetap snapshot. Menonaktifkan master hanya membatasi penggunaan berikutnya; laporan aktif yang sudah masuk tetap dapat ditangani. Mengaktifkan area kembali memulihkan lokasi aktif di dalamnya. Menonaktifkan objek tidak menghapus pemetaan ruangnya.

Kategori fasilitas adalah daftar tetap bersama UI dan backend: Perangkat, Furnitur, Sanitasi, Kelistrikan, Bangunan, Jaringan & Komunikasi, Keamanan, Kebersihan, dan Umum. Tidak ada CRUD kategori atau input kategori bebas. Label kategori bawaan tetap kompatibel tanpa migrasi database. Jika kategori custom lama di luar daftar ditemukan, pengguna harus memilih kategori yang valid ketika mengedit; nilainya tidak diganti diam-diam.

Checkbox "Tersedia untuk dipilih" mengatur pilihan pada penggunaan baru, bukan status penanganan laporan atau akun login. Petugas aktif dapat dipilih saat penyerahan; area/lokasi/fasilitas/layanan aktif dipakai form Pelapor. Lokasi tetap memerlukan area aktif dan fasilitas tetap mengikuti pemetaan lokasi.

```powershell
npm run db:migrate
npm run test:operations
# Hanya database development lokal; proses tes tidak menggunakan browser.
$env:NODE_ENV = 'development'
npm run test:operations-db
Remove-Item Env:NODE_ENV
npm run lint
npm run typecheck
npm run build
```

Untuk Docker, image migration dan aplikasi perlu dibangun ulang setelah perubahan ini. `docker compose -f compose.yaml -f compose.dev.yaml up --build --watch` menjalankan migration sebelum aplikasi. Jangan menghapus volume database dan jangan menjalankan seed untuk memperbarui akun yang sudah ada.

## Keamanan akun dan konfigurasi

Semua halaman/API memakai session dan role database aktif; mutasi memeriksa origin serta memeriksa ulang actor di transaksi. UI bukan batas otorisasi. Management tidak dapat mengelola/menetapkan role admin, menonaktifkan/mengganti peran diri sendiri, atau menghilangkan Manajemen aktif terakhir.

Akun baru memakai email unik dan password awal 12-128 karakter, di-hash oleh `better-auth/crypto` dengan format yang sama dengan login. Email/password akun lama tidak diubah oleh edit profil. Sesi pengguna dicabut bila peran/status berubah. Email belum dianggap terverifikasi; SSO/undangan email/forced-password-change belum tersedia. Password harus disampaikan secara pribadi, bukan dicatat di laporan atau audit.

Mutasi menggunakan revision master/updatedAt akun untuk mencegah edit tertimpa, lock transaksi untuk pemetaan dan proteksi Manajemen terakhir, serta audit actor server sebelum/sesudah tanpa password/token. Names, email, dan identitas unik diperiksa database. Pencarian pengguna memakai parameter terikat dan escaped literal `ILIKE`; belum menggunakan `pg_trgm`. Katalog kampus dimuat utuh agar pemetaan lintas section konsisten; daftar UI dibatasi pagination. Untuk katalog berskala besar, endpoint master dapat dipisah ke pagination server.

Tes database membuat fixture sementara dengan ID khusus lalu membersihkan hanya fixture tersebut. Cakupan: actor/role, objek di luar pemetaan, area nonaktif, snapshot lama, draft usang, konflik edit bersamaan, verifikasi hash login, pencabutan sesi, proteksi akun, serta audit bebas kredensial. Tampilan/interaksi diuji manual oleh pengguna, tanpa Preview Mode atau browser automation.
