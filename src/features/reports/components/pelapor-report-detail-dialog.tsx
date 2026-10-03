"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import { CalendarDays, Check, Clock3, FileText, Headphones, ImageIcon, MapPin, PackageSearch, Paperclip, Wrench, type LucideIcon } from "lucide-react"
import { StatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { FieldError } from "@/components/ui/field"
import { lifecycleByCategory, statusLabels as statusLabel } from "../domain/report"
import type { ReportCategory, ReportListItem, ReportSummary } from "../types"

const categoryMeta: Record<ReportCategory, { label: string; icon: LucideIcon }> = {
  "kehilangan-temuan": { label: "Kehilangan & Temuan", icon: PackageSearch },
  fasilitas: { label: "Fasilitas", icon: Wrench },
  layanan: { label: "Layanan", icon: Headphones },
  lainnya: { label: "Lainnya", icon: FileText },
}
const lifecycle: Record<ReportCategory, string[]> = Object.fromEntries(Object.entries(lifecycleByCategory).map(([key, values]) => [key, values.map((status) => statusLabel[status])])) as Record<ReportCategory, string[]>

function getActiveStep(report: Pick<ReportSummary, "category" | "status">) {
  return Math.max(0, lifecycleByCategory[report.category].indexOf(report.status))
}

function ReportStepper({ report }: { report: ReportSummary }) {
  const steps = lifecycle[report.category]
  const activeStep = getActiveStep(report)
  return (
    <div className="overflow-x-auto pb-1" aria-label={`Progres ${report.ticketNumber}`}>
      <div className="flex min-w-[30rem] items-start">
        {steps.map((step, index) => {
          const completed = index <= activeStep
          const current = index === activeStep
          return <div key={step} className="flex min-w-0 flex-1 items-start"><div className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={`flex size-7 items-center justify-center rounded-full border text-xs transition-colors ${completed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"} ${current ? "ring-3 ring-primary/15" : ""}`}>{completed && !current ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}</span><span className={`text-center text-[11px] leading-tight ${current ? "font-semibold text-foreground" : completed ? "text-muted-foreground" : "text-muted-foreground/70"}`}>{step}</span></div>{index < steps.length - 1 ? <span className={`mt-3.5 h-px flex-1 ${index < activeStep ? "bg-primary" : "bg-border"}`} aria-hidden="true" /> : null}</div>
        })}
      </div>
    </div>
  )
}

function getStepSummary(report: ReportSummary) {
  const total = lifecycle[report.category].length
  return report.status === "ditolak" ? "Laporan ditolak" : `Tahap ${getActiveStep(report) + 1} dari ${total}`
}

function ReportDetailContent({ report }: { report: ReportSummary }) {
  const meta = categoryMeta[report.category]
  const Icon = meta.icon
  const { detail } = report

  return (
    <DialogContent>
        <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span>{meta.label}</span>
            <span aria-hidden="true">·</span>
            <span>{report.ticketNumber}</span>
            <StatusBadge className="ml-auto" status={statusLabel[report.status]} />
          </div>
          <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">
            {report.title}
          </DialogTitle>
          <DialogDescription className="mt-2">
            Diperbarui {report.updatedAt} · Pantau perkembangan laporan Anda di sini.
          </DialogDescription>
        </div>
        <div className="space-y-6 p-5 md:p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">Progress laporan</p>
              <p className="mt-1 text-xs text-muted-foreground">Tahapan penanganan oleh pengelola</p>
            </div>
            <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
              {getStepSummary(report)}
            </span>
          </div>
          {report.status !== "ditolak" ? <ReportStepper report={report} /> : <p className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">Laporan ditolak. Lihat catatan pengelola pada riwayat status.</p>}
          <div className="rounded-xl border border-border/60 bg-muted/50 p-4">
            <p className="text-sm font-medium text-foreground">Informasi status</p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Status laporan akan diperbarui oleh pengelola setelah setiap tahapan selesai.
            </p>
          </div>
          <section className="border-t border-border/60 pt-6" aria-labelledby={`report-details-${report.ticketNumber}`}>
            <div className="flex items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
                <FileText className="size-4" aria-hidden="true" />
              </span>
              <div>
                <h3 id={`report-details-${report.ticketNumber}`} className="text-sm font-semibold text-foreground">Detail laporan</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">Informasi yang Anda kirimkan</p>
              </div>
            </div>
            <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
              <div className="border-b border-border/60 p-4 sm:border-r">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><CalendarDays className="size-3.5" aria-hidden="true" />Tanggal kejadian</dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">{detail.incidentDate}</dd>
              </div>
              <div className="border-b border-border/60 p-4">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Waktu kejadian</dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">{detail.incidentTime}</dd>
              </div>
              <div className="p-4 sm:col-span-2">
                <dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />Lokasi kejadian</dt>
                <dd className="mt-1.5 text-sm font-medium text-foreground">{detail.location}</dd>
              </div>
            </dl>
            <dl className="mt-3 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
              {detail.fields.map((field, index) => <div key={field.label} className={`p-4 ${index < detail.fields.length - 1 ? "border-b border-border/60 sm:border-b-0" : ""} ${index % 2 === 0 && index < detail.fields.length - 1 ? "sm:border-r sm:border-border/60" : ""}`}><dt className="text-xs text-muted-foreground">{field.label}</dt><dd className="mt-1.5 text-sm font-medium leading-relaxed text-foreground">{field.value}</dd></div>)}
            </dl>
            <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4">
              <p className="text-xs text-muted-foreground">Deskripsi dan kronologi</p>
              <p className="mt-1.5 text-sm leading-relaxed text-foreground">{detail.description}</p>
            </div>
          </section>
          <section className="border-t border-border/60 pt-6" aria-labelledby={`report-attachments-${report.ticketNumber}`}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
                  <Paperclip className="size-4" aria-hidden="true" />
                </span>
                <div>
                  <h3 id={`report-attachments-${report.ticketNumber}`} className="text-sm font-semibold text-foreground">Lampiran</h3>
                  <p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung laporan</p>
                </div>
              </div>
              <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{detail.attachments.length} file</span>
            </div>
            {detail.attachments.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{detail.attachments.map((attachment) => <div key={attachment.id ?? attachment.name} className="overflow-hidden rounded-xl border border-border/60 bg-background/60"><div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-border/60 bg-muted/50 text-muted-foreground">{attachment.previewUrl ? <Image src={attachment.previewUrl} alt={`Pratinjau ${attachment.name}`} fill unoptimized className="object-cover" /> : <ImageIcon className="size-7" aria-hidden="true" />}</div><div className="flex items-center gap-2 p-3"><ImageIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /><a href={attachment.downloadUrl} className="truncate text-xs font-medium text-primary">{attachment.name}</a></div></div>)}</div> : <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-2 text-sm font-medium text-foreground">Tidak ada lampiran</p><p className="mt-1 text-xs text-muted-foreground">Pelapor tidak menambahkan foto atau dokumen pendukung.</p></div>}
          </section>
          <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold">Riwayat status</h3><div className="mt-3 space-y-2">{report.history?.map((item, index) => <div key={index} className="rounded-xl border p-3"><StatusBadge status={statusLabel[item.status]} /><p className="mt-1 text-xs text-muted-foreground">{item.createdAt} · {item.actor}</p><p className="mt-1 text-sm text-muted-foreground">{item.note}</p></div>)}</div></section>
        </div>
    </DialogContent>
  )
}

export function PelaporReportDetailDialog({ report, defaultOpen = false }: { report: ReportListItem; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [detail, setDetail] = useState<ReportSummary | null>(null)
  const [error, setError] = useState("")
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    fetch("/api/pelapor/reports/" + report.id, { signal: controller.signal, cache: "no-store" })
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error || "Detail tidak dapat dimuat."); return data })
      .then((data: ReportSummary) => { if (!controller.signal.aborted) setDetail(data) })
      .catch((error) => { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Koneksi bermasalah.") })
    return () => controller.abort()
  }, [open, report.id, attempt])
  return <Dialog open={open} onOpenChange={(value) => { setOpen(value); if (value) { setDetail(null); setError("") } }}>
    <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="shrink-0 bg-card" />}>Lihat detail</DialogTrigger>
    {detail ? <ReportDetailContent report={detail} /> : <DialogContent><div className="space-y-4 p-6"><DialogTitle>{report.title}</DialogTitle><DialogDescription>Memuat detail laporan {report.ticketNumber}.</DialogDescription>{error ? <><FieldError>{error}</FieldError><Button type="button" variant="outline" onClick={() => { setError(""); setAttempt((value) => value + 1) }}>Coba lagi</Button></> : <div className="space-y-3" aria-busy="true"><Skeleton className="h-14 w-full" /><Skeleton className="h-28 w-full" /><Skeleton className="h-24 w-full" /></div>}</div></DialogContent>}
  </Dialog>
}
