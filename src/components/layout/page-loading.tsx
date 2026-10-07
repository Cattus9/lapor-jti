"use client"
// [AUTH-ROLE] Role hanya memilih bentuk skeleton dan navigasi saat loading.
// Skeleton tidak memvalidasi session atau memberi izin akses; pemeriksaan tetap berada pada layout/page server.

import { usePathname } from "next/navigation"
import type { ReactNode } from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { Card } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import type { AppRole } from "@/lib/auth/roles"

function LoadingPanel({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <Card className={`gap-1 rounded-2xl border border-border bg-sidebar p-1.5 shadow-xs ${className}`}>
      <div className="rounded-xl border border-border/60 bg-card p-4 shadow-2xs md:p-5">
        {children}
      </div>
    </Card>
  )
}

function LoadingHeader() {
  return (
    <header className="space-y-2 border-b border-border pb-6">
      <Skeleton className="h-8 w-44 max-w-2/3" />
      <Skeleton className="h-4 w-80 max-w-full" />
    </header>
  )
}

function LoadingPanelHeading() {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Skeleton className="size-9 shrink-0 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-3 w-56 max-w-full" />
      </div>
    </div>
  )
}

function LoadingKpiCards({ count }: { count: number }) {
  return (
    <div className={`grid gap-4 sm:grid-cols-2 ${count === 3 ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}>
      {Array.from({ length: count }, (_, index) => (
        <Card key={index} className="flex min-h-44 flex-col justify-between gap-1 rounded-2xl border border-border bg-sidebar p-1.5 shadow-xs">
          <div className="flex-1 rounded-xl border border-border/60 bg-card p-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <Skeleton className="size-10 shrink-0 rounded-xl" />
              <div className="space-y-2">
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-6 w-14" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between border-t border-border/60 pt-3">
              <Skeleton className="h-3 w-28" />
              <Skeleton className="h-3 w-12" />
            </div>
          </div>
          <div className="px-3 py-2"><Skeleton className="h-3 w-12" /></div>
        </Card>
      ))}
    </div>
  )
}

function DashboardLoading({ role }: { role: AppRole }) {
  if (role === "admin") {
    return <Skeleton className="h-4 w-56 max-w-full" />
  }

  if (role === "teknisi") {
    return <>
      <LoadingKpiCards count={4} />
      <LoadingPanel>
        <LoadingPanelHeading />
        <div className="grid gap-5 xl:grid-cols-2">
          <Skeleton className="h-56 w-full rounded-xl" />
          <Skeleton className="h-56 w-full rounded-xl" />
        </div>
      </LoadingPanel>
      <LoadingPanel>
        <LoadingPanelHeading />
        <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}</div>
      </LoadingPanel>
    </>
  }

  return (
    <>
      <LoadingKpiCards count={role === "satpam" || role === "pelapor" ? 3 : 4} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <LoadingPanel>
          <LoadingPanelHeading />
          <div className="space-y-3">
            {Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-16 w-full rounded-xl" />)}
          </div>
        </LoadingPanel>
        <LoadingPanel>
          <LoadingPanelHeading />
          <Skeleton className="h-28 w-full rounded-xl" />
        </LoadingPanel>
      </div>
    </>
  )
}

function StatisticsLoading() {
  return (
    <>
      <LoadingPanel><div className="flex flex-wrap items-center gap-3"><Skeleton className="h-9 w-32" /><Skeleton className="h-9 w-40" /><Skeleton className="h-9 w-28" /></div></LoadingPanel>
      <LoadingKpiCards count={4} />
      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
        <LoadingPanel><LoadingPanelHeading /><Skeleton className="h-60 w-full rounded-xl" /></LoadingPanel>
        <LoadingPanel><LoadingPanelHeading /><div className="flex items-center gap-5"><Skeleton className="size-36 shrink-0 rounded-full" /><div className="w-full space-y-3"><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /><Skeleton className="h-4 w-3/5" /></div></div></LoadingPanel>
      </div>
    </>
  )
}

function ProfileLoading() {
  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,0.65fr)]">
      <LoadingPanel>
        <LoadingPanelHeading />
        <div className="flex items-center gap-4 border-b border-border/60 pb-5"><Skeleton className="size-16 shrink-0 rounded-full" /><div className="space-y-2"><Skeleton className="h-5 w-40" /><Skeleton className="h-3 w-56" /></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">{Array.from({ length: 6 }, (_, index) => <Skeleton key={index} className="h-16 rounded-xl" />)}</div>
      </LoadingPanel>
      <LoadingPanel><LoadingPanelHeading /><Skeleton className="h-10 w-full rounded-lg" /><Skeleton className="mt-4 h-3 w-3/4" /></LoadingPanel>
    </div>
  )
}

function FormLoading() {
  return (
    <LoadingPanel>
      <LoadingPanelHeading />
      <div className="space-y-5">
        <div className="grid gap-3 sm:grid-cols-2"><Skeleton className="h-24 rounded-xl" /><Skeleton className="h-24 rounded-xl" /></div>
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-10 w-full rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2"><Skeleton className="h-10 rounded-lg" /><Skeleton className="h-10 rounded-lg" /></div>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    </LoadingPanel>
  )
}

function ListLoading() {
  return (
    <LoadingPanel>
      <LoadingPanelHeading />
      <div className="mb-5 flex flex-wrap gap-2"><Skeleton className="h-9 w-48 max-w-full rounded-lg" /><Skeleton className="h-9 w-28 rounded-lg" /><Skeleton className="h-9 w-24 rounded-lg" /></div>
      <div className="space-y-3">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-20 w-full rounded-xl" />)}</div>
    </LoadingPanel>
  )
}

function PelaporReportListLoading() {
  return <LoadingPanel>
    <LoadingPanelHeading />
    <div className="@container mb-4 space-y-3 border-b border-border/60 pb-4">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-2 @5xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="min-w-0 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-9 w-full rounded-lg" /></div>
        <div className="hidden gap-2 md:col-span-2 md:grid md:max-w-[33rem] md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1.2fr)] @5xl:col-span-1 @5xl:w-[33rem]">{Array.from({ length: 3 }, (_, index) => <div key={index} className="min-w-0 space-y-2"><Skeleton className="h-3 w-16" /><Skeleton className="h-9 rounded-lg" /></div>)}</div>
        <Skeleton className="col-start-2 row-start-1 h-9 w-20 rounded-lg md:hidden" />
        <Skeleton className="col-span-2 h-9 w-20 rounded-lg md:col-span-1 md:col-start-2 md:row-start-1 @5xl:col-start-auto @5xl:row-auto" />
      </div>
    </div>
    <div className="space-y-3">{Array.from({ length: 3 }, (_, index) => <div key={index} className="rounded-xl border border-border p-4 md:p-5">
      <div className="flex items-start gap-3"><Skeleton className="size-10 shrink-0 rounded-xl" /><div className="min-w-0 flex-1 space-y-2"><Skeleton className="h-5 w-44 max-w-full" /><div className="flex gap-3"><Skeleton className="h-4 w-24" /><Skeleton className="h-5 w-28 rounded-full" /></div><Skeleton className="h-3 w-48 max-w-full" /></div><Skeleton className="h-5 w-12 rounded-full" /></div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border/60 pt-4"><Skeleton className="h-3 w-64 max-w-full" /><Skeleton className="h-8 w-24 shrink-0 rounded-lg" /></div>
    </div>)}</div>
  </LoadingPanel>
}

export function PageLoading({ role }: { role: AppRole }) {
  const section = usePathname().split("/")[2] ?? "dashboard"

  return (
    <DashboardLayout role={role}>
      <ContentShell>
        <span className="sr-only" role="status">Memuat halaman...</span>
        <div aria-hidden="true" className="contents">
          <LoadingHeader />
          {section === "dashboard" ? <DashboardLoading role={role} />
            : section === "statistik" ? <StatisticsLoading />
            : section === "profil" ? <ProfileLoading />
            : section === "buat-laporan" ? <FormLoading />
            : section === "laporan-saya" && role === "pelapor" ? <PelaporReportListLoading />
            : <ListLoading />}
        </div>
      </ContentShell>
    </DashboardLayout>
  )
}
