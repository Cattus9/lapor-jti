import type { TechnicianRoomPriority } from "@/features/facilities/types"

const SUMMARY_ROOM_LIMIT = 5

/** Limit the displayed ranking, not the totals used by the dashboard chart. */
export function getTechnicianPrioritySummary(rooms: TechnicianRoomPriority[]) {
  const activeRooms = rooms.filter((room) => room.activeReports > 0).sort((left, right) =>
    right.activeReports - left.activeReports || left.room.localeCompare(right.room, "id") || left.id.localeCompare(right.id),
  )
  const topRooms = activeRooms.slice(0, SUMMARY_ROOM_LIMIT)
  const remaining = activeRooms.slice(SUMMARY_ROOM_LIMIT)

  return {
    topRooms,
    totalRooms: activeRooms.length,
    totalActiveReports: activeRooms.reduce((total, room) => total + room.activeReports, 0),
    remainingRooms: remaining.length,
    remainingActiveReports: remaining.reduce((total, room) => total + room.activeReports, 0),
  }
}
