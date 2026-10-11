# Dev Guide — AspirasiJTI

## Wajib dibaca sebelum bekerja

Panduan ini adalah aturan kerja tim, bukan dokumentasi opsional. Sebelum membuat perubahan, setiap anggota tim, kontributor, dan coding agent wajib membaca **Dev.md dan AGENTS.md secara utuh**, lalu memeriksa implementasi terkait di repository. Aturan dalam AGENTS.md juga disalin di bagian akhir dokumen ini dan tetap berlaku.

Jika instruksi tugas, contoh visual, atau kebiasaan pribadi tampak bertentangan dengan standar proyek, berhenti sejenak: jelaskan konfliknya, pertahankan keamanan dan konsistensi aplikasi, lalu minta keputusan bila hasilnya mengubah aturan atau cakupan. Jangan diam-diam menyimpang dari panduan ini. Permintaan eksplisit pemilik proyek menentukan tujuan dan cakupan fitur, tetapi tidak membenarkan kebocoran rahasia, kerusakan data, pelompatan otorisasi, atau implementasi tidak aman.

## Prinsip umum

- Baca kode, pola komponen, model data, tes, dan dokumentasi terdekat sebelum mengedit; jangan menebak perilaku dari nama file atau tampilan saja.
- Jaga perubahan tetap dalam cakupan permintaan. Hindari refactor, dependensi baru, perubahan kontrak API, atau perubahan data yang tidak diperlukan.
- Gunakan TypeScript dengan tipe yang jelas. Validasi input di server; validasi UI membantu pengguna tetapi bukan pengganti validasi server.
- Akses dan perubahan data harus memeriksa session, role, status akun, kepemilikan, dan kebijakan domain di server. Menyembunyikan tombol/menu bukan kontrol akses.
- Gunakan transaksi untuk satu operasi domain yang memperbarui beberapa baris/tabel atau memerlukan pemeriksaan konsistensi bersama.
- Jangan mencatat password, token, rahasia, atau kredensial ke log, audit, fixture, screenshot, maupun commit.
- Pertahankan data pengguna. Jangan menghapus volume, database, migration, akun, atau file secara destruktif tanpa kebutuhan jelas dan persetujuan yang sesuai.
- Jangan commit atau push kecuali pengguna secara eksplisit meminta. Jangan masukkan file .env atau rahasia ke Git.
- Setelah perubahan, jalankan pemeriksaan statis yang relevan—lint, typecheck, tes domain/database, dan build bila proporsional. Laporkan pemeriksaan yang dilewati beserta alasannya.

## Frontend: normalisasi global.css dan Shadcn wajib

### ⚠️ WARNING KERAS — JANGAN KELUAR DARI SISTEM DESAIN PROYEK

Seluruh styling frontend **WAJIB mengikuti normalisasi proyek di `src/app/globals.css` dan komponen Shadcn yang sudah tersedia**. Jangan membuat sistem visual kedua, menulis warna/ukuran/shadow/radius ad hoc, atau menyalin styling bebas yang tidak mengikuti token dan pola proyek.

Jika perubahan mulai keluar dari konteks, token, komposisi berlapis, atau komponen Shadcn proyek: **JANGAN LANJUTKAN pola tersebut dan jangan kirim implementasinya sebagai selesai.** Tunjukkan bagian yang menyimpang, jelaskan risikonya, lalu luruskan ke tokenisasi `globals.css`, primitive Shadcn yang ada, atau komponen reusable berbasis Shadcn. Bila kebutuhan visual baru memang valid, tambahkan token semantik dan/atau komponen bersama terlebih dahulu. Pengecualian harus eksplisit, terbatas, dan tetap menjaga aksesibilitas serta konsistensi sistem.

Aturan penerapan:

