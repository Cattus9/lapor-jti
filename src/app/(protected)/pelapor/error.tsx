"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function PelaporError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => { console.error("Pelapor page could not load.", error.digest ?? "") }, [error])
  return <div className="p-5 md:p-8"><Card><CardContent className="space-y-3 p-6"><h1 className="text-lg font-semibold">Data belum dapat dimuat</h1><p className="text-sm text-muted-foreground">Silakan coba lagi. Data yang sudah tersimpan tetap berada di database.</p><Button onClick={reset}>Coba lagi</Button></CardContent></Card></div>
}
