# AspirasiJTI

Portal pelaporan internal untuk Jurusan Teknologi Informasi (JTI) POLIJE. AspirasiJTI menyatukan pelaporan Kehilangan & Temuan, fasilitas, layanan internal, dan laporan umum ke dalam alur berbasis tiket yang dapat dipantau oleh pelapor dan ditangani oleh pengelola yang tepat.

> Status: frontend MVP dengan backend Docker, PostgreSQL, Drizzle, dan Better Auth. Login email/password, session database, logout, dan pemeriksaan role server sudah tersedia. Laporan, statistik, dan notifikasi masih memakai data demonstrasi. Integrasi SSO dan backend workflow menjadi tahap berikutnya; aplikasi belum siap dibuka sebagai layanan production.

## Tujuan

- Memberikan satu titik pelaporan untuk kebutuhan operasional internal JTI.
- Mengarahkan laporan otomatis berdasarkan kategori dan tanggung jawab pengelola.
- Menampilkan perkembangan status secara jelas kepada pelapor.
- Membantu teknisi dan manajemen menentukan fokus penanganan dari konsentrasi laporan aktif.
- Menjaga riwayat penanganan sebagai dasar monitoring dan rekap operasional.

## Kategori laporan dan pengelola

| Kategori | Pengelola | Alur status utama |
| --- | --- | --- |
| Kehilangan & Temuan | Satpam | Baru -> Diverifikasi -> Diproses -> Barang teridentifikasi -> Diserahkan -> Selesai |
| Laporan Fasilitas | Teknisi | Baru -> Diverifikasi -> Diproses -> Selesai |
| Laporan Layanan | Manajemen Jurusan | Baru -> Sedang Diproses -> Selesai |
| Laporan Lainnya | Manajemen Jurusan | Baru -> Sedang Diproses -> Selesai |

## Peran pengguna

| Peran | Kemampuan utama |
| --- | --- |
| **Pelapor** | Membuat laporan, melihat laporan milik sendiri, memantau progres, menerima notifikasi, dan melihat profil. |
| **Satpam** | Memverifikasi laporan Kehilangan & Temuan, mencocokkan laporan kehilangan dengan temuan, mengonfirmasi penyerahan, dan melihat riwayat. |
| **Teknisi** | Menangani laporan fasilitas, memperbarui status perbaikan, melihat prioritas ruangan dan objek fasilitas, serta membuka riwayat perbaikan. |
| **Manajemen Jurusan** | Mengelola laporan layanan dan lainnya, memantau laporan lintas kategori, membaca statistik, serta menyiapkan rekap operasional. |

Role Admin tidak dibangun sebagai modul terpisah. Manajemen Jurusan menjadi hierarki operasional tertinggi pada MVP ini. Role ditentukan di database aplikasi, termasuk ketika metode login SSO ditambahkan nanti.

## Fitur yang tersedia

### Pelapor

- Form laporan tunggal untuk empat kategori dengan field yang menyesuaikan kategori.
- Pemilihan ruangan berdasarkan lantai dan pemilihan multi-objek fasilitas.
- Pemilih tanggal dan waktu yang responsif, termasuk pemilih waktu native di perangkat mobile.
- Laporan Saya, detail progres tiket, notifikasi, dan profil.

### Satpam

- Workspace Kehilangan & Temuan dengan tab laporan kehilangan, temuan, dan pencocokan barang.
- Indikasi kesesuaian barang sebagai bantuan pemeriksaan, kemudian konfirmasi pencocokan oleh satpam.
- Konfirmasi penyerahan dan riwayat kasus yang telah selesai.

### Teknisi

- Antrean laporan fasilitas dengan filter status dan detail laporan.
- Aksi verifikasi, proses perbaikan, dan penyelesaian beserta riwayat status.
- Analisis prioritas berlapis: ruangan dengan konsentrasi laporan aktif, lalu objek fasilitas yang paling sering dikeluhkan pada ruangan terpilih.

### Manajemen Jurusan

- Workspace pengelolaan laporan layanan dan lainnya dalam satu halaman bertab.
- Monitoring lintas kategori berdasarkan sumber laporan, status, periode, dan kata kunci tanpa mengubah tiket.
- Statistik tren, distribusi kategori dan status, tingkat penyelesaian, serta prioritas fasilitas yang bersifat read-only.
- Rekap laporan operasional.

## Pengalaman antarmuka

Antarmuka dirancang dengan pola komponen Shadcn yang konsisten, mendukung mode terang/gelap, sidebar responsif, serta aksesibilitas dasar seperti label kontrol dan navigasi keyboard. Detail laporan operasional menggunakan struktur modal yang sama agar status, tindakan, lampiran, dan riwayat mudah dipindai pada setiap role.

## Teknologi

