# Pengaturan Operasional dan Kelola Pengguna

Menu Manajemen:

- `/manajemen/pengaturan`: halaman panjang dengan navigasi per bagian, pencarian, filter, dan pagination enam baris per bagian. Kelola Petugas Satpam, Area/Lantai, Ruangan/Lokasi, Fasilitas, dan Layanan. Dialog lokasi menyimpan pemetaan fasilitas bersama lokasi dalam satu transaksi.
- `/manajemen/pengguna`: pencarian dan pagination server (12 akun), tambah akun, ubah identitas/peran, aktif/nonaktif. Tidak menyediakan akses admin, hapus akun, ganti email login, reset password, atau koreksi tiket teknis.

## Pelapor: form satu halaman dan draft per kategori (25 Oktober 2026)

Pemilih kategori selalu terlihat. Memilih kategori langsung menampilkan field tanpa langkah kategori/informasi/review terpisah. Judul dalam "Informasi laporan" yang mengulang wrapper dihapus; lampiran upload/tautan tetap tersedia. Periksa laporan membuka Dialog Shadcn dengan snapshot, fokus awal Kembali edit, fokus kembali ke pemicu, serta animasi in/out primitive. Hanya Konfirmasi kirim yang mengirim laporan; snapshot/waktu otomatis WIB, error dan idempotensi submission dipertahankan.

Saat kategori berubah, snapshot kategori lama disimpan melalui POST draft yang sudah ada, sementara kategori baru langsung aktif. Snapshot kosong yang belum pernah tersimpan tidak menghasilkan record. Setiap kategori mempunyai ID, revision, payload, file baru, dan lampiran tersimpan sendiri. Respons save kategori lama tidak mengganti form aktif lain. Satu request per kategori mencegah penyimpanan ganda saat klik cepat; kategori yang sedang disimpan tetap dapat ditinggalkan, tetapi fieldnya dinonaktifkan bila dibuka kembali sebelum respons selesai. Draft yang tidak berubah tidak ditulis ulang; mengosongkan seluruh isian dan lampiran menghapus record draft tersebut dari server setelah pemeriksaan owner/revision, sekaligus membersihkan lampiran privat yang dihapus. Respons clearedDraftId mengembalikan kategori ke kondisi kosong tanpa badge Draft atau tooltip sukses penyimpanan; draft kategori lain tetap utuh. Deteksi isi yang sama digunakan frontend dan backend, dengan mengabaikan kategori, waktu otomatis, serta field yang tidak relevan.

Kartu kategori menampilkan Menyimpan, Draft, atau Belum tersimpan. Setelah acknowledgment server, tooltip otomatis "Tersimpan sebagai draft" tampil sekitar tiga detik di atas kartu asal, tanpa memindahkan fokus atau menggeser layout; badge Draft tetap ada. Pengumuman status juga tersedia bagi screen reader. Kegagalan mempertahankan raw isian, objek file, ID dan revision; tombol Coba simpan lagi tersedia. Konflik revision tidak menimpa data dari tab/perangkat lain. Selama server belum mengonfirmasi, jangan menganggap draft aman setelah refresh/menutup halaman. Tidak ada autosave saat setiap penekanan tombol; penyimpanan dipicu pergantian kategori atau Simpan draft.

Server page memuat maksimal satu draft unsubmitted terbaru per kategori (maksimal empat) milik actor saat ini, dengan batch lampiran privat; draft schema tidak didukung dikecualikan. Draft yang dibuka eksplisit melalui URL tetap diprioritaskan. URL aktif diperbarui memakai history API setelah save/resume tanpa router refresh yang membuang state kategori lain. Setelah reload, pilih kartu berbadge Draft untuk melanjutkan. Field JSON opsional `facilityAreaId` menjaga pilihan Area/Lantai pada draft fasilitas parsial; submit tetap memvalidasi lokasi/pemetaan katalog di server. Tidak ada localStorage atau draft lintas akun.

Tidak membutuhkan migration/seed baru: data memakai tabel draft/lampiran dan kolom JSON yang sudah ada. Lookup latest per kategori memakai filter owner/unsubmitted, DISTINCT ON kategori, sort updatedAt/id dan limit empat; batch lampiran memakai indeks draft/owner yang tersedia. Indeks owner+updatedAt parsial tetap tersedia untuk cakupan draft pengguna; tidak ditambahkan index baru. Skema, lifecycle laporan dan role tidak berubah.