- Sebelum menulis UI, periksa `src/app/globals.css`, `src/components/ui`, `components.json`, dan pola terdekat. `globals.css` adalah sumber token tema, termasuk pasangan tema terang/gelap dan pemetaan `@theme inline`.
- Gunakan token semantik yang sudah tersedia seperti background, foreground, card, primary, muted, accent, destructive, border, input, ring, sidebar, chart, dan token proyek lainnya. Jangan menulis nilai warna literal (`#...`, `rgb()`, `hsl()`) di komponen atau memakai arbitrary color class.
- Jika desain memerlukan warna atau nilai tema baru yang dapat dipakai ulang, definisikan token CSS semantik di `src/app/globals.css`, sediakan nilainya untuk tema relevan, lalu petakan melalui `@theme inline` bila perlu agar Tailwind/Shadcn menggunakannya. Jangan menyimpan nilai tema baru hanya di JSX/TSX atau CSS lokal.
- Gunakan skala utilitas Tailwind yang sudah menjadi bagian sistem untuk layout, jarak, dan tipografi. Jangan membuat arbitrary value sekali pakai seperti `[13px]`, `[#...]`, inline style, atau override lokal hanya untuk meniru screenshot. Jika ukuran khusus berulang dan memang dibutuhkan, normalkan sebagai token atau primitive bersama.
- Semua elemen UI harus memakai primitive Shadcn dari `src/components/ui` atau komposisi Shadcn yang sesuai. Cari primitive/komponen yang dapat digunakan kembali sebelum membuat yang baru. Komponen custom diperbolehkan bila perlu, tetapi harus dibangun dari primitive Shadcn, menjaga API, aksesibilitas, keyboard/focus behavior, dan menjadi pola reusable yang jelas.
- Edit primitive Shadcn bersama hanya jika perubahan visual/interaksi/aksesibilitas/responsif berlaku lintas pemakai. Periksa dampaknya dan pertahankan API kecuali migrasi seluruh pemakai memang termasuk cakupan.
- Hindari card/wrapper yang tidak memberi hierarki atau fungsi. Untuk pola yang ditentukan proyek—terutama KPI dan detail laporan—ikuti komposisi berlapis di AGENTS.md secara tepat. Jangan mengganti standar role tertentu dengan markup lokal yang hanya tampak serupa.
- Field helper text wajib memakai `FieldDescription`; jangan membuat versi helper text sendiri.
- Gunakan Lucide yang tersedia dan semantik; pastikan nama ikon ada di paket terpasang.
- Baca dan gunakan skill frontend proyek di `.agents/skills/design-taste-frontend/SKILL.md` untuk setiap iterasi/pengembangan frontend, bersama aturan AGENTS.md. Jika arahan generik skill bertentangan dengan sistem Shadcn, token, atau kebutuhan eksplisit proyek, pertahankan standar proyek dan ambil hanya arahan skill yang relevan.
- Visual dan interaksi diverifikasi manual oleh pengguna. Jangan menjalankan Preview Mode, browser automation, atau Playwright untuk validasi; tetap lakukan pemeriksaan statis.

## Backend dan arsitektur data

- **Drizzle ORM adalah jalur akses dan pemodelan database proyek.** Gunakan schema/type Drizzle di `src/db` dan repository/domain yang sesuai fitur; jangan menambahkan ORM kedua atau menyebarkan query database ke komponen UI.
- SQL mentah hanya boleh berada di lapisan backend yang tepat bila ekspresi Drizzle tidak cukup; gunakan parameter/binding, bukan interpolasi input pengguna.
- Schema Drizzle adalah sumber model database. Pertahankan foreign key, unique/check constraint, index, nullability, default, dan relasi yang mencerminkan aturan domain. Rancang index berdasarkan filter, sort, dan join yang benar-benar dipakai.
- Pisahkan aturan domain, akses persistence, dan transport HTTP sesuai pola fitur yang ada. API server harus mengotorisasi actor dari session; jangan menerima role/user ID dari klien sebagai bukti kewenangan.
- Simpan snapshot/nama yang diperlukan agar riwayat laporan tetap dapat dibaca bila nama master berubah. Nonaktifkan master bila aturan domain meminta mempertahankan histori; jangan menghapus data historis untuk menyembunyikannya.
- Operasi yang menyentuh katalog dan laporan harus memvalidasi ulang master aktif serta relasinya saat submit, bukan hanya percaya pilihan UI.
- Tambahkan tes domain dan tes database untuk aturan bisnis, batas role, data tidak valid, konflik serentak, dan efek transaksi yang relevan. Fixture tes harus terisolasi dan hanya membersihkan data yang dibuat tes itu.
- Dokumentasi alur fitur operasional saat ini berada di `OPERATIONS.md`; perbarui bila perilaku, aturan data, atau instruksi operasional berubah.

