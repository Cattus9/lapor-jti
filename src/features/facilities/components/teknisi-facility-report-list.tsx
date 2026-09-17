"use client"

import { useMemo, useState } from "react"
import { Check, CheckCheck, ClipboardList, Clock3, FileText, ImageIcon, MapPin, Paperclip, Wrench } from "lucide-react"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { technicianFacilityReports, type TechnicianFacilityReport, type TechnicianReportStatus } from "@/features/facilities/mock/teknisi-dashboard"
import { cn } from "cn"

export type ReportActivity = {
  status: TechnicianReportStatus
  actor: string
  timestamp: string
  note: string
}

const lifecycle = ["Baru", "Diverifikasi", "Diproses", "Selesai"] as const
const statuses: Array<TechnicianReportStatus | "Semua"> = ["Semua", ...lifecycle]

const statusClass: Record<TechnicianReportStatus, string> = {
  Baru: "border-slate-200 bg-slate-100 text-slate-700",
  Diverifikasi: "border-amber-200 bg-amber-50 text-amber-700",
  Diproses: "border-blue-200 bg-blue-50 text-blue-700",
  Selesai: "border-emerald-200 bg-emerald-50 text-emerald-700",
}

const nextAction: Partial<Record<TechnicianReportStatus, { label: string; nextStatus: TechnicianReportStatus; description: string }>> = {
  Baru: { label: "Verifikasi laporan", nextStatus: "Diverifikasi", description: "Pastikan detail kerusakan dan lokasi dapat ditindaklanjuti." },
  Diverifikasi: { label: "Mulai penanganan", nextStatus: "Diproses", description: "Tandai laporan setelah pekerjaan perbaikan mulai dilakukan." },
  Diproses: { label: "Selesaikan perbaikan", nextStatus: "Selesai", description: "Tambahkan catatan pekerjaan sebelum laporan dinyatakan selesai." },
}

function StatusBadge({ status }: { status: TechnicianReportStatus }) {
  return <Badge className={statusClass[status]} variant="outline">{status}</Badge>
}

function createInitialActivity(report: TechnicianFacilityReport): ReportActivity[] {
  if (report.status === "Selesai") {
    return [
      { status: "Baru", actor: "Pelapor", timestamp: report.submittedAt, note: "Laporan fasilitas dibuat." },
      { status: "Diverifikasi", actor: "Rizky Pratama", timestamp: "16 September 2026, 14.00", note: "Detail laporan telah diverifikasi." },
      { status: "Diproses", actor: "Rizky Pratama", timestamp: "16 September 2026, 14.25", note: "Perbaikan fasilitas dimulai." },
      { status: "Selesai", actor: "Rizky Pratama", timestamp: report.updatedAt, note: "Pekerjaan perbaikan telah diselesaikan dan dicatat." },
    ]
  }

  return [{ status: report.status, actor: report.status === "Baru" ? "Pelapor" : "Rizky Pratama", timestamp: report.status === "Baru" ? report.submittedAt : report.updatedAt, note: report.status === "Baru" ? "Laporan fasilitas dibuat." : `Laporan berada pada tahap ${report.status}.` }]
}