Verifikasi: `node --import tsx --test scripts/report-category-drafts.test.ts scripts/report-submission-preview.test.ts`. PostgreSQL lokal dengan NODE_ENV=development: `node --conditions=react-server --import tsx --test scripts/report-category-drafts-db.test.ts scripts/report-service-policy-db.test.ts` memakai fixture rollback untuk isian parsial, lampiran, owner, latest per kategori, submitted/schema exclusion dan revision conflict. Jalankan lint/typecheck/build dan HTTP report smoke sesuai guard lokal. QA manual: switch kosong, isi sebagian, lampiran upload/tautan, klik cepat bolak-balik, jaringan lambat/gagal/retry, reload/resume, preview/edit/kirim, serta mobile/keyboard/reduced motion.

## Riwayat Pelapor: kartu ringkas berbasis deskripsi (25 Oktober 2026)

Daftar Riwayat Pelapor memakai ikon kategori, judul utama, satu `StatusBadge`, kategori/tanggal pengiriman, cuplikan deskripsi maksimal dua baris, serta satu affordance "Lihat detail". Stepper daftar dihapus sesuai revisi UX; lifecycle backend tidak dipangkas. Tanggal diperbarui hanya ditampilkan jika berbeda pada presisi menit tampilan server. Judul membungkus; status/detail turun pada layar kecil agar tidak menekan judul.

`Card` dan badge tetap memakai primitive Shadcn. Lapisan kartu dalam memakai token semantik `report-surface`: `#FBFBFC` pada tema terang dan permukaan netral gelap pada `.dark`, tanpa mengubah warna `card` seluruh aplikasi. Ikon berada di permukaan `bg-card`. Hover mengangkat kartu 0,5 unit skala Tailwind (2px), menambahkan `shadow-xs` dan border biru tipis; gerakan dibatasi `motion-safe` dan transisi dimatikan pada reduced motion. Tidak ada glow, watermark latar, atau detail tersembunyi saat hover. Ring fokus keyboard dipertahankan. Modal detail tetap memakai stepper Shadcn lengkap dengan tahap lampau soft blue dan tahap aktif solid.

Hanya kartu berstatus `selesai` menampilkan aset `public/assets/DoneStatusIc.png` di sisi kanan baris deskripsi, terpisah dari judul/status dan affordance detail. Slot tetap 48px pada mobile dan 64px mulai breakpoint sm, dengan rasio gambar asli, sehingga tidak menimpa teks. Next Image menyesuaikan ukuran thumbnail dan memakai lazy loading default. Gambar dekoratif memakai alt kosong/aria-hidden karena badge sudah menyampaikan status. Kategori lain, termasuk Ditolak/Diserahkan, tidak menampilkan tanda selesai. Warna kartu serta hover tetap sama.

Proyeksi daftar Drizzle menambah `left(description, 240)` pada query yang sudah dibatasi owner dan pagination, diteruskan sebagai `descriptionPreview` pada daftar, selected ticket, serta recent dashboard. Tidak ada join, request detail per kartu, atau fetch foto baru. Teks di-escape oleh React dan tidak dirender sebagai HTML. Isi deskripsi lengkap tetap di database/modal; schema, indeks, lifecycle dan pagination tidak berubah, sehingga tidak perlu migration/seed.

Verifikasi: `node --import tsx --test scripts/pelapor-history-ui.test.tsx`, lint, typecheck, dan build. Untuk query, jalankan `node --conditions=react-server --import tsx --test scripts/report-preview-db.test.ts` dengan `NODE_ENV=development`: fixture lokal di dalam transaksi rollback menguji batas 240 karakter Unicode, semua jalur proyeksi, isolasi owner, serta deskripsi lengkap tetap utuh. QA visual/interaksi manual: judul/deskripsi panjang, semua kategori/status, mouse/Enter/Space, fokus kembali dari dialog, tema terang/gelap, reduced motion, serta layar kecil. Temuan audit awal tetap dicatat pada Frontend-audit-06fd77d.md.

