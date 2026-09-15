export type NotificationKind = "status" | "response"

export type NotificationItem = {
  id: string
  kind: NotificationKind
  title: string
  description: string
  ticketNumber: string
  reportTitle: string
  createdAt: string
  group: "Hari ini" | "Kemarin" | "Sebelumnya"
  read: boolean
}
