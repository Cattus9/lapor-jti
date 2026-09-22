# LaporJTI

Portal pelaporan internal untuk Jurusan Teknologi Informasi (JTI) POLIJE. LaporJTI menyatukan pelaporan Kehilangan & Temuan, fasilitas, layanan internal, dan laporan umum ke dalam alur berbasis tiket yang dapat dipantau oleh pelapor dan ditangani oleh pengelola yang tepat.

> Status: frontend MVP. Antarmuka, alur per role, dan data demonstrasi telah tersedia. Integrasi SSO POLIJE, basis data, notifikasi persisten, serta ekspor nyata masih menjadi pekerjaan backend berikutnya.

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

Role Admin tidak dibangun sebagai modul terpisah. Manajemen Jurusan menjadi hierarki operasional tertinggi pada MVP ini; pemetaan identitas dan role direncanakan melalui SSO POLIJE.

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

## Struktur proyek

```text
src/
├── app/
│   ├── (auth)/login/             # Halaman autentikasi demonstrasi
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
└── lib/
    └── auth/                     # Sesi dan role dummy untuk MVP
```

## Menjalankan proyek secara lokal

### Prasyarat

- Node.js 20 atau lebih baru
- npm

### Instalasi

```bash
git clone https://github.com/Cattus9/lapor-jti.git
cd lapor-jti
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000). Aplikasi akan mengarahkan pengguna ke halaman login.

### Akun demonstrasi

Masukkan salah satu email berikut pada halaman login. Tidak ada password pada implementasi demonstrasi saat ini.

| Role | Email dummy |
| --- | --- |
| Pelapor | `pelapor@gmail.com` |
| Satpam | `satpam@gmail.com` |
| Teknisi | `teknisi@gmail.com` |
| Manajemen Jurusan | `manajemen@gmail.com` |

## Perintah yang tersedia

```bash
npm run dev      # Menjalankan server pengembangan
npm run lint     # Memeriksa aturan ESLint
npx tsc --noEmit # Memeriksa tipe TypeScript
npm run build    # Membuat production build
npm run start    # Menjalankan production build
```

## Batasan MVP

- Data laporan, status, statistik, dan notifikasi masih menggunakan data demonstrasi di sisi frontend.
- Login memakai sesi cookie dummy; belum terhubung ke SSO POLIJE.
- Aturan otorisasi route bersifat demonstratif dan belum menggantikan policy backend.
- Ekspor rekap belum menghasilkan berkas operasional nyata.
- Agregasi prioritas fasilitas menunjukkan konsentrasi laporan aktif, bukan penilaian bahaya atau risiko teknis.

## Arah pengembangan berikutnya

1. Integrasi SSO POLIJE dan pemetaan role dari sumber identitas resmi.
2. Backend tiket, basis data, status history, dan policy akses per role.
3. Notifikasi persisten untuk perubahan status dan tindakan pengelola.
4. Lampiran berkas, ekspor rekap, serta audit aktivitas.
5. Pengujian end-to-end untuk lifecycle masing-masing kategori laporan.

## Kontribusi

Gunakan branch terpisah untuk setiap perubahan, jalankan lint dan type check sebelum membuat pull request, serta pertahankan komponen UI berbasis Shadcn agar pengalaman antar-role tetap konsisten.

---

LaporJTI dikembangkan sebagai proyek portal pelaporan internal Jurusan Teknologi Informasi POLIJE.