## Satpam: Dashboard dan Inventaris (25 Oktober 2026)

Dashboard menampilkan **Prioritas penanganan**: maksimal lima laporan aktif Satpam kategori kehilangan/temuan, diurutkan submittedAt paling lama lalu UUID sebagai tie-breaker. Baru, Diproses, Barang teridentifikasi dan Diserahkan tetap masuk; Selesai/Ditolak dan laporan role lain tidak masuk. Ini prioritas berdasarkan umur laporan, bukan penilaian risiko. Query sebelumnya memakai kandidat pencocokan (hanya Baru/Diproses), urutan terbaru, serta mengambil halaman 20 laporan sebelum memotong menjadi lima, sehingga antrean bisa kosong ketika pekerjaan tersisa di tahap penyerahan.

Repository dashboard kini melakukan empat SELECT dalam snapshot read-only repeatable-read: agregasi KPI laporan, jumlah pasangan siap diserahkan yang belum memiliki handover/completedAt, proyeksi tujuh field antrean dengan LIMIT 5 di SQL, dan jumlah barang Inventaris berstatus tersimpan. Tidak memanggil workspace/list, tidak mengambil daftar petugas, foto, lampiran, deskripsi, total list atau halaman kandidat pencocokan. Jumlah siap diserahkan adalah jumlah pasangan, bukan dua tiket per pasangan; scope kategori/handler diperiksa pada kedua parent. Indeks handler/date, handler/status/date, pair pending date dan unique handover match yang ada tetap tersedia; query Dashboard tidak memerlukan index baru. Relasi penyerahan ditambahkan melalui migration 0016/0017 sebagaimana dijelaskan pada bagian penyerahan Inventaris di bawah. Laporan aktif terlama tampil di UI dengan penjelasan urutan dan empty state eksplisit.

Dashboard dan panel Inventaris memakai `SectionCard` (Layered Section Card) dengan Section Header berupa ikon + label kecil di lapisan luar, lalu permukaan putih/tema card di dalam. Nama serta aturan komposisinya ada di AGENTS.md dan salinannya di Dev.md. Inventaris menempatkan filter berlabel, ringkasan hasil, loading/error, daftar dan pagination di panel yang sama, seperti Riwayat. Select menampilkan label manusia (Semua status), bukan nilai internal `semua`. Tinggi kontrol mengikuti primitive global; kartu barang tetap berupa grid foto, memakai Card/Badge Shadcn, teks skala tema, hover ringan, reduced motion dan fokus keyboard.

Empty state memakai `CollectionEmptyState`: border dashed, bg-empty-surface, ikon muted, judul singkat dan deskripsi. Inventaris membedakan belum ada barang dengan hasil filter kosong. Loading memakai Skeleton Shadcn; kegagalan menampilkan error/retry, tidak mengklaim data kosong. Data sebelumnya dapat tetap terlihat saat refresh, tetapi kartu/aksi pagination dinonaktifkan hingga status data valid kembali. Form tambah, detail/penyerahan dan pagination SQL tetap dipertahankan.

Verifikasi UI statis: `node --import tsx --test scripts/satpam-collection-ui.test.tsx scripts/satpam-dashboard-navigation.test.ts`. PostgreSQL lokal dengan NODE_ENV=development: `node --conditions=react-server --import tsx --test scripts/satpam-dashboard-priority-db.test.ts scripts/inventory-pagination-db.test.ts`; fixture rollback menguji batas lima, urutan stabil, seluruh tahap aktif termasuk handover, pengecualian role/terminal, hitungan pasangan, proyeksi ringan dan pagination inventaris. QA visual/klik tetap manual sesuai AGENTS.md: Dashboard kosong/berisi, inventaris kosong/filter/data, loading/error/retry, tema terang/gelap, mobile, keyboard dan dialog.

## Satpam: penerimaan langsung ke pencocokan (25 Oktober 2026)

