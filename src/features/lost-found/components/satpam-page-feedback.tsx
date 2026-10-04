import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"

export function SatpamPageFeedback({ loading, error, nextCursor, loadMore }: { loading: boolean; error: string; nextCursor?: string | null; loadMore?: () => void }) {
  return <>
    {error ? <FieldError>{error}</FieldError> : null}
    {loading ? <div role="status" aria-label="Memuat data Satpam" className="space-y-3"><Skeleton className="h-24 w-full rounded-xl" /><Skeleton className="h-24 w-full rounded-xl" /></div> : null}
    {nextCursor && loadMore ? <Button type="button" variant="outline" className="bg-card" disabled={loading} onClick={loadMore}>Muat lainnya</Button> : null}
  </>
}
