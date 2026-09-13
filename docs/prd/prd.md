# 📄 Product Requirement Document (PRD) — Lapor JTI

## 1\. Ringkasan Produk & Tujuan

**Lapor JTI** adalah aplikasi pelaporan internal Jurusan Teknologi Informasi (JTI) POLIJE. Aplikasi ini bertujuan menyediakan sarana penanganan laporan terpusat berbasis tiket untuk masalah Kehilangan & Temuan, Fasilitas, Layanan, dan Laporan Umum internal kampus.

## 2\. Autentikasi & Integrasi SSO

-   **Metode Autentikasi:** SSO POLIJE (Single Sign-On). Tidak ada registrasi/pendaftaran akun lokal secara mandiri.
-   **Mekanisme Login:** Menggunakan tombol tunggal _"Login dengan SSO POLIJE"_.
-   **Atribut Pengguna dari SSO:**
    
    -   Nama Lengkap
    -   NIP / NIDN / NIDK / NIM
    -   Email POLIJE
    -   Username
    -   Unit / Jurusan / Program Studi
    -   Status Pengguna
-   **Manajemen Role:** Role tidak dipilih oleh pengguna saat login, melainkan ditentukan oleh Administrator Sistem atau sinkronisasi pemetaan role dari SSO POLIJE.

## 3\. Matriks Role & Hak Akses Sistem

| Modul / Fitur | Pelapor | Satpam | Teknisi | Manajemen Jurusan | Admin Sistem |
| --- | --- | --- | --- | --- | --- |
| **Dashboard** | View | View | View | View | View |
| **Buat Laporan** | Create | Create | Create | Create | \\- |
| **Kehilangan & Temuan** | View (Milik Sendiri) | Manage | \\- | \\- | Config |
| **Laporan Fasilitas** | View (Milik Sendiri) | \\- | Manage | \\- | Config |
| **Laporan Layanan** | View (Milik Sendiri) | \\- | \\- | Manage | Config |
| **Laporan Lainnya** | View (Milik Sendiri) | \\- | \\- | Manage | Config |
| **Kelola Laporan** | \\- | Manage | Manage | Manage | \\- |
| **Monitoring** | \\- | View | View | View | View |
| **Statistik** | \\- | \\- | \\- | View | View |
| **Rekap Laporan** | \\- | Export | Export | Export | Export |
| **Manajemen Pengguna & Role** | \\- | \\- | \\- | \\- | Manage |
| **Kategori & Lokasi/Ruangan** | \\- | \\- | \\- | \\- | Manage |
| **Log Aktivitas** | \\- | \\- | \\- | \\- | View |

## 4\. Alur Kerja & Status Tiket (Flow & Lifecycle)

### A. Alur Umum (End-to-End Flow)

1.  **Pengguna** Login via SSO POLIJE.
2.  **Sistem** membaca identitas & menetapkan Role.
3.  **Pengguna** membuat Laporan berdasarkan Kategori (Kehilangan & Temuan / Fasilitas / Layanan / Lainnya).
4.  **Sistem** memunculkan Nomor Tiket unik dan mengarahkan laporan otomatis ke **Pengelola** yang sesuai.
5.  **Pengelola** melakukan Verifikasi ➔ Memproses ➔ Menyelesaikan laporan.
6.  **Pelapor** menerima notifikasi & memantau perubahan status hingga Selesai.

### B. Lifecycle Status Laporan per Kategori

1.  **Kategori Kehilangan & Temuan (Pengelola: Satpam)**
    
    -   `Baru` ➔ `Diverifikasi` ➔ `Diproses` ➔ `Ditemukan / Barang Teridentifikasi` ➔ `Diserahkan` ➔ `Selesai`
    -   _Status Opsional:_ `Ditolak` (jika laporan tidak valid).
2.  **Kategori Laporan Fasilitas (Pengelola: Teknisi)**
    
    -   `Baru` ➔ `Diverifikasi` ➔ `Diproses` ➔ `Selesai`
    -   _Catatan Aturan:_ Status "Menunggu t" **TIDAK** digunakan.
3.  **Kategori Laporan Layanan & Lainnya (Pengelola: Manajemen Jurusan)**
    
    -   `Baru` ➔ `Sedang Diproses` ➔ `Selesai`

## 5\. Ringkasan Struktur Menu & Peta Halaman per Role