Jalur pasangan kehilangan/temuan kini **Baru → Diproses → Barang teridentifikasi → Diserahkan → Selesai**, atau Baru → Ditolak dengan alasan. Setelah Satpam menerima laporan, satu aksi menyimpan `baru → diproses`, satu catatan actor dari session, dan satu notifikasi Pelapor dalam transaksi yang sama. Tidak ada aksi/status Verifikasi baru atau tombol Mulai penanganan tambahan. Pencocokan tetap mensyaratkan kedua laporan Diproses; penyerahan tetap memerlukan pasangan, petugas aktif, penerima, serta lokasi. Lock berurutan, konflik aksi bersamaan, snapshot petugas, dan penutupan dua laporan dipertahankan.

Migration **0015_simplify_satpam_acceptance** memindahkan laporan aktif Satpam `diverifikasi` ke `diproses`, lalu membatasi constraint agar status `diverifikasi` hanya berlaku untuk Fasilitas/Teknisi. Timestamp asli, riwayat status dan notifikasi lama tidak ditulis ulang, dan tidak dibuat actor/notifikasi fiktif untuk backfill. Karena itu entri Diverifikasi yang sungguh pernah terjadi masih dapat dibaca di riwayat historis. Enum global tetap menyimpan nilainya untuk Teknisi serta histori. Tidak ada perubahan index: query tetap memakai index handler/status/tanggal dan owner/tanggal yang tersedia. Seed tidak diperlukan.

UI Satpam dan detail Pelapor mengambil urutan dari `lifecycleByCategory`; Satpam memakai primitive Stepper Shadcn bersama. Filter/tombol/help dashboard tidak lagi menawarkan Verifikasi. Bookmark filter Satpam `status=diverifikasi` diarahkan ke Diproses, sedangkan URL filter lama Pelapor tetap masuk kelompok Belum selesai. Perubahan ini tidak memangkas lifecycle Teknisi, Manajemen, atau TEFA.

Deployment tim: pull kode, jalankan migration sebelum menjalankan versi app baru. Compose menjalankan service migrate sebelum app; gunakan `docker compose -f compose.yaml -f compose.dev.yaml up --build -d`. Untuk pengembangan host, `npm run db:migrate` lalu `npm run db:check`, kemudian jalankan ulang app dengan kode terkini. Jangan reset volume atau menjalankan ulang seed untuk perubahan status ini.

Verifikasi: `node --import tsx --test scripts/satpam-domain.test.ts scripts/satpam-detail-architecture.test.ts`; pada PostgreSQL lokal dengan `NODE_ENV=development`, jalankan `node --conditions=react-server --import tsx --test scripts/satpam-acceptance-db.test.ts`. Tes migration memakai temporary table yang hanya terlihat koneksi tes dan seluruhnya rollback; ia menguji upgrade, timestamp/histori tetap utuh, constraint menolak Verifikasi Satpam baru, dan Teknisi tidak berubah. Tes repository memakai fixture rollback untuk penerimaan sekali, actor, notifikasi dan visibilitas Pelapor. `npm run test:satpam-smoke` di container development menguji HTTP, penerimaan serentak satu pemenang, pencocokan bersilang, penyerahan, penutupan, role/origin serta cleanup fixture. QA modal/stepper/keyboard dan mobile tetap manual.

## TEFA: backend operasional dan akses antar-role

### Performa daftar dan foto privat (24 Oktober 2026)

