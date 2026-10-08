"use client"

import { Button } from "@/components/ui/button"
import { FieldError } from "@/components/ui/field"
import { Skeleton } from "@/components/ui/skeleton"

export function ManagementFeedback({ loading, error, onRetry }: { loading: boolean; error: string; onRetry: () => void }) {
  return <>{error ? <div className="space-y-2"><FieldError>{error}</FieldError><Button type="button" variant="outline" size="sm" onClick={onRetry}>Coba lagi</Button></div> : null}{loading ? <div className="space-y-2" role="status" aria-label="Memuat laporan"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div> : null}</>
}