## Autentikasi dan otorisasi: Better Auth wajib

- **Better Auth adalah engine autentikasi proyek** dan terintegrasi dengan Drizzle. Jangan membuat sistem password/session/token sendiri atau melakukan query password dari UI.
- Baca konfigurasi di `src/lib/auth` dan skema auth di `src/db` sebelum mengubah alur login, session, akun, role, atau provider. Perubahan auth/provider memerlukan evaluasi schema, migration, environment, callback/origin, tes, dan deployment bersama.
- Role internal (`pelapor`, `satpam`, `teknisi`, `manajemen`) dan status aktif bersumber dari database aplikasi, bukan dari nilai browser atau klaim provider. Periksa role dan status terkini di server pada setiap akses sensitif.
- Pendaftaran publik email/password saat ini dinonaktifkan. Jangan mengaktifkannya atau mengubah siapa yang dapat menetapkan role tanpa permintaan dan desain otorisasi eksplisit.
- Password email/password saat ini harus 12–128 karakter. Password di-hash melalui Better Auth; jangan menyimpan atau mengirimkannya dalam bentuk teks setelah input.
- `BETTER_AUTH_SECRET` adalah secret server runtime dan wajib minimal 32 karakter. `BETTER_AUTH_URL` harus origin HTTP(S) yang tepat, tanpa path/query/fragment; production wajib HTTPS. Hostname dan port browser harus cocok persis dengan URL auth agar cookie/origin tidak salah.
- Provider Google Workspace belum dikonfigurasi saat ini. Jangan mengklaim SSO aktif atau menaruh kredensial OAuth di client. Bila provider ditambahkan, rahasia OAuth hanya di server dan role aplikasi tetap dikelola database.
- Perubahan role/status harus mempertimbangkan pencabutan session, aturan agar pengelola aktif terakhir tidak terkunci, pemeriksaan origin, audit tanpa kredensial, dan perlindungan update bersamaan.

## Database: PostgreSQL di Docker wajib

**Database utama proyek adalah PostgreSQL dan standar lingkungan tim menjalankannya di Docker melalui service `db` pada Docker Compose.** Drizzle ORM mengakses PostgreSQL tersebut; Better Auth menyimpan data autentikasi pada database yang sama melalui adapter Drizzle. Seluruh pengembangan backend, schema, migration, relasi, index, dan query wajib mengikuti stack ini.

- Konfigurasi database bersumber dari `compose.yaml`; image saat ini adalah `postgres:18-bookworm`. Jangan mengganti engine database, dialect Drizzle, atau versi mayor PostgreSQL tanpa perubahan arsitektur dan rencana migrasi data yang disepakati.
- PostgreSQL berjalan dalam container terpisah dari `app` dan `migrate`. Di jaringan Compose, keduanya memakai hostname `db` dan port `5432`; `localhost` di dalam container menunjuk container itu sendiri, bukan container PostgreSQL.
- Tool yang berjalan di laptop, termasuk Drizzle Studio, memakai alamat host `127.0.0.1` dan `DB_PORT` yang dipublikasikan oleh `compose.dev.yaml`. App yang dijalankan lewat Next.js lokal juga tetap dapat memakai PostgreSQL di Docker dengan konfigurasi koneksi host yang sesuai.
- Data PostgreSQL disimpan dalam named volume `postgres_data`. Pull repo, rebuild image, atau recreate container tidak menyinkronkan isi database antar laptop; setiap lingkungan memiliki data sendiri dan diperbarui melalui migration yang sama.
- Gunakan kredensial aplikasi untuk runtime dan kredensial pemilik database untuk migration. Jangan hardcode connection string atau password di kode; gunakan environment dan resolver koneksi bersama di `src/db/environment.ts`.
- Semua petunjuk setup tim harus mencantumkan PostgreSQL di Docker, konfigurasi environment, serta urutan `db` sehat → `migrate` berhasil → `app` berjalan. Jika memakai lingkungan database khusus yang disepakati, dokumentasikan perbedaannya agar tim tidak mengira koneksi tersebut memakai database Compose lokal.