- TEFA hanya meminta `/api/tefa/dashboard` pada Ringkasan. Kelola Laporan/Riwayat memakai katalog layanan dari respons daftar yang sama; metadata dipertahankan selama memuat halaman berikutnya, tetapi dibersihkan saat filter/scope berubah. Detail modal dipisah menjadi chunk yang dimuat ketika diperlukan.
- Inventaris Satpam dan pemilih kandidat pencocokan memakai pagination keyset 20 barang. SQL mengambil 21 baris sebagai penanda halaman berikutnya, dengan tie-breaker `created_at, id`. Total memakai filter yang sama tanpa cursor, dalam snapshot read-only repeatable-read. Gunakan indeks `satpam_inventory_created_idx` dan `satpam_inventory_status_created_idx` yang sudah ada; tidak diperlukan migration/seed baru. Search inventaris dibatasi 100 karakter, diparameterisasi, dan karakter `%`/`_` diperlakukan literal. Filter pencocokan ikut mencari di server agar barang di luar halaman awal dapat ditemukan.
- `preview=1` pada foto inventaris, foto kehilangan, dan lampiran gambar Satpam menghasilkan WebP maksimal 640×640, tanpa upscale/metadata. Unduhan tanpa preview tetap byte asli. Foto eksternal lama tidak di-fetch/proxy server. `unoptimized` pada komponen privat tetap disengaja agar cookie/guard tidak dilewati optimizer gambar publik.
- Session/role/scope record diperiksa sebelum akses cache thumbnail. Respons memakai `private, no-store` agar browser tidak menyimpan foto melewati perubahan akses; cache server hanya memory proses, maksimal 64 entri/8 MiB/60 detik, menggabungkan request sejenis, dengan dua decoder aktif dan maksimal 32 pekerjaan pending. Decoder dibatasi input 5 MiB/24 megapiksel, JPEG/PNG/WebP, dan waktu proses 5 detik. Foto yang tidak bisa dipratinjau mengembalikan 422; asli tetap dapat diunduh. Cache tidak dibagikan lintas proses dan tidak menjadi sumber otorisasi.
- Sharp dipasang sebagai dependency runtime eksplisit pada versi yang sebelumnya sudah dipakai Next.js. Rebuild image diperlukan setelah pull perubahan dependency; tidak perlu force-recreate atau menghapus volume. Konteks build mengecualikan `output/` dan lampiran chat lokal.

Verifikasi: `node --import tsx --test scripts/performance-regression.test.ts`; dengan `NODE_ENV=development`, `node --conditions=react-server --import tsx --test scripts/inventory-pagination-db.test.ts` (fixture rollback), dan `node --import tsx --test scripts/performance-http.test.ts` pada app lokal yang sudah dibangun. Tes HTTP membuat akun/inventaris UUID sementara dan membersihkannya di finally; tidak mengubah kredensial demo. QA visual/klik tetap manual.

Pengukuran backend production lokal pada run ini: halaman TEFA pertama 273 ms, halaman hangat 27–34 ms; API hangat 11–29 ms. Ini bukan pengukuran LCP/INP atau load test, dan bukan janji waktu pada laptop lain. Dibanding log development sebelumnya, `/tefa/dashboard` pertama 6 detik termasuk bagian Next.js 5,5 detik. `docker:dev` tetap mengkompilasi route saat diperlukan; gunakan build production + HTTPS yang benar untuk menilai performa demo/deployment.

Probe production dilakukan pada container sementara loopback port 3002 tanpa mengganti app development. Origin HTTPS tetap dikonfigurasi; pengujian HTTP internal mensimulasikan backend di belakang reverse proxy melalui `PERF_TEST_BASE_URL` dan `PERF_TEST_ORIGIN`, bukan menonaktifkan guard HTTPS. Untuk smoke thumbnail pada container uji khusus, `PERF_TEST_CONTAINER=aspirasijti-perf-YYYYMMDD` membatasi fixture file pada container dengan nama tersebut dan root `/app/storage/reports`; file UUID buatan tes dihapus di finally. Container uji dihentikan setelah tes; ini bukan URL demo untuk browser. Jangan mengubah aturan auth production menjadi HTTP sebagai jalan pintas.

### Akun demo development

Setelah migration berhasil, seed lengkap `db:seed` menyertakan `tefa@gmail.com` dengan role TEFA aktif. Password awal diambil dari `DEMO_USER_PASSWORD` pada environment lokal; jangan mencatat nilainya dalam Git. Untuk database development lama yang hanya belum memiliki akun TEFA, jalankan:

```powershell
docker compose -f compose.yaml -f compose.dev.yaml run --rm --no-deps migrate npm run db:seed -- --role=tefa
```

Perintah memakai PostgreSQL Docker yang sama, tidak memerlukan rebuild app, tidak menambah akun role lain/petugas, dan tidak mereset password yang sudah ada. Jangan menjalankannya pada production. Migration/build saja tidak membuat akun. Bila email tersebut sudah dimiliki akun yang tidak cocok dengan fixture, seed berhenti; kelola akun melalui Manajemen, jangan menimpa identitasnya.

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


## Satpam: penyerahan Inventaris privat dan riwayat bersama (25 Oktober 2026)

