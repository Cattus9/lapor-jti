import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import { managementNotifications } from "@/features/notifications/mock/manajemen-notifications"

export function ManagementNotificationList() {
  return <NotificationList initialItems={managementNotifications} detailHref="/manajemen/monitoring" />
}
