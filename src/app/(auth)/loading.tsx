import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"

export default function Loading() {
  return (
    <div className="flex min-h-dvh w-full bg-background">
      <span className="sr-only" role="status">Memuat halaman masuk...</span>
      <Card aria-hidden="true" className="min-h-dvh w-full gap-0 rounded-none border-0 bg-sidebar p-2.5 shadow-none ring-0">
        <CardContent className="grid min-h-[calc(100dvh-1.25rem)] flex-1 gap-2.5 p-0 md:grid-cols-[minmax(0,45fr)_minmax(0,55fr)]">
          <div className="login-form-panel flex min-w-0 flex-col justify-between gap-8 rounded-xl border border-border/70 bg-card p-6 sm:p-8 md:p-8 lg:p-10">
            <div className="flex items-center gap-2.5"><Skeleton className="size-9 rounded-xl" /><Skeleton className="h-4 w-28" /></div>
            <div className="m-auto w-full max-w-sm space-y-8 py-10">
              <div className="space-y-3"><Skeleton className="h-3 w-40" /><Skeleton className="h-8 w-64 max-w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" /></div>
              <div className="space-y-2"><Skeleton className="h-4 w-24" /><Skeleton className="h-9 w-full rounded-lg" /><Skeleton className="h-3 w-4/5" /></div>
              <Skeleton className="h-10 w-full rounded-lg" />
            </div>
            <Skeleton className="h-3 w-3/4" />
          </div>
          <div className="login-visual-panel hidden min-w-0 items-center rounded-xl border border-primary/30 p-10 md:flex lg:p-16">
            <div className="w-full space-y-4">
              <Skeleton className="aspect-[3.3] w-full max-w-[480px] bg-white/20" />
              <div className="space-y-2 pl-[min(12.2%,59px)]">
                <Skeleton className="h-4 w-full bg-white/20" />
                <Skeleton className="h-4 w-11/12 bg-white/20" />
                <Skeleton className="h-4 w-4/5 bg-white/20" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