Inventaris mencatat barang yang sudah diterima secara fisik oleh Satpam. Barang tidak dipublikasikan. Temuan yang baru dilaporkan melalui web tidak otomatis dianggap stok fisik. Gunakan Terima ke Inventaris dari detail temuan saat barang benar-benar diserahkan ke pos; relasi unik mencegah laporan tersebut dicatat sebagai barang kedua.

Penegasan label UI (26 Oktober 2026): **Proses laporan** adalah aksi utama Baru → Diproses untuk tindak lanjut informasi. **Catat barang di pos** adalah aksi biru lembut untuk barang yang sudah diserahkan secara fisik; aksi ini dapat langsung mencatat Inventaris dan memperbarui laporan sumber tanpa terlebih dahulu menekan Proses laporan. Keduanya bukan dua langkah wajib berurutan. Setelah temuan tertaut ke Inventaris, modal mengarahkan ke Buka Inventaris, bukan menawarkan pencocokan laporan ulang.

### Penyerahan dan relasi

- Pemilik tanpa akun/laporan: buka barang, pilih Serahkan barang, isi penerima, petugas aktif dan hasil pemeriksaan kepemilikan. Laporan kehilangan opsional.
- Bila kehilangan dipilih di pencocokan atau form penyerahan, penyerahan menyimpan FK laporan tersebut. Barang dan laporan terkait (termasuk temuan asal bila ada) selesai bersama dengan history dan notifikasi in-app dalam satu transaksi.
- Jalur pasangan dua laporan yang sudah ada tetap kompatibel. Jalur Inventaris tidak membuat pasangan fiktif dan tidak mengubah aturan transisi role lain. Penyelesaian langsung hanya tersedia setelah pengembalian barang fisik yang terotorisasi dan terdokumentasi, bukan endpoint status bebas.
- Server mengunci laporan dalam urutan UUID yang sama, memeriksa scope/status/pasangan yang sudah ada, mengunci barang, dan memeriksa petugas aktif. Satu event per barang dijaga unique constraint. Identitas actor berasal dari session dan diverifikasi lagi dalam transaksi.
- Penerimaan/penyerahan Inventaris memakai submissionKey stabil. Retry data yang sama mengembalikan hasil sebelumnya; key sama dengan isi berbeda ditolak 409. UI mengganti key untuk perubahan isi atau entri baru setelah sukses. File sementara dari retry/gagal persistence dibersihkan tanpa menghapus file lama.
- `report_handovers` kini memiliki tepat satu sumber: match_id atau inventory_id. Riwayat mengambil kedua sumber dalam pagination SQL bersama dengan urutan waktu+UUID, bukan menggabungkan dua halaman di browser. Snapshot petugas/actor tetap terbaca setelah nama master berubah.
- Dashboard membedakan laporan kehilangan, temuan baru, pasangan siap diserahkan, dan barang tersimpan di pos. Barang yang sudah dikembalikan tidak masuk kandidat pencocokan.
- Nama/kontak pelapor langsung disimpan sebagai metadata privat terpisah dari akun Satpam pencatat. Ini bukan pendaftaran akun dan tidak mengirim email/pesan eksternal otomatis.

### Foto dan normalisasi UI

