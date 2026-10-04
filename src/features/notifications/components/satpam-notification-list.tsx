import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import type { NotificationItem } from "../types"

export function SatpamNotificationList({ items, unread }: { items: NotificationItem[]; unread: number }) {
  return <NotificationList initialItems={items} initialUnread={unread} persistRead apiEndpoint="/api/satpam/notifications" detailHref="/satpam/kehilangan-temuan" />
}