function ReportStepper({ status }: { status: TechnicianReportStatus }) {
  const activeStep = lifecycle.indexOf(status)

  return <div className="overflow-x-auto pb-1" aria-label="Tahapan penanganan laporan"><div className="flex min-w-[24rem] items-start">{lifecycle.map((step, index) => { const completed = index < activeStep; const current = index === activeStep; return <div key={step} className="flex min-w-0 flex-1 items-start"><div className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={cn("flex size-7 items-center justify-center rounded-full border text-xs", completed || current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground", current && "ring-3 ring-primary/15")}>{completed ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}</span><span className={cn("text-center text-[11px] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{step}</span></div>{index < lifecycle.length - 1 ? <span className={cn("mt-3.5 h-px flex-1", index < activeStep ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}</div> })}</div></div>
}

function StatusActivity({ activities }: { activities: ReportActivity[] }) {
  return <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold text-foreground">Riwayat status</h3><div className="mt-3 space-y-2">{[...activities].reverse().map((activity, index) => <div key={`${activity.status}-${activity.timestamp}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-x-2 gap-y-1"><p className="text-sm font-medium text-foreground">{activity.status}</p><span className="text-xs text-muted-foreground">{activity.timestamp}</span></div><p className="mt-1 text-xs text-muted-foreground">Oleh {activity.actor} · {activity.note}</p></div></div>)}</div></section>
}

function StatusActionPanel({ report, onStatusChange, onOpenCompletion }: { report: TechnicianFacilityReport; onStatusChange?: (ticket: string, status: TechnicianReportStatus, note: string) => void; onOpenCompletion: () => void }) {
  const action = nextAction[report.status]

  if (report.status === "Selesai") return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Laporan selesai</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tiket telah ditutup dan dapat dilihat kembali pada Riwayat Perbaikan.</p></div>
  if (!action || !onStatusChange) return null

  return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Aksi penanganan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">{action.description}</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><Button type="button" onClick={() => report.status === "Diproses" ? onOpenCompletion() : onStatusChange(report.ticket, action.nextStatus, action.description)}>{action.label}</Button></div></div>
}

export function ReportDetailDialog({ report, activity, onStatusChange }: { report: TechnicianFacilityReport; activity: ReportActivity[]; onStatusChange?: (ticket: string, status: TechnicianReportStatus, note: string) => void }) {
  const [open, setOpen] = useState(false)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [workNote, setWorkNote] = useState("")

  function completeRepair() {
    if (!onStatusChange) return
    onStatusChange(report.ticket, "Selesai", workNote.trim())
    setCompletionOpen(false)
    setWorkNote("")
  }

  return <><Dialog open={open} onOpenChange={setOpen}><DialogTrigger render={<Button type="button" variant="outline" size="sm" className="shrink-0 bg-card hover:bg-muted" />}>Lihat detail</DialogTrigger><DialogContent><div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16"><div className="flex items-center gap-2 text-xs text-muted-foreground"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Wrench className="size-4" aria-hidden="true" /></span><span>Laporan fasilitas</span><span aria-hidden="true">·</span><span>{report.ticket}</span><StatusBadge status={report.status} /></div><DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{report.title}</DialogTitle><DialogDescription className="mt-2">Diperbarui {report.updatedAt}. Tinjau informasi sebelum melanjutkan penanganan.</DialogDescription></div><div className="space-y-6 p-5 md:p-6"><section><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-semibold text-foreground">Progres penanganan</p><p className="mt-1 text-xs text-muted-foreground">Tahap {lifecycle.indexOf(report.status) + 1} dari {lifecycle.length}</p></div><StatusBadge status={report.status} /></div><div className="mt-5"><ReportStepper status={report.status} /></div></section><StatusActionPanel report={report} onStatusChange={onStatusChange} onOpenCompletion={() => setCompletionOpen(true)} /><section className="border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><FileText className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-foreground">Detail laporan</h3><p className="mt-0.5 text-xs text-muted-foreground">Informasi yang dikirimkan oleh pelapor.</p></div></div><dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2"><div className="border-b border-border/60 p-4 sm:border-r"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><ClipboardList className="size-3.5" aria-hidden="true" />Pelapor</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.reporter}</dd></div><div className="border-b border-border/60 p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Wrench className="size-3.5" aria-hidden="true" />Fasilitas</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.facility}</dd></div><div className="border-b border-border/60 p-4 sm:border-b-0 sm:border-r"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />Lokasi</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.location}</dd></div><div className="p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Waktu laporan</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.submittedAt}</dd></div></dl><div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4"><p className="text-xs text-muted-foreground">Deskripsi kerusakan</p><p className="mt-1.5 text-sm leading-relaxed text-foreground">{report.description}</p></div></section><section className="border-t border-border/60 pt-6"><div className="flex items-center gap-2"><span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Paperclip className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold text-foreground">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung.</p></div></div><div className="mt-4 flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4"><span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ImageIcon className="size-5" aria-hidden="true" /></span><div><p className="text-sm font-medium text-foreground">{report.attachments ? `${report.attachments} lampiran tersedia` : "Tidak ada lampiran"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.attachments ? "Pratinjau file akan tersedia setelah integrasi penyimpanan lampiran." : "Pelapor tidak menambahkan foto atau dokumen pendukung."}</p></div></div></section><StatusActivity activities={activity} /></div></DialogContent></Dialog><Dialog open={completionOpen} onOpenChange={setCompletionOpen}><DialogContent className="max-w-lg p-5 md:p-6"><DialogTitle>Selesaikan perbaikan</DialogTitle><DialogDescription className="mt-1.5">Catatan pekerjaan akan dicatat pada riwayat laporan dan dilihat oleh pelapor.</DialogDescription><div className="mt-4 space-y-2"><Label htmlFor={`work-note-${report.ticket}`}>Catatan pekerjaan</Label><Textarea id={`work-note-${report.ticket}`} value={workNote} onChange={(event) => setWorkNote(event.target.value)} placeholder="Contoh: Lampu diganti dan sudah diuji menyala dengan baik." /><p className="text-xs text-muted-foreground">Jelaskan tindakan yang sudah dilakukan dan kondisi akhir fasilitas.</p></div><div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" className="bg-card" onClick={() => setCompletionOpen(false)}>Batal</Button><Button type="button" disabled={!workNote.trim()} onClick={completeRepair}><CheckCheck />Simpan dan selesaikan</Button></div></DialogContent></Dialog></>
}

