# Pengaturan Operasional dan Kelola Pengguna

Menu Manajemen:

- `/manajemen/pengaturan`: halaman panjang dengan navigasi per bagian, pencarian, filter, dan pagination enam baris per bagian. Kelola Petugas Satpam, Area/Lantai, Ruangan/Lokasi, Fasilitas, dan Layanan. Dialog lokasi menyimpan pemetaan fasilitas bersama lokasi dalam satu transaksi.
- `/manajemen/pengguna`: pencarian dan pagination server (12 akun), tambah akun, ubah identitas/peran, aktif/nonaktif. Tidak menyediakan akses admin, hapus akun, ganti email login, reset password, atau koreksi tiket teknis.

## Pemakaian oleh Pelapor

Form fasilitas memilih area/lantai, kemudian lokasi dalam area tersebut, lalu checkbox fasilitas yang dipetakan. Pencarian lokasi dibatasi pada area terpilih. Area luar tidak memerlukan lantai. Mengganti lokasi menghapus pilihan fasilitas sebelumnya dengan umpan balik. `Lainnya` tetap tersedia untuk lokasi/objek belum terdaftar. Pada lokasi lainnya, seluruh jenis fasilitas aktif boleh dipilih karena lokasi belum memiliki katalog sendiri.

Katalog lokasi, fasilitas, serta layanan dibaca dari database, bukan daftar statis frontend. Program studi masih referensi tetap. Backend memvalidasi ulang katalog aktif dan pemetaan pada pengiriman, termasuk area yang dinonaktifkan. Draft lama dapat disimpan meskipun pilihan katalognya berubah; pengguna harus memperbaiki pilihan sebelum mengirim.

## Data dan migrasi

Migrasi `0008` menambah `location_areas`, relasi many-to-many `location_facility_objects`, revision master, dan `operational_audit`. `0009` menambah index daftar/peran/status akun. ID master tetap stabil. Tidak ada penghapusan master atau akun dari UI.

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
