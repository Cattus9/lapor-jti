// Fixed operational taxonomy. Keep seeded labels stable; categories are not CRUD data.
export const facilityCategories = [
  "Perangkat", "Furnitur", "Sanitasi", "Kelistrikan", "Bangunan",
  "Jaringan & Komunikasi", "Keamanan", "Kebersihan", "Umum",
] as const

export type FacilityCategory = typeof facilityCategories[number]

export function isFacilityCategory(value: unknown): value is FacilityCategory {
  return typeof value === "string" && facilityCategories.some((category) => category === value)
}
