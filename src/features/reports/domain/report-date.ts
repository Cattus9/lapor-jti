// WIB is UTC+7 year-round. This calendar date is independent of the host timezone.
export function getTodayInWib(now = new Date()): string {
  return new Date(now.getTime() + 7 * 3_600_000).toISOString().slice(0, 10)
}

// DayPicker without a timeZone prop represents calendar cells in local time.
// Preserve that date label instead of converting local midnight into a UTC day.
export function formatCalendarDate(date: Date): string {
  return `${String(date.getFullYear()).padStart(4, "0")}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
}
