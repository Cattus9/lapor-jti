# Pengaturan Operasional dan Kelola Pengguna

Menu Manajemen:

- `/manajemen/pengaturan`: halaman panjang dengan navigasi per bagian, pencarian, filter, dan pagination enam baris per bagian. Kelola Petugas Satpam, Area/Lantai, Ruangan/Lokasi, Fasilitas, dan Layanan. Dialog lokasi menyimpan pemetaan fasilitas bersama lokasi dalam satu transaksi.
- `/manajemen/pengguna`: pencarian dan pagination server (12 akun), tambah akun, ubah identitas/peran, aktif/nonaktif. Tidak menyediakan akses admin, hapus akun, ganti email login, reset password, atau koreksi tiket teknis.

## TEFA: akses nyata, frontend pratinjau

Tahap pertama sesuai cakupan saat ini: role database `tefa`, login/logout Better Auth yang sama dengan role lain, dan frontend untuk empat layanan JTI. Tidak ada engine auth, endpoint login, secret, atau port baru. Default pendaftaran tetap Pelapor dan pendaftaran publik tetap ditutup; pengguna tidak boleh memilih role TEFA melalui form login atau API update profil mandiri.

- Halaman `/tefa/dashboard`, `/tefa/laporan`, `/tefa/riwayat`, dan `/tefa/profil` memakai guard server `requireRole("tefa")`, termasuk layout TEFA. Akun nonaktif diarahkan ke login; role lain tidak diberi akses TEFA.
- Manajemen dapat membuat akun manual atau mengubah role akun yang sudah terdaftar menjadi TEFA melalui Kelola Pengguna. Role/status berubah tetap mencabut session, mencatat audit, dan mempertahankan pengaman Manajemen aktif terakhir. TEFA tidak mendapat akses Kelola Pengguna, Pengaturan, Monitoring, maupun API laporan role lain.
- Migration `0013_add_tefa_access.sql` hanya menambah nilai `tefa` ke enum `user_role`, tanpa mengganti role akun lama, memindahkan laporan, atau mengubah enum `report_handler`. Jalankan `npm run db:migrate` untuk host lokal, atau rebuild Compose development biasa agar migrator menjalankannya sebelum app. Tidak perlu menghapus volume atau memakai `--force-recreate`.
- Tidak ada akun/password otomatis dari migration. Untuk mencoba, masuk sebagai Manajemen, pilih Kelola Pengguna > Buat akun manual > Peran TEFA, gunakan password awal 12-128 karakter, lalu login dengan akun itu. Seed development opsional kini juga menyediakan fixture `tefa@gmail.com` dengan `DEMO_USER_PASSWORD`; jangan menjalankan seed untuk mereset kredensial lama atau di production. Penambahan fixture ini belum berarti seed sudah dijalankan.
- Frontend memakai komponen Shadcn, token global, `KpiCard` bersama, dan shell `OperationalReportDialog` sesuai susunan Satpam: progres, detail, lampiran, riwayat, lalu aksi sticky di bawah. Pencarian, filter, pagination enam baris, detail, dan perubahan status merupakan simulasi frontend.
- Data contoh hanya berada di `src/features/tefa/mock`, kontrak simulasi di `src/features/tefa/domain/tefa-preview.ts`, dan state memori provider TEFA. Angka dashboard bukan agregat PostgreSQL. Banner Data contoh selalu tampil pada workspace. Navigasi antarmenu mempertahankan simulasi, sedangkan reload/Reset contoh mengembalikannya. Catatan/status tidak dikirim ke server, tidak mengunggah lampiran, dan tidak memberi notifikasi pelapor.
- Profil memakai identitas akun database asli. Tidak ditambahkan halaman Notifikasi palsu. Laporan JTI Pelapor tetap masuk Manajemen; backend antrean, routing, status, lampiran, dan notifikasi TEFA dikerjakan pada tahap berikutnya.

Verifikasi: `node --import tsx --test scripts/tefa-preview.test.tsx` untuk role/guard, filter, siklus simulasi, dan markup. Dengan `NODE_ENV=development`, jalankan `node --conditions=react-server --import tsx --test scripts/tefa-auth-db.test.ts` untuk provisioning melalui repository Operasional, login/logout Better Auth, penolakan eskalasi role, akun nonaktif, dan pencabutan session. Tes PostgreSQL hanya memakai database loopback dan satu transaksi yang di-rollback walaupun sukses. `createAuth` menerima koneksi transaksi untuk tes, sedangkan runtime tetap memakai singleton lazy yang sama.

Setelah app lokal/Docker dibangun ulang, dengan `NODE_ENV=development` jalankan `node --import tsx --test scripts/tefa-auth-http.test.ts` untuk menguji endpoint aplikasi sebenarnya: redirect login, empat halaman TEFA, penolakan halaman/API lintas role, origin logout, dan status/role database terbaru walaupun cookie belum berubah. Tes ini bukan browser automation. Fixture HTTP harus di-commit agar terlihat koneksi app, lalu akun/credential/session UUID run tersebut dibersihkan dalam `finally`; guard membatasi app dan database ke loopback. Jangan jalankan paralel dengan migrasi atau tes lain yang mengubah akun fixture sama.

QA visual/klik manual: buat/login akun TEFA, tinjau empat menu, filter layanan/status, ubah contoh Baru ke Diproses lalu Selesai dengan catatan, periksa Riwayat, reload/reset, serta uji mobile dan tema. Seed belum dijalankan otomatis; akun tetap perlu disiapkan melalui Kelola Pengguna atau seed development opsional.

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

Prodi tersembunyi dibersihkan pada layanan JTI, Keamanan, dan Kebersihan. Lokasi tersembunyi Administrasi/JTI tidak ikut payload/preview baru; draft lama yang masih memiliki konteks tersebut menampilkannya di Deskripsi saat dibuka agar pengguna dapat meninjaunya, bukan menghilangkannya diam-diam. Draft disesuaikan saat disimpan berikutnya; tidak ada perubahan massal database. Laporan yang sudah terkirim tetap mempertahankan snapshot lama. Key `location`/`program` tetap string; nilai tidak diperlukan disimpan sebagai string kosong, bukan lokasi/prodi tebakan. Schema sudah kompatibel sehingga tidak perlu migration/seed. Routing seluruh laporan layanan **masih Manajemen**; role dan routing TEFA belum diimplementasikan.

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
