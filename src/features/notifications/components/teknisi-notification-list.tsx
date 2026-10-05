import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import type { TechnicianNotifications } from "@/features/facilities/types"

export function TeknisiNotificationList({ data }: { data: TechnicianNotifications }) {
  return <NotificationList initialItems={data.items} initialUnread={data.unread} initialNextCursor={data.nextCursor} persistRead apiEndpoint="/api/teknisi/notifications" detailHref="/teknisi/laporan-fasilitas" />
}
