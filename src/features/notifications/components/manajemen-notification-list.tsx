import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import type { ManagementNotifications } from "@/features/management/types"

export function ManagementNotificationList({ data }: { data: ManagementNotifications }) {
  return <NotificationList initialItems={data.items} initialUnread={data.unread} initialNextCursor={data.nextCursor} persistRead apiEndpoint="/api/manajemen/notifications" detailHref="/manajemen/laporan" />
}