## Database: migration dan seed

### Migration

Migration adalah sejarah perubahan schema/data yang dibagikan dan menjadi sumber kebenaran saat database baru atau database tim diperbarui. Perubahan schema tidak boleh hanya dilakukan manual di database.

Alur standar:

1. Ubah model Drizzle yang relevan di `src/db`.
2. Buat migration bernama jelas dengan `npm run db:generate -- --name=nama_perubahan`.
3. Tinjau SQL hasil generate, journal/snapshot Drizzle, urutan perubahan, dampak pada data lama, constraint, index, default, dan kompatibilitas deployment. Edit hasil generate hanya sebelum migration dibagikan/diterapkan jika perlu; jangan menyamarkan perubahan schema yang tidak tercatat.
4. Terapkan secara lokal dengan `npm run db:migrate`, lalu jalankan `npm run db:check` dan tes terkait. Di Compose, service `migrate` menerapkannya sebelum `app` berjalan.
5. Sertakan file migration dan metadata Drizzle dalam commit. Migration baru harus kompatibel dengan urutan yang ada dan database yang telah menjalankan migration sebelumnya.

Aturan keselamatan:

- Jangan menghapus, mengganti nama, atau menulis ulang migration yang mungkin sudah dijalankan anggota tim atau deployment. Buat migration baru untuk koreksi.
- Jangan memakai `drizzle-kit push` untuk database bersama, database yang perlu dipulihkan, atau production. Gunakan migration yang ditinjau dan tercatat.
- Buat perubahan data eksplisit dan aman bagi data lama. Hindari operasi destruktif; bila berisiko, rencanakan backfill bertahap, waktu pemasangan constraint, backup, dan mitigasi.
- Gunakan migration untuk evolusi schema, relasi, index, dan backfill wajib bagi kompatibilitas versi aplikasi. Migration harus aman diterapkan melalui journal Drizzle.
- Migration `0008` adalah **migration**, bukan seed. Ia menambah relasi Area/Lantai dan pemetaan awal fasilitas untuk katalog lama sebagai template yang perlu diverifikasi Management; itu bukan inventaris kondisi fisik.
- `db:migrate` tidak membuat akun demo. Di Docker, migrator berjalan otomatis sebelum app dan selesai dengan exit code sukses; container `migrate` yang berhenti setelah itu adalah perilaku normal.

### Seed dan data awal

- Seed adalah pengisian fixture/data contoh yang terpisah dari migration. Seed tidak menggantikan migration dan tidak otomatis dijalankan saat build atau startup.
- `npm run db:seed` hanya untuk development, memerlukan `NODE_ENV=development` dan `DEMO_USER_PASSWORD` 12–128 karakter. Seed akun demo bersifat idempotent, memeriksa kecocokan fixture, tidak menimpa password/kredensial yang sudah ada, dan dapat menambah contoh petugas Satpam.
- `npm run db:seed-officers` hanya menambah contoh data petugas pada development; tidak membuat akun login.
- Jangan menjalankan seed demo di production, jangan memakai seed untuk reset password, dan jangan menganggap seed memperbarui akun yang sudah ada.
- Tentukan tempat data awal dengan sengaja: backfill atau data wajib untuk transformasi versi database masuk ke migration; fixture/demo/testing opsional masuk ke seed development; data katalog yang dikelola pengguna tidak boleh diam-diam di-reset oleh seed.
- Untuk Area/Lantai, Ruangan, Fasilitas, dan relasinya, periksa migration yang berlaku pada database tersebut. Migration `0008` membuat Area/Lantai serta template pemetaan bagi katalog lokasi lama; ia bukan verifikasi kondisi kampus dan tidak menyinkronkan perubahan katalog lokal antar laptop.
- Jika migration gagal, hentikan app/deployment dan periksa log serta status database. Jangan menghapus volume untuk “memperbaiki” migration tanpa keputusan eksplisit dan backup.

