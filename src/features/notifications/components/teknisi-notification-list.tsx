import { NotificationList } from "@/features/notifications/components/pelapor-notification-list"
import { technicianNotifications } from "@/features/notifications/mock/teknisi-notifications"

export function TeknisiNotificationList() {
  return <NotificationList initialItems={technicianNotifications} detailHref="/teknisi/laporan-fasilitas" />
}