- [Next.js 16](https://nextjs.org/) dan React 19
- TypeScript
- Tailwind CSS 4
- Shadcn UI dengan Base UI primitives
- Lucide React untuk ikon
- Recharts untuk visualisasi statistik
- PostgreSQL 18 dengan penyimpanan Docker volume
- Drizzle ORM + `pg`, Drizzle Kit untuk migrasi
- Better Auth untuk autentikasi dan session
- Docker Compose untuk development dan production

## Struktur proyek

```text
src/
├── app/
│   ├── (auth)/login/             # Login email/password Better Auth
│   └── (protected)/              # Route per role yang memerlukan sesi
│       ├── pelapor/
│       ├── satpam/
│       ├── teknisi/
│       └── manajemen/
├── components/
│   ├── ui/                       # Primitive dan komponen Shadcn yang disesuaikan
│   ├── layout/                   # Sidebar, shell, dan header halaman
│   └── dashboard/                # Komposisi KPI bersama
├── features/
│   ├── reports/                  # Form dan riwayat pelapor
│   ├── lost-found/               # Workflow Satpam
│   ├── facilities/               # Workflow Teknisi dan agregasi prioritas
│   ├── management/               # Monitoring, statistik, dan rekap Manajemen
│   ├── notifications/
│   └── profile/
├── db/                           # Schema, koneksi PostgreSQL, dan akses server-only
└── lib/
    └── auth/                     # Better Auth, session server, dan pemeriksaan role
```

## Menjalankan proyek dengan Docker

### Prasyarat

- Git dan Docker Desktop yang sedang berjalan (Windows: WSL 2).
- Docker Compose yang mendukung Watch dan `initial_sync` (disarankan versi bawaan Docker Desktop terbaru).
- Node.js dan PostgreSQL tidak perlu dipasang di host untuk alur container penuh.

### Setup pertama

```powershell
git clone https://github.com/Cattus9/lapor-jti.git
cd lapor-jti
Copy-Item .env.example .env
# Isi BETTER_AUTH_SECRET di .env dengan hasil perintah berikut:
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
docker compose -f compose.yaml -f compose.dev.yaml up --build --watch
```

Pada Linux/macOS, gunakan `cp .env.example .env` sebagai pengganti `Copy-Item`. `.env` berisi konfigurasi laptop masing-masing dan tidak masuk Git. Jika port 3000 sudah digunakan, ubah `APP_PORT` di `.env`, misalnya menjadi `3001`, dan sesuaikan `BETTER_AUTH_URL` menjadi `http://localhost:3001`. Gunakan alamat yang sama di browser; `localhost` dan `127.0.0.1` adalah origin berbeda untuk autentikasi. Tanpa Node.js di host, secret dapat dibuat dengan `docker run --rm node:24-bookworm-slim node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`.

Alur startup: Docker membangun image Node.js dan menjalankan `npm ci`, PostgreSQL menyiapkan database dan akun, migrator menerapkan SQL yang belum dijalankan, lalu Next.js development menyala. Watch menyinkronkan perubahan `src` dan `public` untuk hot reload; perubahan dependency atau konfigurasi build memicu rebuild. Jangan menghubungkan `node_modules` Windows ke container Linux.

Buka `http://localhost:3000` atau port sesuai `APP_PORT`. Endpoint `GET /api/health` mengembalikan HTTP 200 jika koneksi PostgreSQL berhasil, atau 503 jika koneksi gagal. Endpoint ini tidak menampilkan kredensial atau data pengguna.

### Layanan dan penyimpanan

| Layanan | Fungsi | Akun database |
| --- | --- | --- |
| `db` | PostgreSQL, data disimpan di volume `postgres_data` | Pemilik database dan akun aplikasi dibuat saat inisialisasi pertama |
| `migrate` | Menjalankan migrasi satu kali sebelum aplikasi menyala | `POSTGRES_USER`, pemilik schema |
| `app` | Next.js dan Drizzle ORM | `APP_DB_USER`, hanya akses data tanpa izin membuat tabel |

File `docker/postgres/init-app-user.sh` membuat akun aplikasi dan izin default untuk tabel yang dibuat oleh migrator. Nama akun owner dan aplikasi harus berbeda. Perubahan password di `.env` tidak otomatis mengubah akun pada database yang sudah ada; lakukan perubahan akun melalui PostgreSQL dan perbarui konfigurasi secara bersamaan. Script inisialisasi hanya dijalankan untuk volume kosong.

Database dipublikasikan ke `127.0.0.1:${DB_PORT}` hanya pada development. Di dalam container, hostname database adalah `db`; alat database di laptop memakai `127.0.0.1`. `src/db/environment.ts` menyusun URL dari variabel `PG*` dan mengodekan username/password. Jika berjalan pada host, klien aplikasi memakai `APP_DB_*`, sedangkan migrator memakai `POSTGRES_*`. `DATABASE_URL` dapat dipakai sebagai override untuk koneksi dari alat lokal, tetapi jangan mengisinya dengan kredensial owner untuk container aplikasi.

`docker compose -f compose.yaml -f compose.dev.yaml down` menghentikan container sambil mempertahankan volume data. **Jangan menambahkan `-v` jika data harus disimpan**, karena opsi itu menghapus volume. Clone di device lain membuat database tersendiri; data tidak ikut Git.

### Migrasi dan data contoh

Schema ada di `src/db/schema.ts`: tabel `users` menyimpan profil, role dan status aktif, sedangkan `accounts`, `sessions`, dan `verifications` menyimpan data autentikasi Better Auth. Migration `0001_better_auth.sql` menambahkan tabel dan kolom tanpa menghapus pengguna sebelumnya. Schema laporan belum ditambahkan. Adanya role `admin` pada enum hanya mempertahankan tipe role lama, tidak menambahkan modul atau akun admin.

Setelah container berjalan, gunakan terminal lain:

```powershell
# Periksa koneksi dengan akun aplikasi.
docker compose -f compose.yaml -f compose.dev.yaml exec app npm run db:check

# Opsional: tambahkan empat akun demo dengan password dari DEMO_USER_PASSWORD.
docker compose -f compose.yaml -f compose.dev.yaml run --rm migrate npm run db:seed

# Setelah mengubah schema, buat migrasi SQL yang disimpan di repository.
docker compose -f compose.yaml -f compose.dev.yaml run --rm migrate npm run db:generate -- --name=nama_perubahan

# Tinjau SQL yang dihasilkan, lalu terapkan.
docker compose -f compose.yaml -f compose.dev.yaml run --rm migrate npm run db:migrate
```

Folder `drizzle/` dihubungkan ke host pada layanan migrator development agar file migrasi hasil generate tersimpan di repository. Migrasi dijalankan otomatis pada startup; perubahan schema selanjutnya tetap perlu generate dan migrate. Seed tidak otomatis dijalankan dan ditolak jika `NODE_ENV` bukan `development`. Seed meng-hash `DEMO_USER_PASSWORD` menggunakan algoritme Better Auth. Pengguna demo lama yang cocok mendapat kredensial jika belum ada, serta pengisian field profil yang masih kosong. Password, role, dan profil yang telah terisi tidak diganti saat seed diulang. Seed menolak memasang kredensial demo ke pengguna yang tidak cocok dengan fixture.

### Konfigurasi production di VPS

```bash
cp .env.production.example .env.production
# Isi password owner/aplikasi dan BETTER_AUTH_SECRET dengan nilai acak berbeda.
# Isi BETTER_AUTH_URL dengan origin HTTPS publik kampus.
docker compose --env-file .env.production -p aspirasijti-production -f compose.yaml up --build -d
```

Gunakan project name production yang berbeda agar volume, network, dan container tidak tercampur dengan development. Hanya file contoh environment yang masuk Git; kredensial server disediakan saat runtime dan tidak dimasukkan ke image. File `.env*` sebenarnya, `.git`, serta dependency host dikeluarkan oleh `.dockerignore`.

Image production memakai output Next.js `standalone`, berjalan sebagai pengguna non-root, dan tidak mengaktifkan hot reload. PostgreSQL tidak membuka port host; Next.js hanya membuka port pada loopback host untuk diakses reverse proxy HTTPS. Konfigurasi auth menolak origin HTTP pada production. Reverse proxy, domain, kebijakan akun resmi/SSO, backend workflow beserta otorisasi mutasi, penyimpanan lampiran, backup/restore terjadwal, dan pemeriksaan keamanan dependency harus diselesaikan sebelum layanan dibuka ke pengguna kampus. Volume mempertahankan data, tetapi bukan pengganti backup. Jangan menjalankan seed demo pada production.

Panduan teknis: [Compose Watch](https://docs.docker.com/compose/how-tos/file-watch/), [urutan startup Compose](https://docs.docker.com/compose/how-tos/startup-order/), [Next.js standalone](https://nextjs.org/docs/app/api-reference/config/next-config-js/output), dan [image PostgreSQL](https://github.com/docker-library/docs/blob/master/postgres/README.md).

### Alternatif: menjalankan Next.js di host

Jika diperlukan untuk debugging khusus, jalankan `npm ci` dengan Node.js 24, nyalakan hanya layanan `db`, lalu `npm run dev`. Koneksi aplikasi memakai `APP_DB_*` dari `.env` dan host `127.0.0.1:${DB_PORT}`. Alur Docker penuh di atas adalah alur utama proyek.

### Akun demonstrasi

Jalankan seed opsional terlebih dahulu. Masukkan salah satu email berikut dan password sesuai `DEMO_USER_PASSWORD` saat seed pertama kali membuat kredensial (contoh development: `AspirasiJTI-Dev-2026!`). Password ini hanya untuk pengujian lokal, bukan password Google kampus. Mengubah nilai environment tidak mereset kredensial yang sudah tersimpan.

| Role | Email akun uji |
| --- | --- |
| Pelapor | `pelapor@gmail.com` |
| Satpam | `satpam@gmail.com` |
| Teknisi | `teknisi@gmail.com` |
| Manajemen Jurusan | `manajemen@gmail.com` |

### Perilaku autentikasi

Komentar penanda migrasi auth tersedia pada seluruh `page.tsx` dan file implementasi terkait:

- `AUTH-LOCAL`: form/kredensial email-password serta fixture development yang perlu ditinjau ketika login Google menjadi metode utama.
- `AUTH-SESSION`: validasi session, adapter identitas, logout, dan konfigurasi engine autentikasi.
- `AUTH-ROLE`: izin internal dari database aplikasi yang tetap diperlukan untuk login lokal maupun Google Workspace.
- `AUTH-SSO`: titik integrasi provider Google yang belum diaktifkan.
- `AUTH-SCHEMA`: penyimpanan/migrasi database; jangan menghapus data atau mengubah SQL yang sudah diterapkan saat migrasi auth.

Google Workspace adalah sumber identitas/metode login; Better Auth dapat tetap menjadi engine session. Jika engine benar-benar diganti, mulai dari `src/lib/auth/server-session.ts`, lalu migrasikan handler/client dan session secara terencana. Pertahankan guard role di setiap halaman. Penanda dapat dicari dengan `rg -n 'AUTH-(LOCAL|SESSION|ROLE|SSO|SCHEMA)' src scripts`.

- Login dan logout melalui `/api/auth/*`; cookie session HttpOnly diterbitkan Better Auth dan session disimpan di PostgreSQL. Masa berlaku 7 hari dengan pembaruan harian.
- Tidak ada fallback pengguna default. Cookie email dummy lama diabaikan. Setiap halaman protected memeriksa session; setiap halaman role memeriksa role database saat request server.
- Pendaftaran publik email/password dinonaktifkan. Role, status aktif, dan metadata institusi tidak dapat diubah melalui input auth pengguna.
- Akun nonaktif ditolak saat membuat session dan saat mengakses halaman protected, termasuk session yang dibuat sebelum akun dinonaktifkan.
- Login dibatasi 5 percobaan per menit per IP. Rate limit masih in-memory per proses; gunakan penyimpanan bersama bila deployment memakai beberapa instance. Konfigurasi IP reverse proxy harus ditinjau saat hosting.
- SSO/Google, verifikasi email dan reset password melalui email belum diaktifkan. Tabel `verifications` disediakan untuk kebutuhan auth berikutnya, bukan berarti fitur pengiriman email sudah tersedia.
- Jangan menyalin volume atau akun demo ke production. Penyediaan akun resmi akan ditentukan setelah konfigurasi SSO kampus jelas.

### Pengujian autentikasi

`npm run test:auth-config` menguji validasi secret dan origin. `test:auth-smoke` memeriksa API serta otorisasi route HTTP (tanpa browser): cookie lama, password salah, penolakan registrasi, empat role, pencegahan perubahan role, origin tidak tepercaya, logout, dan rate limit. Jalankan setelah seed di server development lokal:

```powershell
$env:NODE_ENV='development'
npm run test:auth-smoke
```

Smoke check dijalankan dari host dengan Node.js agar origin loopback mengarah ke server yang sama dengan browser. Node.js host tidak diperlukan untuk menjalankan aplikasi melalui Docker. Tunggu setidaknya satu menit sebelum mengulang tes karena sengaja menguji batas login. Validasi tampilan/interaksi browser tetap manual.

## Perintah yang tersedia

```bash
npm run dev      # Menjalankan server pengembangan
npm run lint     # Memeriksa aturan ESLint
npm run typecheck # Memeriksa tipe TypeScript
npm run build    # Membuat production build
npm run start    # Menjalankan production build
npm run db:generate # Membuat SQL migrasi dari perubahan schema
npm run db:migrate  # Menerapkan migrasi ke database
npm run db:check    # Memeriksa koneksi dan tabel pengguna
npm run db:seed     # Menambahkan pengguna demo pada development
npm run test:db-config # Memeriksa URL, karakter khusus, dan validasi konfigurasi database
npm run test:auth-config # Memeriksa konfigurasi secret dan origin autentikasi
npm run test:auth-smoke  # Pengujian API/route lokal setelah seed (NODE_ENV=development)
```

## Backend Pelapor

Dashboard, Buat Laporan, Laporan Saya/detail, draft, lampiran, dan notifikasi Pelapor sudah menggunakan PostgreSQL. Profil memakai identitas database dari session. Data demonstrasi Pelapor tidak dimasukkan otomatis; akun yang belum mengirim laporan akan melihat ringkasan kosong.

Schema auth tetap berada di `src/db/schema.ts`. Schema laporan bersama berada di `src/db/reports-schema.ts` dan diekspor lewat schema utama. Migrasi `0002` membuat tabel serta pilihan referensi lokasi/objek/layanan dari form yang ada; ini bukan seed akun/laporan demo. Migrasi berikutnya menambah constraint dan index. Jangan mengubah migrasi yang sudah diterapkan. Nilai referensi tambahan/perubahan berikutnya dibuat lewat migrasi baru, bukan mengganti label/ID yang telah dipakai.

Struktur fitur laporan:

- `domain/`: kategori, status/lifecycle, routing pengelola, validasi field dan lampiran; tanpa React/Next/Drizzle.
- `application/`: proses aplikasi dan kontrak repository/storage. ESLint membatasi import UI/framework/infrastructure pada kedua lapisan ini.
- `infrastructure/`: adapter Drizzle, penyimpanan privat, dan validasi HTTP/session/origin.
- `server.ts`: merangkai implementasi adapter; halaman/API menjadi pemanggil tipis.
- `components/`: presentasi Shadcn dan state interaksi. Detail baru dimuat ketika modal dibuka.

Satu laporan dipakai lintas role; kategori menentukan Satpam/Teknisi/Manajemen di server. Pelapor hanya boleh membaca laporan, draft, lampiran, dan notifikasinya sendiri. Identitas/role/status dari request tidak dipercaya. Pengiriman membuat laporan, detail kategori, pemindahan lampiran draft, riwayat awal, dan notifikasi dalam transaksi. Counter tiket tahunan dibuat atomik; retry dengan submission key yang sama tidak menggandakan laporan. Draft memiliki revision untuk mencegah perubahan tertimpa, belum mendapat nomor tiket, dan tidak masuk KPI/statistik.

Tanggal kejadian harus berupa tanggal kalender valid dan maksimal hari ini berdasarkan WIB (UTC+7), bukan zona waktu laptop/server. Kalender Buat Laporan menonaktifkan tanggal mendatang dan membatasi navigasi bulan. Backend mengulang validasi sebelum penyimpanan untuk kirim laporan maupun simpan draft, termasuk request langsung. Draft boleh belum memiliki tanggal; draft lama dengan tanggal mendatang harus diperbaiki sebelum disimpan atau dikirim.

Daftar laporan/draft/notifikasi memakai cursor pagination (20 per halaman). Index mendukung pemilik/tanggal, antrean pengelola/status, kategori/periode, lokasi aktif, penyelesaian, dan notifikasi belum dibaca. KPI dihitung lewat agregasi SQL, bukan mengambil seluruh laporan ke browser. Presisi timestamp laporan disamakan ke milidetik agar cursor tidak kehilangan presisi. Counter dapat memiliki gap setelah pengujian/penghapusan; nomor tiket tidak harus berurutan tanpa celah.

Laporan Saya menampilkan badge kategori dan tanggal **Dikirim** terpisah dari waktu pembaruan. Pencarian judul/nomor tiket serta filter kategori, status, dan periode diterapkan di SQL sebelum pagination, selalu dibatasi pemilik. Filter otomatis memuat hasil tanpa tombol Terapkan: pilihan langsung diterapkan, pencarian menunggu 350 ms setelah mengetik, dan rentang menunggu kedua tanggal lengkap dan valid. Pilihan tersimpan di URL menggunakan replace agar pencarian tidak memenuhi riwayat browser; pagination tetap membawa filter, sedangkan perubahan kriteria kembali ke laporan terbaru yang sesuai. Periode memakai hari kalender WIB berdasarkan `submitted_at`, bukan tanggal kejadian atau waktu draft dibuat. Rentang tanggal mencakup seluruh hari terakhir. Draft tetap terpisah dan tidak mengikuti filter laporan terkirim. Query memakai index pemilik/tanggal yang sudah tersedia dan mengambil maksimal 21 baris; pencarian substring tidak dianggap sudah dioptimalkan dengan index teks. Evaluasi `pg_trgm`/index gabungan melalui query plan jika volume per pengguna meningkat.

Filter Proses hanya menampilkan **Semua / Belum selesai / Selesai**, sama untuk semua jenis laporan. Belum selesai mencakup status baru dan tahapan penanganan, bukan ditolak; Selesai hanya status `selesai`. Laporan ditolak tetap tersedia di Semua dengan badge status aslinya. URL lama dengan tahapan tertentu dinormalisasi ke kelompok Belum selesai, sedangkan `ditolak` kembali ke Semua. Toolbar memakai label ringkas, pencarian fleksibel, dan dropdown dengan lebar terbatas; pada area konten sempit filter berpindah ke baris kedua, dan pada mobile tetap menggunakan tombol Filter. Skeleton mengikuti komposisi yang sama.

Lampiran disimpan di volume Docker `report_uploads` pada `/app/storage/reports`, di luar `public` dan di luar image/build. Database menyimpan metadata/kunci acak, bukan file. Endpoint download memeriksa session dan pemilik, menggunakan `no-store` dan `nosniff`. Maksimal 4 file, 5 MB per file, total request dibatasi 22 MB; server memeriksa signature JPG/PNG/PDF. Backup production harus mencakup database **dan** volume lampiran. Sebelum production, tetapkan kuota storage, pemindaian malware, rate limit laporan, serta pembersihan file orphan apabila proses terhenti di antara penulisan file dan commit database. Penyimpanan filesystem dapat diganti melalui kontrak storage ketika diperlukan object storage.

Password empat akun development (`pelapor@gmail.com`, `satpam@gmail.com`, `teknisi@gmail.com`, `manajemen@gmail.com`) berasal dari `DEMO_USER_PASSWORD` di `.env`. Nilai contoh adalah `AspirasiJTI-Dev-2026!`. Fixture hanya berisi identitas; password di database berupa hash. Seed tidak mengganti password akun yang telah ada. Gunakan origin/port yang cocok dengan `BETTER_AUTH_URL` (setup lokal saat ini Docker port 3001); membuka server host di port lain bisa menyebabkan penolakan origin. Tidak ada akun admin demo.

Pengujian tambahan:

```powershell
npm run test:reports # Unit domain/application tanpa UI/database
npx tsx --test scripts/report-list-filters.test.ts # Validasi filter, hari WIB, dan URL pagination
# Jalankan di container development yang memiliki volume lampiran yang sama dengan aplikasi.
# Ganti nilai password dengan DEMO_USER_PASSWORD lokal bila diubah.
docker compose -f compose.yaml -f compose.dev.yaml exec -T -e DEMO_USER_PASSWORD=AspirasiJTI-Dev-2026! -e REPORT_SMOKE_CONNECT_URL=http://127.0.0.1:3000 app npm run test:reports-smoke
```

Smoke test membuat akun dan laporan sementara, lalu menghapus data/file milik akun pengujian dalam `finally`. Tidak mengubah akun/laporan demo milik pengguna. Ini pengujian HTTP/database, bukan browser automation. Pemeriksaan tampilan/interaksi dilakukan manual.

## Backend Satpam

Dashboard, Kehilangan & Temuan, pencocokan, penyerahan, riwayat dan notifikasi Satpam sudah membaca PostgreSQL. Profil tetap memakai identitas session. Laporan Kehilangan & Temuan dari Pelapor otomatis masuk antrean Satpam dan menghasilkan notifikasi. Backend Teknisi dijelaskan di bagian berikut; Manajemen belum dihubungkan.

Implementasi berada di `src/features/lost-found`: `domain/` memvalidasi perintah dan filter, `application/` menangani policy melalui kontrak repository/storage, `infrastructure/` menyediakan transaksi Drizzle dan pemeriksaan HTTP, sedangkan `server.ts` merangkai adapter. Halaman/API tetap memeriksa session dan role Satpam; UI bukan sumber otorisasi.

Migrasi `0005` menambah `security_officers`, `lost_found_matches`, `report_handovers`, serta index antrean pengelola/tanggal. Petugas merupakan identitas operasional, **bukan akun login tambahan**. Akun Satpam dapat tetap digunakan bersama. Nama petugas dipilih wajib hanya saat penyerahan; pencocokan dan perubahan status tetap mencatat akun session. Nama petugas dan akun pencatat disalin ke transaksi agar riwayat tidak berubah ketika nama diperbarui atau petugas dinonaktifkan. Pemilihan dropdown tidak membuktikan identitas individu yang menggunakan akun bersama.

Alur utama: **Baru → Diverifikasi → Diproses → Barang teridentifikasi → Diserahkan → Selesai**. Laporan Baru dapat ditolak dengan alasan wajib. Pencocokan harus menghubungkan satu kehilangan dan satu temuan yang keduanya Diproses. Penyerahan membutuhkan petugas aktif, penerima dan lokasi. Pencocokan, penyerahan dan penyelesaian memperbarui **kedua tiket** dalam transaksi, termasuk riwayat dan notifikasi masing-masing Pelapor. Penyelesaian dari salah satu tiket menutup pasangan setelah ada penyerahan, bukan melompati tahapan.

Lock baris menggunakan urutan UUID yang konsisten; constraint unik mencegah pasangan/penyerahan ganda. Permintaan yang bertabrakan dengan status terbaru ditolak dengan HTTP 409. Identitas akun/nama petugas dari browser tidak dipercaya. Lampiran Satpam hanya tersedia untuk laporan Kehilangan & Temuan yang sudah dikirim, bukan draft atau kategori lain.

Pencarian/filter dikerjakan di SQL sebelum cursor pagination (20 item, dengan Muat lainnya). Cursor memakai tanggal dan UUID agar stabil ketika timestamp sama. Lampiran diambil secara batch per halaman, detail/riwayat dimuat saat modal dibuka, dan skeleton/error digunakan selama request. Riwayat dapat difilter berdasarkan petugas, pencarian dan periode penyerahan WIB; petugas nonaktif tetap dapat dipakai sebagai filter riwayat. Index bukan jaminan optimasi pencarian substring: tinjau query plan dan kebutuhan `pg_trgm` saat volume meningkat.

### Petugas contoh khusus development

`scripts/fixtures/security-officers.ts` menyediakan **Satpam 1 (contoh)** dan **Satpam 2 (contoh)**, sesuai kebutuhan satu akun bersama. Migrasi tidak memasukkan petugas contoh. Seed bersifat opsional, menolak environment selain development, dan tidak dijalankan otomatis oleh Dockerfile atau saat aplikasi dimulai.

```powershell
npm run db:migrate
$env:NODE_ENV='development'
npm run db:seed-officers # Hanya petugas contoh, tanpa mengubah akun/password
```

`npm run db:seed` juga menyediakan petugas contoh ketika menyiapkan akun demo. Seed memakai ID tetap dan tidak mengganti petugas yang sudah ada. Pada production, nama petugas resmi dikelola melalui Pengaturan Operasional oleh Manajemen; jangan jalankan seed development atau membawa volume demo. Jika belum ada petugas aktif, penyerahan diblokir. Nama petugas tetap terpisah dari akun login Satpam.

### Pengujian Satpam

```powershell
npm run test:satpam # Unit domain/application
# Jalankan pada container development lokal yang memiliki volume lampiran aplikasi.
# Gunakan DEMO_USER_PASSWORD lokal jika berbeda dari contoh.
docker compose -f compose.yaml -f compose.dev.yaml exec -T -e DEMO_USER_PASSWORD=AspirasiJTI-Dev-2026! -e REPORT_SMOKE_CONNECT_URL=http://127.0.0.1:3000 app npm run test:satpam-smoke
```

Smoke test memakai akun, laporan dan petugas sementara yang dibersihkan dalam `finally`, tanpa mengubah data pengguna. Cakupan: hak akses/session/origin, isolasi draft/lampiran, transisi status, pencocokan bersamaan, penyerahan bersamaan, petugas wajib/aktif, snapshot identitas, penyelesaian pasangan, notifikasi, pencarian literal, pagination dan route Satpam. Ini pengujian HTTP/database, bukan browser automation. Tampilan dropdown, modal, skeleton dan responsivitas diuji manual oleh pengguna.

## Backend Teknisi

Dashboard, antrean Laporan Fasilitas, prioritas ruang/objek, detail, riwayat perbaikan, lampiran privat dan notifikasi Teknisi memakai PostgreSQL. Tidak ada data laporan demonstrasi yang disisipkan. Pelapor dan Teknisi membaca tiket yang sama, bukan salinan laporan per role; Manajemen nantinya memakai schema bersama ini untuk monitoring.

Implementasi `src/features/facilities` memisahkan `domain/` (validasi/lifecycle), `application/` (service dan kontrak), `infrastructure/` (Drizzle, transaksi, HTTP/session), dan `components/` (Shadcn). Halaman/API tipis memanggil service melalui `server.ts`. Guard memeriksa session, akun aktif, role database, kategori fasilitas dan pengelola Teknisi. Role tetap berada di aplikasi, tidak tergantung provider login/SSO.

Alur **Baru → Diverifikasi → Diproses → Selesai** tidak boleh dilompati. Baru dapat ditolak dengan alasan wajib. Penyelesaian membutuhkan catatan pekerjaan maksimal 2.000 karakter. Mutasi mengunci tiket, mengecek akun aktif lagi, lalu menyimpan status, `completed_at`, riwayat dengan identitas akun server dan notifikasi Pelapor dalam satu transaksi. Dua operator yang mengubah tahap yang sama menghasilkan satu pemenang dan HTTP 409 untuk permintaan yang tertinggal. Akun Teknisi aktif mendapatkan notifikasi saat Pelapor mengirim laporan fasilitas baru.

Daftar memakai keyset pagination **20 tiket** dengan tanggal dan UUID; filter status, pencarian literal, periode WIB dan urutan diterapkan di SQL sebelum pagination. Periode antrean mengikuti tanggal dikirim, sementara riwayat mengikuti tanggal selesai. Objek, jumlah lampiran dan catatan selesai dimuat dalam batch per halaman, bukan query per baris. Dashboard menampilkan maksimal **5 tiket aktif terbaru**. Detail dan lampiran hanya dimuat sesuai kebutuhan; modal dimiliki workspace sehingga tetap terbuka saat baris berganti status atau daftar refresh. Shell modal dan hook resource dibagikan dengan Satpam untuk mempertahankan hierarki/penanganan refresh yang sama.

Prioritas dihitung lewat agregasi SQL seluruh laporan aktif, bukan hanya 20 tiket yang terlihat. Satu tiket multi-objek dihitung sekali untuk ruang, tetapi bisa masuk hitungan beberapa objek. Ruang/objek dengan jumlah sama memiliki prioritas setara. Isian lokasi atau objek lainnya yang tidak terdaftar tidak menjadi kelompok prioritas; tiketnya tetap tersedia di semua laporan. Ini ukuran konsentrasi laporan, **bukan skor risiko, usia tiket atau SLA**. Belum ada penugasan per individu, biaya perbaikan atau inventaris aset.

Migrasi **0006** menambah index pengelola/tanggal selesai/UUID dan memperkuat index pengelola/status/tanggal kirim dengan UUID untuk urutan stabil. Schema laporan yang ada cukup; tidak membuat tabel laporan Teknisi terpisah dan tidak menjalankan seed. Pencarian substring `ILIKE` belum memiliki index teks; evaluasi `pg_trgm` melalui query plan saat volume bertambah. Index dan EXPLAIN telah diperiksa dengan data pengujian lokal, bukan benchmark beban production.

```powershell
npm run db:migrate # Terapkan 0006, tanpa seed/reset
npm run test:teknisi # Unit domain/application dan regresi arsitektur
npx tsx --test scripts/*.test.ts # Seluruh regresi statis
```

`npm run test:teknisi-smoke` adalah pengujian HTTP/database, bukan browser automation. Jalankan hanya pada development loopback dengan konfigurasi database migration, `DEMO_USER_PASSWORD`, origin yang sesuai dan volume lampiran yang sama dengan aplikasi. Jika pengujian berada di container aplikasi, `REPORT_SMOKE_CONNECT_URL=http://127.0.0.1:3000` mengarah ke port internal; `BETTER_AUTH_URL` tetap origin pengguna, misalnya port host 3001. Kirim kredensial migration hanya ke proses tes, bukan ubah kredensial runtime aplikasi. Tes membuat akun/tiket/file sementara dan membersihkan hanya ID miliknya dalam `finally`; tidak mengubah laporan pengguna. Cakupannya: akses lintas role, draft/kategori/lampiran, fanout notifikasi, tiket multi-objek, konflik bersamaan, lifecycle dan catatan, pagination timestamp sama, periode kirim/selesai, penerima notifikasi dan akun nonaktif. Validasi visual/interaksi tetap dilakukan manual oleh pengguna.

## Batasan MVP

Pengaturan Operasional dan Kelola Pengguna sudah memakai backend nyata. Form Pelapor memilih lokasi menurut area/lantai dan fasilitas sesuai pemetaan ruang. Panduan migrasi, batas kewenangan, dan pengujian ada di [Pengaturan Operasional](OPERATIONS.md).

- Pelapor, Satpam, Teknisi, Manajemen, monitoring, serta statistik lintas role menggunakan backend nyata.
- Login email/password sudah memakai Better Auth; SSO POLIJE belum terhubung.
- Otorisasi halaman dan endpoint seluruh role operasional memakai session/role database. Manajemen hanya menangani laporan Layanan/Lainnya; monitoring lintas pengelola bersifat baca-saja.
- Ekspor CSV mengikuti filter server dan dibatasi 5.000 laporan per permintaan.
- Agregasi prioritas fasilitas menunjukkan konsentrasi laporan aktif, bukan penilaian bahaya atau risiko teknis.

## Arah pengembangan berikutnya

1. Integrasi SSO POLIJE dan pemetaan role dari sumber identitas resmi.
2. Evaluasi index pencarian teks dan pagination server katalog saat volume bertambah.
3. Undangan akun serta alur penggantian password awal yang terkontrol.
4. Tampilan audit operasional untuk perubahan konfigurasi dan akses akun.
5. Pengujian end-to-end untuk lifecycle masing-masing kategori laporan.

## Kontribusi

Gunakan branch terpisah untuk setiap perubahan, jalankan lint dan type check sebelum membuat pull request, serta pertahankan komponen UI berbasis Shadcn agar pengalaman antar-role tetap konsisten.

---

AspirasiJTI dikembangkan sebagai proyek portal pelaporan internal Jurusan Teknologi Informasi POLIJE.
