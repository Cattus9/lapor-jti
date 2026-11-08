"use client"

import type { ReactNode } from "react"
import { BellRing, PackageSearch } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FoundNoticeList } from "@/features/found-notices/components/found-notice-list"
import type { FoundNoticePage } from "@/features/found-notices/domain/found-notice"

export function PelaporNotificationTabs({ initialTab, found, personal }: { initialTab?: string; found: FoundNoticePage; personal: ReactNode }) {
  return <Tabs defaultValue={initialTab === "temuan" ? "temuan" : "laporan"}>
    <TabsList aria-label="Jenis notifikasi">
      <TabsTrigger value="laporan"><BellRing aria-hidden="true" />Laporan saya</TabsTrigger>
      <TabsTrigger value="temuan"><PackageSearch aria-hidden="true" />Barang temuan</TabsTrigger>
    </TabsList>
    <TabsContent value="laporan" className="space-y-4">{personal}</TabsContent>
    <TabsContent value="temuan"><FoundNoticeList initialPage={found} /></TabsContent>
  </Tabs>
}
