import Link from "next/link"
import Image from "next/image"
import { CalendarDays, Check, ClipboardList, Clock3, FilePlus2, FileText, Headphones, ImageIcon, MapPin, PackageSearch, Paperclip, Wrench, type LucideIcon } from "lucide-react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { ContentShell } from "@/components/layout/content-shell"
import { PageHeader } from "@/components/layout/page-header"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import type { CurrentUser } from "@/lib/auth/dummy-session"
import { pelaporReports } from "@/features/reports/mock/pelapor-reports"
import type { ReportCategory, ReportStatus, ReportSummary } from "@/features/reports/types"

const statusLabel: Record<ReportStatus, string> = { baru: "Baru", diverifikasi: "Diverifikasi", diproses: "Diproses", selesai: "Selesai" }
const statusStyle: Record<ReportStatus, string> = {
  baru: "border-slate-200 bg-slate-100 text-slate-700",
  diverifikasi: "border-amber-200 bg-amber-50 text-amber-700",
  diproses: "border-blue-200 bg-blue-50 text-blue-700",
  selesai: "border-emerald-200 bg-emerald-50 text-emerald-700",
}
const categoryMeta: Record<ReportCategory, { label: string; icon: LucideIcon }> = {
  "kehilangan-temuan": { label: "Kehilangan & Temuan", icon: PackageSearch },
  fasilitas: { label: "Fasilitas", icon: Wrench },
  layanan: { label: "Layanan", icon: Headphones },
  lainnya: { label: "Lainnya", icon: FileText },
}
const lifecycle: Record<ReportCategory, string[]> = {
  "kehilangan-temuan": ["Baru", "Diverifikasi", "Diproses", "Ditemukan", "Diserahkan", "Selesai"],
  fasilitas: ["Baru", "Diverifikasi", "Diproses", "Selesai"],
  layanan: ["Baru", "Diproses", "Selesai"],
  lainnya: ["Baru", "Diproses", "Selesai"],
}

function getActiveStep(report: ReportSummary) {
  if (report.status === "selesai") return lifecycle[report.category].length - 1
  const indexByStatus: Record<ReportStatus, number> = { baru: 0, diverifikasi: 1, diproses: report.category === "layanan" || report.category === "lainnya" ? 1 : 2, selesai: lifecycle[report.category].length - 1 }
  return indexByStatus[report.status]
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
  return `Tahap ${getActiveStep(report) + 1} dari ${total}`
}

function ReportDetailDialog({ report }: { report: ReportSummary }) {
  const meta = categoryMeta[report.category]
  const Icon = meta.icon
  const { detail } = report

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button type="button" variant="outline" size="sm" className="shrink-0 bg-card hover:bg-muted" />
        }
      >
        Lihat detail
      </DialogTrigger>
      <DialogContent>
        <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary">
              <Icon className="size-4" aria-hidden="true" />
            </span>
            <span>{meta.label}</span>
            <span aria-hidden="true">·</span>
            <span>{report.ticketNumber}</span>
            <Badge className={`ml-auto ${statusStyle[report.status]}`} variant="outline">
              {statusLabel[report.status]}
            </Badge>
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
          <ReportStepper report={report} />
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
            {detail.attachments.length ? <div className="mt-4 grid gap-3 sm:grid-cols-2">{detail.attachments.map((attachment) => <div key={attachment.name} className="overflow-hidden rounded-xl border border-border/60 bg-background/60"><div className="relative flex aspect-[16/9] items-center justify-center overflow-hidden border-b border-border/60 bg-muted/50 text-muted-foreground">{attachment.previewUrl ? <Image src={attachment.previewUrl} alt={`Pratinjau ${attachment.name}`} fill unoptimized className="object-cover" /> : <ImageIcon className="size-7" aria-hidden="true" />}</div><div className="flex items-center gap-2 p-3"><ImageIcon className="size-4 shrink-0 text-primary" aria-hidden="true" /><span className="truncate text-xs font-medium text-foreground">{attachment.name}</span></div></div>)}</div> : <div className="mt-4 flex min-h-28 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ImageIcon className="size-5 text-muted-foreground" aria-hidden="true" /><p className="mt-2 text-sm font-medium text-foreground">Tidak ada lampiran</p><p className="mt-1 text-xs text-muted-foreground">Pelapor tidak menambahkan foto atau dokumen pendukung.</p></div>}
          </section>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ReportRow({ report }: { report: ReportSummary }) {
  const meta = categoryMeta[report.category]
  const Icon = meta.icon
  return <article className="rounded-xl border border-border bg-background/60 p-4 transition-colors hover:border-primary/40 md:p-5"><div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-foreground shadow-2xs"><Icon className="size-5" aria-hidden="true" /></span><div className="min-w-0"><h2 className="truncate text-sm font-semibold text-foreground md:text-base">{report.title}</h2><p className="mt-1 text-xs text-muted-foreground">{report.ticketNumber} · {meta.label}</p></div></div><Badge className={statusStyle[report.status]} variant="outline">{statusLabel[report.status]}</Badge></div><div className="mt-4 flex flex-col gap-3 border-t border-border/60 pt-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><span>{getStepSummary(report)} · Diperbarui {report.updatedAt}</span></div><ReportDetailDialog report={report} /></div></article>
}

export function PelaporReportList({ user }: { user: CurrentUser }) {
  return <DashboardLayout role="pelapor"><ContentShell><PageHeader title="Laporan Saya" description={`Seluruh riwayat laporan milik ${user.name}.`} action={<Button nativeButton={false} render={<Link href="/pelapor/buat-laporan" />}><FilePlus2 />Buat Laporan</Button>} /><Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ClipboardList className="size-4 text-primary" aria-hidden="true" />Riwayat tiket<span className="ml-auto rounded-full bg-background px-2 py-0.5 text-[11px] text-muted-foreground">{pelaporReports.length} laporan</span></div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="space-y-3 p-4 md:p-5">{pelaporReports.map((report) => <ReportRow key={report.ticketNumber} report={report} />)}</CardContent></div></Card></ContentShell></DashboardLayout>
}
