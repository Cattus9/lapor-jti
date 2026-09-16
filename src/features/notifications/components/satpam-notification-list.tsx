import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import { satpamNotifications } from "@/features/notifications/mock/satpam-notifications"

export function SatpamNotificationList() {
  return <NotificationList initialItems={satpamNotifications} detailHref="/satpam/kehilangan-temuan" />
}