export function TeknisiFacilityReportList() {
  const { notify } = useActivityNotifications()
  const [reports, setReports] = useState<readonly TechnicianFacilityReport[]>(technicianFacilityReports)
  const [activeStatus, setActiveStatus] = useState<TechnicianReportStatus | "Semua">("Semua")
  const [activities, setActivities] = useState<Record<string, ReportActivity[]>>(() => Object.fromEntries(technicianFacilityReports.map((report) => [report.ticket, createInitialActivity(report)])))
  const counts = useMemo(() => Object.fromEntries(statuses.map((status) => [status, status === "Semua" ? reports.length : reports.filter((item) => item.status === status).length])), [reports])
  const visibleReports = activeStatus === "Semua" ? reports : reports.filter((item) => item.status === activeStatus)

  function updateStatus(ticket: string, status: TechnicianReportStatus, note: string) {
    const report = reports.find((item) => item.ticket === ticket)
    setReports((current) => current.map((item) => item.ticket === ticket ? { ...item, status, updatedAt: "Baru saja" } : item))
    setActivities((current) => ({ ...current, [ticket]: [...(current[ticket] ?? []), { status, actor: "Rizky Pratama", timestamp: "Baru saja", note }] }))
    notify({ title: "Status laporan diperbarui", description: `${report?.ticket ?? ticket} kini berstatus ${status}.`, tone: "success" })
  }

  return <Card className="gap-1 rounded-2xl border-border bg-sidebar p-1.5 text-sidebar-foreground shadow-xs"><div className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-muted-foreground"><ClipboardList className="size-4 text-primary" aria-hidden="true" /><span>Manajemen laporan fasilitas</span></div><div className="rounded-xl border border-border/60 bg-card text-card-foreground shadow-2xs"><CardContent className="p-4 md:p-5"><Tabs value={activeStatus} onValueChange={(value) => setActiveStatus(value as TechnicianReportStatus | "Semua")}><TabsList aria-label="Filter status laporan fasilitas">{statuses.map((status) => <TabsTrigger key={status} value={status}>{status}<span className="rounded-md bg-background px-1.5 py-0.5 text-[11px] text-muted-foreground">{counts[status]}</span></TabsTrigger>)}</TabsList><TabsContent value={activeStatus}><div className="space-y-2">{visibleReports.map((report) => <article key={report.ticket} className="flex flex-col gap-3 rounded-xl border border-border/60 bg-background/40 p-3.5 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-border bg-card text-muted-foreground"><Wrench className="size-4" aria-hidden="true" /></span><div className="min-w-0"><p className="truncate text-sm font-medium text-foreground">{report.title}</p><p className="mt-1 flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3 shrink-0" aria-hidden="true" /><span className="truncate">{report.ticket} · {report.facility} · {report.location}</span></p></div></div><div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end"><span className="text-xs text-muted-foreground">{report.updatedAt}</span><StatusBadge status={report.status} /><ReportDetailDialog report={report} activity={activities[report.ticket] ?? []} onStatusChange={updateStatus} /></div></article>)}{!visibleReports.length ? <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-4 text-center"><ClipboardList className="size-6 text-muted-foreground" aria-hidden="true" /><p className="mt-3 text-sm font-medium text-foreground">Tidak ada laporan {activeStatus.toLowerCase()}</p><p className="mt-1 text-xs text-muted-foreground">Laporan pada status ini akan muncul saat tersedia.</p></div> : null}</div></TabsContent></Tabs></CardContent></div></Card>
}