Perintah database tersedia di `package.json`: `db:generate`, `db:migrate`, `db:check`, `db:seed`, `db:seed-officers`, dan `db:studio`. Drizzle Studio dapat membaca dan mengubah database sesuai kredensial koneksi yang dipakai; gunakan hanya pada database yang ingin diperiksa dan perlakukan akses tulisnya dengan hati-hati.

## Docker: alur development dan operasional

### Prasyarat dan konfigurasi

- Docker Engine harus berjalan. Di Windows, gunakan backend Windows/WSL yang didukung instalasi Docker. Setup Docker host dilakukan satu kali. Menjalankan app di container tidak mengharuskan Node.js terpasang di host.
- Buat `.env` lokal berdasarkan `.env.example` lalu gunakan password/secret development yang sesuai. File `.env` dan `.env.production` tidak boleh masuk Git.
- Bedakan kredensial pemilik database untuk migration (`POSTGRES_USER`/`POSTGRES_PASSWORD`) dari kredensial aplikasi runtime (`APP_DB_USER`/`APP_DB_PASSWORD`). Container app memakai user aplikasi dengan hak terbatas; jangan mengubahnya menjadi user migration sebagai jalan pintas.
- `BETTER_AUTH_URL` harus sama persis dengan origin browser, termasuk port dan pilihan `localhost` atau `127.0.0.1`. `APP_PORT` adalah port app di host; port container tetap 3000. Database hanya dipublikasikan ke loopback pada port `DB_PORT` untuk development.
- Jangan mengirim `.env` berisi secret melalui chat, commit, screenshot, atau file publik. Untuk production siapkan `.env.production` dengan password kuat unik, secret auth unik, URL HTTPS, dan konfigurasi storage/backup yang sesuai.

### Jalankan development

Perintah utama dari root repository:

    npm run docker:dev

Perintah Compose yang ekuivalen:

    docker compose -f compose.yaml -f compose.dev.yaml up --build --watch

Alur startup:

1. Docker membangun image berbasis Node 24 dan menjalankan `npm ci` di dalam image. Perintah Compose langsung di atas dapat dipakai tanpa Node/npm di host. Jika menggunakan shortcut `npm run docker:dev`, Node/npm harus tersedia di host untuk menjalankan script tersebut; dependency aplikasi tetap dipasang di image Docker.
2. Service `db` menyiapkan PostgreSQL dan volume bernama untuk menyimpan data.
3. Service `migrate` menunggu database sehat lalu menjalankan migration dengan kredensial migration.
4. Service `app` baru berjalan setelah migration berhasil, dengan kredensial aplikasi dan Better Auth runtime config.
5. Watch mode menyinkronkan perubahan `src`/`public`; perubahan dependency dan konfigurasi tertentu memicu rebuild. Jika file di luar daftar watch berubah, evaluasi apakah rebuild/restart diperlukan.

Perintah bantu:

- `npm run docker:down` menghentikan stack development dan mempertahankan volume database serta lampiran.
- `docker compose -f compose.yaml -f compose.dev.yaml ps` melihat status service.
- `docker compose -f compose.yaml -f compose.dev.yaml logs -f db migrate app` melihat log database, migration, dan app.
- Setelah pull perubahan repo, jalankan `npm run docker:dev` kembali. Compose membangun ulang image yang perlu dan mengganti container yang konfigurasinya berubah; `--force-recreate` bukan langkah rutin.
- Perubahan environment, port, kredensial, atau konfigurasi Compose perlu tercermin di container baru. Perubahan password environment tidak otomatis mengubah role/password PostgreSQL pada volume lama; init script hanya berlaku ketika volume database pertama kali dibuat. Jangan menyimpulkan masalah Better Auth dari password database atau menghapus volume tanpa memastikan data boleh dibuang.
- Jika login/sign-out bermasalah, periksa origin/port browser, nilai `BETTER_AUTH_URL`, log app, session/cookie pada origin tersebut, dan apakah container menerima konfigurasi terbaru. Jangan menjadikan `--force-recreate` atau penghapusan volume sebagai solusi awal.