### 1\. Role Pelapor _(Mahasiswa, Dosen, Tendik, Internal JTI)_

-   **Dashboard:** Ringkasan laporan aktif, status tiket terbaru, dan pintasan buat laporan.
-   **Buat Laporan:** Form input laporan dengan sub-kategori:
    
    -   Kehilangan & Temuan
    -   Laporan Fasilitas
    -   Laporan Layanan
    -   Laporan Lainnya
-   **Laporan Saya:** Daftar seluruh riwayat laporan milik pribadi + detail progress nomor tiket.
-   **Notifikasi:** Daftar pemberitahuan update status laporan.
-   **Profil:** Tampilan data diri hasil sinkronisasi SSO POLIJE.

### 2\. Role Satpam _(Pengelola Kehilangan & Temuan)_

-   **Dashboard:** Ringkasan statistik barang hilang, temuan baru, dan barang siap diserahkan.
-   **Kehilangan & Temuan:**
    
    -   Daftar Laporan Kehilangan
    -   Daftar Laporan Temuan
    -   **Pencocokan Barang:** Antarmuka khusus membandingkan ciri-ciri barang hilang vs temuan.
-   **Riwayat:** Arsip penyerahan barang yang sudah selesai.
-   **Notifikasi & Profil**

### 3\. Role Teknisi _(Pengelola Fasilitas)_

-   **Dashboard:** Ringkasan total kerusakan fasilitas, antrean perbaikan, dan tugas hari ini.
-   **Laporan Fasilitas:** Manajemen laporan terbagi berdasarkan tab/filter status: `Baru`, `Diverifikasi`, `Sedang Diproses`, dan `Selesai`.
-   **Riwayat Perbaikan:** Arsip histori pekerjaan perbaikan fasilitas yang telah ditangani.
-   **Notifikasi & Profil**

### 4\. Role Manajemen Jurusan _(Pengelola Layanan, Monitoring & Rekap)_

-   **Dashboard:** Overview performa penanganan seluruh laporan JTI.
-   **Laporan Layanan:** Manajemen laporan layanan internal (Sub-status: `Baru`, `Sedang Diproses`, `Selesai`).
-   **Laporan Lainnya:** Manajemen laporan kategori umum (Sub-status: `Baru`, `Sedang Diproses`, `Selesai`).
-   **Monitoring:** Pengawasan laporan yang difilter Berdasarkan Kategori, Status, dan Periode.
-   **Statistik:** Visualisasi grafik tren permasalahan di JTI.
-   **Rekap Laporan:** Fitur ekspor laporan operasional.
-   **Notifikasi & Profil**

### 5\. Role Admin Sistem _(Administrator & Konfigurasi)_

-   **Dashboard:** Summary kesehatan sistem, total pengguna aktif, dan statistik server/log.
-   **Pengguna:** Daftar dan pencarian data pengguna terdaftar SSO.
-   **Role & Hak Akses:** Pengaturan otorisasi hak akses tiap akun.
-   **Kategori Laporan:** Pengaturan master kategori & penentuan role penanggung jawab.
-   **Lokasi:** Pengaturan master data lokasi tempat kejadian/masalah:
    
    -   Gedung
    -   Ruangan (Ruang 3.1 – 3.12, Lab)
    -   Area (Working Space Lantai 1 – 4)
-   **Pengaturan Sistem:** Konfigurasi umum aplikasi.
-   **Log Aktivitas:** Catatan audit trail tindakan pengguna di dalam sistem.
-   **Profil**

## 6\. Referensi Data & Parameter Default Sistem

### A. Lokasi Default

-   **Ruangan:** `3.1` sampai `3.12`, `Lab` (sesuai data website JTI).
-   **Fasilitas Default Per Ruangan:** `AC`, `LCD`, `TV`, `Lampu`, `Meja`, `Kursi`, `Lainnya`.
-   **Working Space:** `Lantai 1`, `Lantai 2`, `Lantai 3`, `Lantai 4`.

### B. Cakupan Layanan JTI

-   **Layanan Web Internal:** JTI Surat, JTI Ruang Baca, JTI Evaluasi Pembelajaran (JTIFORM), JTI E-Learning (SLEARN).
-   **Layanan Program Studi:** Prodi TIF, MIF, TKK, TRK, TRPL, Magister, TIF Nganjuk, TIF Sidoarjo.
-   **Layanan Operasional:** Administrasi, Keamanan, Kebersihan.