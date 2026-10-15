"use client"

import { useId, useState } from "react"
import { CalendarDays, Check, ClipboardCheck, Headphones, MessageSquareText, Paperclip, ScrollText, UserRound } from "lucide-react"
import { cn } from "cn"
import { OperationalReportDialog } from "@/components/reports/operational-report-dialog"
import { ReportAttachmentsEmptyState } from "@/components/reports/report-attachments-empty-state"
import { Button } from "@/components/ui/button"
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { StatusBadge } from "@/components/ui/status-badge"
import { Textarea } from "@/components/ui/textarea"
import type { TefaPreviewReport, TefaPreviewStatus } from "../domain/tefa-preview"
import { formatTefaDate } from "./tefa-ui"
import { useTefaPreview } from "./tefa-preview-provider"

const stages = ["Baru", "Diproses", "Selesai"] as const

export function TefaReportDetail({ report, actor, onClose, finalFocus }: { report: TefaPreviewReport; actor: string; onClose: () => void; finalFocus: () => HTMLElement | true }) {
  const { update } = useTefaPreview()
  const [decision, setDecision] = useState<"Selesai" | "Ditolak" | null>(null)
  const [note, setNote] = useState("")
  const noteId = useId()
  const current = stages.findIndex((stage) => stage === report.status)
  const closed = report.status === "Selesai" || report.status === "Ditolak"
  const latest = report.history.at(-1)!
  function change(status: TefaPreviewStatus) {
    update(report.id, status, note, actor)
    setDecision(null)
    setNote("")
  }
  const action = <div className="space-y-3 rounded-xl border border-border/60 bg-muted/50 p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-medium">{closed ? "Penanganan contoh ditutup" : "Simulasi penanganan"}</p><p className="mt-1 text-xs leading-relaxed text-muted-foreground">{closed ? "Catatan tetap tersedia pada riwayat contoh." : "Perubahan hanya berlaku pada pratinjau ini, bukan laporan sebenarnya."}</p></div>{!closed && !decision ? <div className="flex shrink-0 flex-wrap gap-2">{report.status === "Baru" ? <><Button type="button" onClick={() => change("Diproses")}>Mulai penanganan</Button><Button type="button" variant="outline" onClick={() => setDecision("Ditolak")}>Tolak laporan</Button></> : <Button type="button" onClick={() => setDecision("Selesai")}><ClipboardCheck />Selesaikan laporan</Button>}</div> : null}</div>{decision ? <form className="space-y-3" onSubmit={(event) => { event.preventDefault(); if (note.trim() && note.length <= 2000) change(decision) }}><Field><FieldLabel htmlFor={noteId}>{decision === "Selesai" ? "Hasil penanganan" : "Alasan penolakan"}</FieldLabel><Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={2000} required aria-describedby={`${noteId}-hint`} /><FieldDescription id={`${noteId}-hint`}>Jelaskan tindak lanjut dengan singkat. Maksimal 2.000 karakter. Catatan ini hanya untuk simulasi.</FieldDescription></Field><div className="flex flex-wrap justify-end gap-2"><Button type="button" variant="outline" onClick={() => { setDecision(null); setNote("") }}>Batal</Button><Button type="submit" disabled={!note.trim()}>Konfirmasi simulasi</Button></div></form> : null}</div>
  return <OperationalReportDialog open onOpenChange={(open) => { if (!open) onClose() }} finalFocus={finalFocus} icon={Headphones} category={report.service} submittedAt={formatTefaDate(report.submittedAt)} status={report.status} title={report.title} updatedAt={`${formatTefaDate(latest.at)} WIB`} action={action}>
    <section aria-label="Progres penanganan"><h3 className="text-sm font-semibold">Progres penanganan</h3>{report.status === "Ditolak" ? <p className="mt-3 text-sm text-muted-foreground">Laporan contoh ditolak. Alasan tersedia dalam riwayat status.</p> : <ol className="mt-4 flex items-start">{stages.map((stage, index) => <li key={stage} aria-current={index === current ? "step" : undefined} className="flex min-w-0 flex-1 items-start"><div className="flex min-w-0 flex-1 flex-col items-center gap-2"><span className={cn("flex size-8 items-center justify-center rounded-full border text-xs", index <= current ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground")}>{index < current ? <Check className="size-4" aria-hidden="true" /> : index + 1}</span><span className="text-center text-xs text-muted-foreground">{stage}</span></div>{index < stages.length - 1 ? <span className={cn("mt-4 h-px flex-1", index < current ? "bg-primary" : "bg-border")} aria-hidden="true" /> : null}</li>)}</ol>}</section>
    <section className="border-t border-border/60 pt-6"><SectionHeading icon={ScrollText} title="Detail laporan" description="Informasi contoh untuk meninjau alur layanan JTI." /><dl className="mt-4 grid overflow-hidden rounded-xl border border-border/60 sm:grid-cols-2">{[{ icon: UserRound, label: "Pelapor", hint: "Identitas pengirim", value: report.reporter }, { icon: Headphones, label: "Layanan", hint: "Aplikasi atau layanan terkait", value: report.service }, { icon: CalendarDays, label: "Dikirim", hint: "Waktu pengiriman laporan", value: `${formatTefaDate(report.submittedAt)} WIB` }, { icon: MessageSquareText, label: "Pengelola", hint: "Tim penanganan", value: "TEFA (simulasi)" }].map(({ icon: Icon, label, hint, value }, index) => <div key={label} className={cn("border-b border-border/60 p-4", index % 2 === 0 && "sm:border-r")}><dt><span className="flex items-center gap-1.5 text-sm font-medium"><Icon className="size-4 text-muted-foreground" aria-hidden="true" />{label}</span><span className="mt-1 block text-xs text-muted-foreground">{hint}</span></dt><dd className="mt-2 break-words text-sm">{value}</dd></div>)}<div className="p-4 sm:col-span-2"><dt className="flex items-center gap-1.5 text-sm font-medium"><ScrollText className="size-4 text-muted-foreground" aria-hidden="true" />Deskripsi kendala</dt><dd className="mt-2 whitespace-pre-wrap break-words text-sm leading-relaxed">{report.description}</dd></div></dl></section>
    <section className="border-t border-border/60 pt-6"><SectionHeading icon={Paperclip} title="Lampiran" description="Bukti pendukung yang membantu pemeriksaan kendala." /><div className="mt-4"><ReportAttachmentsEmptyState /></div></section>
    <section className="border-t border-border/60 pt-6"><h3 className="text-sm font-semibold">Riwayat status</h3><div className="mt-3 space-y-2">{report.history.toReversed().map((entry, index) => <div key={`${entry.status}-${index}`} className="rounded-xl border border-border/60 bg-background/60 p-3"><div className="flex flex-wrap items-center gap-2"><StatusBadge status={entry.status} /><span className="text-xs text-muted-foreground">{formatTefaDate(entry.at)} WIB</span></div><p className="mt-2 text-xs text-muted-foreground">Oleh {entry.actor}</p><p className="mt-1 whitespace-pre-wrap break-words text-sm">{entry.note}</p></div>)}</div></section>
  </OperationalReportDialog>
}

function SectionHeading({ icon: Icon, title, description }: { icon: typeof ScrollText; title: string; description: string }) {
  return <div className="flex items-center gap-3"><span className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-border bg-background text-primary"><Icon className="size-4" aria-hidden="true" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs text-muted-foreground">{description}</p></div></div>
}