### Volume, data, dan image

- `postgres_data` menyimpan database; `report_uploads` menyimpan lampiran. Menghentikan atau membuat ulang container tidak sama dengan menghapus volume.
- **Jangan menjalankan `docker compose down -v` sebagai langkah rutin.** Opsi `-v` menghapus volume beserta database/lampiran dan dapat menghilangkan data lokal. Lakukan hanya atas permintaan eksplisit setelah memastikan target dan backup/pembuangan data memang diinginkan.
- Image migration dapat besar karena berisi runtime Node, source/schema/migration, dan dependencies Drizzle. Service migrator umumnya berjalan sampai migration selesai lalu exit sukses; app tetap hidup di service terpisah.
- `npm ci` di Docker memasang dependency dari lockfile untuk image/container. Jangan bind-mount `node_modules` Windows ke container Linux.
- Tidak perlu menambahkan `--force-recreate` hanya agar perubahan kode terambil. Gunakan rebuild Compose normal; bila perubahan spesifik belum dipakai, identifikasi service/config/image yang stale sebelum memilih tindakan tambahan.

### Production

- Compose production dijalankan dengan `npm run docker:prod`; isi `.env.production` harus disiapkan secara aman lebih dahulu.
- Production tetap menjalankan migration sebelum app. **Jangan jalankan seed development di production.**
- Database tidak dipublikasikan ke port host pada konfigurasi production; app dipublikasikan ke loopback untuk dipasang di belakang reverse proxy/TLS sesuai infrastruktur.
- Volume Docker bukan strategi backup. Siapkan backup database dan lampiran, uji pemulihan, HTTPS, secret management, logging, monitoring, dan prosedur upgrade sebelum penggunaan publik/production.
- Konfigurasi Compose saat ini bukan bukti bahwa semua kebutuhan deployment production terpenuhi. Tinjau hosting, domain, provider auth, storage, backup, dan keamanan secara terpisah.

## Pemeriksaan sebelum menyerahkan perubahan

- Pastikan implementasi sesuai cakupan dan pola repository; tinjau `git diff` untuk mendeteksi file/konfigurasi yang tidak terkait.
- Untuk frontend, jalankan pemeriksaan statis yang sesuai—biasanya `npm run lint`, `npm run typecheck`, dan `npm run build`. Jangan memakai preview/browser automation/Playwright; QA visual dilakukan manual oleh pengguna.
- Untuk backend/database, jalankan tes domain dan database terkait. Tes database lokal hanya boleh memakai database development yang jelas; jangan arahkan tes ke production.
- Jika mengubah schema, sertakan migration baru dan catat cara migrasi. Jika mengubah setup/operasi, perbarui README, `OPERATIONS.md`, atau panduan ini sesuai kebutuhan.
- Laporkan pemeriksaan yang berhasil, gagal, tidak dijalankan, serta langkah manual yang masih diperlukan. Jangan menyatakan sukses bila pemeriksaan belum dilakukan.

## Aturan yang diwarisi dari AGENTS.md

Aturan berikut disalin dari AGENTS.md agar tersedia juga dalam satu panduan onboarding. Jika aturan diperbarui, sinkronkan kedua dokumen.

## Wajib!! semua iterasi/proses development frentend HARUS menggunakan skills di @.agent/skills/design-taste-frontend, yang memastikan desain dan tata letak yang konsisten dengan standar ShadCN dan SEMUA komponent WAJIB pakai Shadcn.

## Shadcn Primitive Customization
- Shadcn primitives in `src/components/ui` MAY be edited when a shared visual, interaction, accessibility, or responsive behavior requires it.
- A primitive change applies to every component that consumes it; assess that shared impact before editing and preserve the primitive API unless a clean migration of all callers is part of the change.
- The user-provided context, visual references, and explicit constraints define the scope and take precedence over generic Shadcn defaults.
- Keep changes aligned with the existing Shadcn design system, semantic HTML, keyboard behavior, focus states, and accessibility requirements.

