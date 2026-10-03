// Initial campus reference data. Labels mirror the existing form; IDs stay stable across environments.
export const facilityLocationGroups = [
  { label: "Lantai 2", locations: ["Lab RSI", "Lab Jaringan 1", "Lab Jaringan 2", "Lab Multimedia"] },
  { label: "Lantai 3", locations: Array.from({ length: 12 }, (_, index) => `Ruang 3.${index + 1}`) },
  { label: "Lantai 4", locations: Array.from({ length: 8 }, (_, index) => `Ruang 4.${index + 1}`) },
  { label: "Area bersama", locations: ["Working Space Lantai 1", "Working Space Lantai 2", "Working Space Lantai 3", "Working Space Lantai 4", "Lobi Gedung JTI", "Koridor Gedung JTI"] },
  { label: "Sanitasi", locations: ["Toilet Lantai 2", "Toilet Lantai 3", "Toilet Lantai 4"] },
  { label: "Area luar", locations: ["Teras Gedung JTI", "Parkir JTI", "Selasar Gedung JTI", "Lainnya"] },
]
export const facilityObjectGroups = [
  { label: "Perangkat", facilities: ["AC", "LCD", "TV", "Lampu"] },
  { label: "Furnitur", facilities: ["Meja", "Kursi"] },
  { label: "Sanitasi", facilities: ["Keran air", "Wastafel", "Kloset"] },
  { label: "Lainnya", facilities: ["Lainnya"] },
]
export const serviceNames = ["JTI Surat", "JTI Ruang Baca", "JTI Evaluasi Pembelajaran", "JTI E-Learning", "Administrasi", "Keamanan", "Kebersihan"]
export const studyPrograms = ["TIF", "MIF", "TKK", "TRK", "TRPL", "Magister", "TIF Nganjuk", "TIF Sidoarjo"]
