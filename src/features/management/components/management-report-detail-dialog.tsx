"use client"

import { useState } from "react"
import { Check, CheckCheck, ClipboardList, Clock3, FileText, ImageIcon, MapPin, MessageSquareText, Paperclip } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { StatusBadge as SharedStatusBadge } from "@/components/ui/status-badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import type { ManagementReport, ManagementReportStatus } from "@/features/management/mock/manajemen-dashboard"
import { cn } from "cn"

export type ManagementReportActivity = {
  status: ManagementReportStatus
  actor: string
  timestamp: string
  note: string
}

const lifecycle = ["Baru", "Sedang Diproses", "Selesai"] as const

export function ManagementStatusBadge({ status }: { status: ManagementReportStatus }) {
  return <SharedStatusBadge status={status} />
}

export function ManagementCategoryBadge({ category }: { category: ManagementReport["category"] }) {
  return <Badge tone={category === "Layanan" ? "violet" : "warning"} variant="outline">{category}</Badge>
}

export function createManagementInitialActivity(report: ManagementReport): ManagementReportActivity[] {
  const initial: ManagementReportActivity[] = [{ status: "Baru", actor: "Pelapor", timestamp: report.submittedAt, note: "Laporan dikirimkan kepada Manajemen Jurusan." }]

  if (report.status === "Sedang Diproses" || report.status === "Selesai") {
    initial.push({ status: "Sedang Diproses", actor: "Dewi Lestari", timestamp: report.status === "Selesai" ? "16 September 2026, 14.20" : report.updatedAt, note: "Penanganan laporan dimulai dan tanggapan awal telah dicatat." })
  }

  if (report.status === "Selesai") {
    initial.push({ status: "Selesai", actor: "Dewi Lestari", timestamp: report.updatedAt, note: "Penanganan selesai dan informasi akhir telah disampaikan kepada pelapor." })
  }

  return initial
}