## Helper Text Standard
- Helper text (supporting text below a form field that explains context, input rules, or an example) MUST use the shared Shadcn `FieldDescription` primitive.
- `FieldDescription` MUST use `text-xs` (12px) with muted semantic color and comfortable leading. Do not recreate helper text using arbitrary local font-size classes.
- This rule applies to field-level helper text only. Page, card, and modal descriptions retain their own hierarchy and must not be reduced solely to match field helper text.

## KPI Card Standard
- KPI cards MUST use a layered Shadcn `Card` composition: an outer `bg-sidebar` wrapper and an inner `bg-card` content surface.
- Outer card styling: `border border-border rounded-2xl p-1.5 flex flex-col justify-between overflow-hidden shadow-xs`.
- Inner card styling: `border border-border/60 rounded-xl p-4 space-y-3 shadow-2xs`.
- Main metric MUST use a semantic Lucide icon inside a `size-10 rounded-xl bg-background border border-border` badge, followed by a muted label and prominent value.
- Sub-information is conditional. When provided, it MUST include a `border-t border-border/60` divider, muted status label, indicator dot, and semantic status value.
- Footer action MUST remain outside the inner card, use `px-3 py-2`, and use a subtle `ArrowRight` affordance.
- KPI colors MUST use theme tokens or restrained semantic utility colors; arbitrary hex colors are prohibited.
- This standard applies across dashboard roles; role-specific data may vary, but the visual composition remains consistent.

### Dashboard KPI Implementation Rule
- Every dashboard KPI MUST use the reusable `KpiCard` composition so sizing, spacing, icon treatment, and responsive behavior stay consistent across roles.
- The outer layer MUST include a bottom affordance labeled `Detail` with a subtle `ArrowRight`; use a link when a detail route exists and a non-interactive footer while the route is still pending.
- Role-specific dashboards MUST not recreate KPI card markup locally or introduce a different footer label/style.

## Report Detail Modal Standard
- `ReportDetailDialog` in `src/features/lost-found/components/satpam-lost-found-workspace.tsx` is the single source of truth for every operational report-detail modal.
- Modal headers MUST use the compact metadata row: semantic icon, report category, ticket number, and status badge. Follow it with a prominent title and one concise update description. Do not use card-like headers or duplicate summary grids.
- The body order MUST be: progress stepper, status action panel, report details, attachments, then status history. Use existing Shadcn primitives for every part.
- The status action panel MUST use the muted bordered treatment with the primary action below explanatory copy. Terminal actions may open a nested confirmation form when a note is required.
- Report details MUST use one or more `overflow-hidden rounded-xl border` definition-list tables with shared cell borders. Each field label pairs a semantic Lucide icon with a concise sublabel. Do not replace this structure with separate metric cards.
- Section headers for details and attachments MUST pair a semantic icon badge with a title and supportive subtext. Attachments use the dashed empty-state treatment, and status history uses compact bordered entries.
- Role-specific data and lifecycle labels may differ, but the visual hierarchy, spacing, borders, and interaction pattern must remain aligned with this standard.

## Icon Selection Priority
- Use Lucide icons that are semantically specific to the feature or action whenever a suitable icon exists.
- Prefer expressive, context-appropriate variants over repeatedly using generic icons such as `LayoutDashboard`, `FileText`, `Users`, or `Settings`.
- Keep icon selection visually varied across navigation sections while preserving Lucide's consistent stroke style.
- Use a generic icon only when no sufficiently specific Lucide icon is available or when the generic icon is clearer for the user.
- Confirm icon names and availability in the installed `lucide-react` package before implementation.

## Validasi Frontend
- Jangan menjalankan Preview Mode, browser automation, atau Playwright untuk validasi visual maupun interaksi.
- Pengujian visual dan interaksi dilakukan manual oleh pengguna.
- Tetap jalankan validasi statis yang relevan, seperti lint, type check, build, dan pemeriksaan format/diff, kecuali pengguna meminta untuk tidak melakukannya.
