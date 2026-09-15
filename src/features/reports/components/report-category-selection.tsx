import Link from "next/link"
import { ArrowRight, ClipboardCheck, Construction, Globe2, PackageSearch } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"

const categories = [
  { title: "Kehilangan & Temuan", description: "Laporkan barang hilang atau barang yang ditemukan.", icon: PackageSearch, href: "/pelapor/buat-laporan/kehilangan-temuan" },
  { title: "Laporan Fasilitas", description: "Laporkan kerusakan atau masalah fasilitas JTI.", icon: Construction, href: "/pelapor/buat-laporan/fasilitas" },
  { title: "Laporan Layanan", description: "Laporkan kendala layanan internal JTI.", icon: Globe2, href: "/pelapor/buat-laporan/layanan" },
  { title: "Laporan Lainnya", description: "Sampaikan laporan umum di luar kategori utama.", icon: ClipboardCheck, href: "/pelapor/buat-laporan/lainnya" },
]

export function ReportCategorySelection() {
  return <ContentShell><PageHeader title="Buat Laporan" description="Pilih kategori yang paling sesuai dengan laporan Anda." /><div className="grid gap-4 sm:grid-cols-2">{categories.map(({ title, description, icon: Icon, href }) => <Card key={title} className="transition-colors hover:border-primary/50"><CardHeader><div className="mb-3 flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary"><Icon className="size-5" /></div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription><Button variant="ghost" className="mt-3 w-fit px-0" nativeButton={false} render={<Link href={href} />}>Mulai laporan<ArrowRight /></Button></CardHeader></Card>)}</div></ContentShell>
}
