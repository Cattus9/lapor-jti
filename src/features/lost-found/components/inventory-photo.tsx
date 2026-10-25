"use client"

import { useState } from "react"
import Image from "next/image"
import { PackageSearch } from "lucide-react"

export function InventoryPhoto({ url, name, sizes, className = "object-contain" }: { url?: string; name: string; sizes: string; className?: string }) {
  const [failed, setFailed] = useState(false)
  return url && !failed ? <Image src={url} alt={`Foto ${name}`} fill sizes={sizes} className={className} unoptimized onError={() => setFailed(true)} /> : <div className="flex h-full min-h-36 w-full flex-col items-center justify-center gap-2 bg-muted/40 text-muted-foreground"><PackageSearch className="size-8" aria-hidden="true" /><span className="text-xs">{failed ? "Pratinjau belum tersedia" : "Foto tidak tersedia"}</span></div>
}
