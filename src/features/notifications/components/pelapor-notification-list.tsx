"use client"

import Link from "next/link"
import { ArrowRight, BellRing, CheckCheck, FileText, MessageSquareText, RefreshCw } from "lucide-react"
import { useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { pelaporNotifications } from "@/features/notifications/mock/notifications"
import type { NotificationItem } from "@/features/notifications/types"

const groups: NotificationItem["group"][] = ["Hari ini", "Kemarin", "Sebelumnya"]

function NotificationIcon({ kind }: { kind: NotificationItem["kind"] }) {
  const Icon = kind === "response" ? MessageSquareText : RefreshCw
  return <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary shadow-2xs"><Icon className="size-4" aria-hidden="true" /></span>
}

export function NotificationList({ initialItems, detailHref }: { initialItems: NotificationItem[]; detailHref: string }) {
  const [items, setItems] = useState(initialItems)
  const [filter, setFilter] = useState<"all" | "unread">("all")
  const unreadCount = items.filter((item) => !item.read).length
  const visibleItems = useMemo(() => filter === "unread" ? items.filter((item) => !item.read) : items, [filter, items])

  function markAllRead() {
    setItems((current) => current.map((item) => ({ ...item, read: true })))
  }

  function markRead(id: string) {
    setItems((current) => current.map((item) => item.id === id ? { ...item, read: true } : item))
  }

  return (
    <Card className="shrink-0 gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs">
      <div className="flex h-10 shrink-0 items-center gap-2 px-3 text-xs font-medium text-muted-foreground">
        <BellRing className="size-4 text-primary" aria-hidden="true" />
        <span>Pembaruan laporan</span>
      </div>
      <div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs">
        <div className="flex flex-col gap-4 border-b border-border/60 p-4 md:flex-row md:items-center md:justify-between md:p-5">
          <div>
            <p className="text-base font-semibold text-foreground">Pemberitahuan</p>
            <p className="mt-0.5 text-xs text-muted-foreground">{unreadCount ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}</p>
          </div>
          <Button type="button" variant="outline" size="sm" className="w-full bg-card md:w-auto" onClick={markAllRead} disabled={!unreadCount}><CheckCheck />Tandai semua dibaca</Button>
        </div>
        <CardContent className="p-4 md:p-5">
          <div className="mb-5 flex items-center gap-2" role="group" aria-label="Filter notifikasi">
            <Button type="button" size="sm" variant={filter === "all" ? "secondary" : "outline"} className={filter === "all" ? "" : "bg-card"} aria-pressed={filter === "all"} onClick={() => setFilter("all")}>Semua <span className="ml-0.5 text-xs text-muted-foreground">{items.length}</span></Button>
            <Button type="button" size="sm" variant={filter === "unread" ? "secondary" : "outline"} className={filter === "unread" ? "" : "bg-card"} aria-pressed={filter === "unread"} onClick={() => setFilter("unread")}>Belum dibaca <span className="ml-0.5 text-xs text-muted-foreground">{unreadCount}</span></Button>
          </div>
          <div className="space-y-6">
            {groups.map((group) => {
              const groupedItems = visibleItems.filter((item) => item.group === group)
              if (!groupedItems.length) return null
              return <section key={group} aria-labelledby={`notification-group-${group}`}><h2 id={`notification-group-${group}`} className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</h2><div className="space-y-2">{groupedItems.map((item) => <Link key={item.id} href={`${detailHref}?ticket=${item.ticketNumber}`} onClick={() => markRead(item.id)} className={`group flex items-start gap-3 rounded-xl border p-3.5 transition-colors hover:border-primary/40 hover:bg-muted/40 md:p-4 ${item.read ? "border-border/60 bg-background/40" : "border-primary/20 bg-primary/5"}`}><NotificationIcon kind={item.kind} /><div className="min-w-0 flex-1"><div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3"><p className="text-sm font-semibold text-foreground">{item.title}</p><span className="shrink-0 text-xs text-muted-foreground">{item.createdAt}</span></div><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.description}</p><div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground"><FileText className="size-3.5 text-primary" aria-hidden="true" /><span className="truncate">{item.ticketNumber} · {item.reportTitle}</span></div></div>{!item.read ? <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-label="Belum dibaca" /> : <ArrowRight className="mt-1 size-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" aria-hidden="true" />}</Link>)}</div></section>
            })}
            {!visibleItems.length ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><CheckCheck className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada notifikasi baru</p><p className="mt-1 text-xs text-muted-foreground">Semua pembaruan laporan sudah Anda baca.</p></div> : null}
          </div>
        </CardContent>
      </div>
    </Card>
  )
}

export function PelaporNotificationList() {
  return <NotificationList initialItems={pelaporNotifications} detailHref="/pelapor/laporan-saya" />
}