function ReportStepper({ status }: { status: ManagementReportStatus }) {
  const activeStep = lifecycle.indexOf(status)

  return (
    <div className="overflow-x-auto pb-1" aria-label="Tahapan penanganan laporan">
      <div className="flex min-w-72 items-start">
        {lifecycle.map((step, index) => {
          const completed = index < activeStep
          const current = index === activeStep

          return (
            <div key={step} className="flex min-w-0 flex-1 items-start">
              <div className="flex min-w-0 flex-1 flex-col items-center gap-2">
                <span className={cn("flex size-7 items-center justify-center rounded-full border text-xs", completed || current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground", current && "ring-3 ring-primary/15")}>
                  {completed ? <Check className="size-3.5" aria-hidden="true" /> : index + 1}
                </span>
                <span className={cn("text-center text-[11px] leading-tight", current ? "font-semibold text-foreground" : "text-muted-foreground")}>{step}</span>
              </div>
              {index < lifecycle.length - 1 ? <span className={cn("mt-3.5 h-px flex-1", index < activeStep ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

function StatusHistory({ activities }: { activities: ManagementReportActivity[] }) {
  return (
    <section className="border-t border-border/60 pt-6">
      <h3 className="text-sm font-semibold text-foreground">Riwayat status</h3>
      <div className="mt-3 space-y-2">
        {[...activities].reverse().map((activity, index) => (
          <div key={`${activity.status}-${activity.timestamp}-${index}`} className="flex items-start gap-3 rounded-xl border border-border/60 bg-background/60 p-3">
            <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <p className="text-sm font-medium text-foreground">{activity.status}</p>
                <span className="text-xs text-muted-foreground">{activity.timestamp}</span>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Oleh {activity.actor}. {activity.note}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StatusActionPanel({ report, onStatusChange, onOpenCompletion }: { report: ManagementReport; onStatusChange?: (ticket: string, status: ManagementReportStatus, note: string) => void; onOpenCompletion: () => void }) {
  if (report.status === "Selesai") {
    return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Laporan selesai</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tanggapan akhir telah dicatat dan pelapor dapat melihat pembaruan pada tiketnya.</p></div>
  }

  if (!onStatusChange) return null

  if (report.status === "Baru") {
    return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Mulai penanganan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Catat respons awal agar pelapor mengetahui bahwa laporan sudah ditindaklanjuti.</p><div className="mt-4"><Button type="button" onClick={() => onStatusChange(report.ticket, "Sedang Diproses", "Penanganan dimulai dan respons awal telah dicatat.")}>Mulai penanganan</Button></div></div>
  }

  return <div className="rounded-xl border border-border/60 bg-muted/50 p-4"><p className="text-sm font-medium text-foreground">Selesaikan laporan</p><p className="mt-1 text-sm leading-relaxed text-muted-foreground">Tambahkan tanggapan akhir sebelum laporan dinyatakan selesai.</p><div className="mt-4"><Button type="button" onClick={onOpenCompletion}>Selesaikan laporan</Button></div></div>
}

export function ManagementReportDetailDialog({ report, activity, onStatusChange, defaultOpen = false }: { report: ManagementReport; activity: ManagementReportActivity[]; onStatusChange?: (ticket: string, status: ManagementReportStatus, note: string) => void; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen)
  const [completionOpen, setCompletionOpen] = useState(false)
  const [completionNote, setCompletionNote] = useState("")

  function completeReport() {
    if (!onStatusChange) return
    onStatusChange(report.ticket, "Selesai", completionNote.trim())
    setCompletionOpen(false)
    setCompletionNote("")
  }

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger render={<Button type="button" variant="outline" size="sm" className="shrink-0 bg-card hover:bg-muted" />}>Lihat detail</DialogTrigger>
        <DialogContent>
          <div className="border-b border-border/60 p-5 pr-14 md:p-6 md:pr-16">
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><MessageSquareText className="size-4" aria-hidden="true" /></span>
              <span>{report.category === "Layanan" ? "Laporan layanan" : "Laporan lainnya"}</span>
              <span aria-hidden="true">·</span>
              <span>{report.ticket}</span>
              <ManagementStatusBadge status={report.status} />
            </div>
            <DialogTitle className="mt-4 text-xl leading-tight md:text-2xl">{report.title}</DialogTitle>
            <DialogDescription className="mt-2">Diperbarui {report.updatedAt}. Tinjau informasi sebelum melanjutkan penanganan.</DialogDescription>
          </div>

          <div className="space-y-6 p-5 md:p-6">
            <section>
              <div className="flex items-center justify-between gap-3">
                <div><p className="text-sm font-semibold text-foreground">Progres penanganan</p><p className="mt-1 text-xs text-muted-foreground">Tahap {lifecycle.indexOf(report.status) + 1} dari {lifecycle.length}</p></div>
                <ManagementStatusBadge status={report.status} />
              </div>
              <div className="mt-5"><ReportStepper status={report.status} /></div>
            </section>

            <StatusActionPanel report={report} onStatusChange={onStatusChange} onOpenCompletion={() => setCompletionOpen(true)} />

            <section className="border-t border-border/60 pt-6">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><FileText className="size-4" aria-hidden="true" /></span>
                <div><h3 className="text-sm font-semibold text-foreground">Detail laporan</h3><p className="mt-0.5 text-xs text-muted-foreground">Informasi yang dikirimkan oleh pelapor.</p></div>
              </div>
              <dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">
                <div className="border-b border-border/60 p-4 sm:border-r"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><ClipboardList className="size-3.5" aria-hidden="true" />Pelapor</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.reporter}</dd></div>
                <div className="border-b border-border/60 p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MessageSquareText className="size-3.5" aria-hidden="true" />Layanan atau konteks</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.service}</dd></div>
                <div className="border-b border-border/60 p-4 sm:border-b-0 sm:border-r"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><MapPin className="size-3.5" aria-hidden="true" />Lokasi atau kanal</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.location}</dd></div>
                <div className="p-4"><dt className="flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" aria-hidden="true" />Waktu laporan</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.submittedAt}</dd></div>
              </dl>
              <dl className="mt-3 overflow-hidden rounded-xl border border-border/60"><div className="p-4"><dt className="text-xs text-muted-foreground">Unit pelapor</dt><dd className="mt-1.5 text-sm font-medium text-foreground">{report.reporterUnit}</dd></div></dl>
              <div className="mt-3 rounded-xl border border-border/60 bg-background/60 p-4"><p className="text-xs text-muted-foreground">Deskripsi laporan</p><p className="mt-1.5 text-sm leading-relaxed text-foreground">{report.description}</p></div>
            </section>

            <section className="border-t border-border/60 pt-6">
              <div className="flex items-center gap-2">
                <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-background text-primary"><Paperclip className="size-4" aria-hidden="true" /></span>
                <div><h3 className="text-sm font-semibold text-foreground">Lampiran</h3><p className="mt-0.5 text-xs text-muted-foreground">Foto atau dokumen pendukung dari pelapor.</p></div>
              </div>
              <div className="mt-4 flex min-h-24 items-center gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground"><ImageIcon className="size-5" aria-hidden="true" /></span>
                <div><p className="text-sm font-medium text-foreground">{report.attachments ? `${report.attachments} lampiran tersedia` : "Tidak ada lampiran"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{report.attachments ? "Pratinjau file akan tersedia setelah integrasi penyimpanan lampiran diaktifkan." : "Pelapor tidak menambahkan foto atau dokumen pendukung."}</p></div>
              </div>
            </section>

            <StatusHistory activities={activity} />
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={completionOpen} onOpenChange={setCompletionOpen}>
        <DialogContent className="max-w-lg p-5 md:p-6">
          <DialogTitle>Selesaikan laporan</DialogTitle>
          <DialogDescription className="mt-1.5">Tanggapan akhir akan disimpan pada riwayat tiket dan diteruskan kepada pelapor.</DialogDescription>
          <div className="mt-4 space-y-2">
            <Label htmlFor={`completion-note-${report.ticket}`}>Tanggapan akhir</Label>
            <Textarea id={`completion-note-${report.ticket}`} value={completionNote} onChange={(event) => setCompletionNote(event.target.value)} placeholder="Jelaskan hasil penanganan dan informasi yang perlu diketahui pelapor." />
            <p className="text-xs text-muted-foreground">Tanggapan ini menjadi catatan terakhir sebelum laporan ditutup.</p>
          </div>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" className="bg-card" onClick={() => setCompletionOpen(false)}>Batal</Button>
            <Button type="button" disabled={!completionNote.trim()} onClick={completeReport}><CheckCheck />Simpan dan selesaikan</Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