- File tetap berada pada PrivateFileStorage di volume Docker report_uploads. Tidak ada integrasi bucket atau endpoint publik baru.
- Unggahan Satpam memakai validator signature/ukuran bersama dan batas total body 6 MB sebelum parsing multipart (file tetap maksimum 5 MB). URL foto eksternal baru ditolak; nilai URL lama tidak dihapus tetapi tidak diproyeksikan sebagai foto runtime.
- Inventaris yang diterima dari laporan temuan dapat memakai file privat laporan asal melalui endpoint Inventaris yang memeriksa role. Tidak perlu menggandakan file atau mengekspos storageKey.
- InventoryDetailDialog memakai OperationalReportDialog, sticky shelf ringkas dan nested confirmation form. ReportDetailSection/ReportDetailTable, Stepper, Badge/StatusBadge, SectionCard, CollectionEmptyState dan FieldDescription menjadi komposisi bersama.
- FileDropzone memperoleh properti opsional disabled/description tanpa mengubah default caller lain. Foto Satpam memakai kontrol tersebut. Error thumbnail menampilkan fallback; file asli tetap tersedia bagi petugas terotorisasi.
- Ukuran teks 10/11px, lebar arbitrary pada filter/aksi yang disentuh, badge status lokal, dan wrapper Riwayat lama dinormalisasi. Warna Inventaris memakai token tema, termasuk bg-background (#F4F5F7 pada tema terang); tidak ada warna hex/inline style baru dalam komponen Satpam.
- Waktu otomatis form kehilangan staf kini dikirim sebagai mode kosong agar server menentukan waktu submit; tanggal khusus tetap divalidasi kalender/WIB. Navigasi langkah kembali memakai Button yang bisa dijangkau keyboard.

### Migration dan deployment

Migration 0016_satpam_inventory_handovers memperluas report_handovers, menambah relasi/key pada Inventaris, dan menyalin catatan penyerahan lama. Officer/actor yang memang tidak tercatat tetap null dengan penanda legacy dan label Tidak tercatat (data lama); identitas pencatat awal tidak dianggap sebagai penyerah. Timestamp fallback data lama memakai waktu yang sudah tersedia dan ditandai legacy.

Migration 0017_satpam_walk_in_owner menambah metadata nama/kontak orang yang melapor langsung ke pos. Tidak ada reset data atau seed baru. Kedua migration beserta snapshot/journal harus dibagikan bersama kode. Jalankan Compose development biasa setelah pull:

```powershell
docker compose -f compose.yaml -f compose.dev.yaml up --build --watch
```

Migrator harus selesai sebelum app baru aktif. Jangan menghapus volume atau mengedit migration yang sudah diterapkan. PostgreSQL dan volume report_uploads perlu dibackup berpasangan.

### Verifikasi

Tes SQL lokal dijalankan pada NODE_ENV=development dengan guard koneksi loopback:

```powershell
node --conditions=react-server --import tsx --test scripts/satpam-inventory-handover-db.test.ts scripts/inventory-pagination-db.test.ts scripts/satpam-inventory-db.test.ts scripts/satpam-dashboard-priority-db.test.ts scripts/satpam-acceptance-db.test.ts
```

Tes mencakup penerimaan idempotent, penyerahan tanpa laporan, penutupan kehilangan+temuan tertaut, snapshot identitas, penolakan scope/status/petugas tidak valid, legacy backfill, pagination, serta concurrent return dan concurrent retry. Fixture utama di-rollback; fixture race yang perlu koneksi terpisah dibersihkan dengan ID khusus.

Smoke HTTP scripts/satpam-smoke.ts kini mencakup unggah/retry foto privat, penolakan role Pelapor, akses thumbnail setelah cache terisi, penolakan URL eksternal, validasi kepemilikan, penyelesaian kehilangan tertaut dan satu riwayat penyerahan. Jalankan di app development lokal dengan REPORT_SMOKE_CONNECT_URL mengarah ke loopback app dan origin Better Auth yang tepat. Akun/file fixture dibersihkan pada finally. Jangan menonaktifkan rate limit login bila pengujian berulang mencapai 429; tunggu jendelanya berakhir.

QA manual: terima barang tanpa laporan, terima temuan daring yang benar-benar sudah masuk pos, serahkan dengan/tanpa kehilangan, baca Riwayat/data lama, ubah filter dan cari kandidat di halaman berikutnya, uji foto kosong/gagal, serta periksa modal bertingkat dan tampilan mobile/tema gelap. Preview/browser automation tidak dijalankan.

Hasil verifikasi sesi implementasi: 236 tes non-database, 7 tes PostgreSQL, smoke HTTP Satpam, lint, typecheck, pemeriksaan metadata Drizzle dan production image build berhasil. Fixture HTTP/race dibersihkan dan fixture transaksi di-rollback. Kedua migration sudah diterapkan pada PostgreSQL lokal; deployment lain tetap harus menerapkannya melalui migrator. QA visual/interaksi belum diklaim selesai dan tetap manual.

Audit rinci dan batas pekerjaan ada di docs/satpam-alur-lapangan-2026-10-25.md. Penyelesaian di luar pos, satu form penerimaan+pengembalian sekaligus, dan sisa audit historis lintas role tidak diaktifkan diam-diam melalui perubahan ini.
