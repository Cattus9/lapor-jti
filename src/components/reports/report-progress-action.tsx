"use client"

import { useRef, useState, type FormEvent } from "react"
import { useActivityNotifications } from "@/components/activity-notification-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { FieldError } from "@/components/ui/field"
import { progressMessages } from "@/features/reports/domain/report-follow-up"
import type { ReportHandler } from "@/features/reports/domain/report"

export function ReportProgressAction({ id, handler, found, localOnly, disabled, onSaved }: {
  id: string
  handler: ReportHandler
  found?: boolean
  localOnly?: boolean
  disabled?: boolean
  onSaved: () => void
}) {
  const { notify } = useActivityNotifications()
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState("")
  const [error, setError] = useState("")
  const [saving, setSaving] = useState(false)
  const sending = useRef(false)
  const options = Object.entries(progressMessages[handler]).filter(([key]) => !(found && key === "searching"))

  function changeOpen(value: boolean) {
    if (sending.current) return
    setOpen(value)
    setChoice("")
    setError("")
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!choice || sending.current) return
    sending.current = true
    setSaving(true)
    setError("")
    try {
      const response = await fetch(`/api/reports/${encodeURIComponent(id)}/progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ choice }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok || !result?.ok) throw new Error(result?.error || "Pembaruan belum tersimpan. Coba lagi.")
      setOpen(false)
      notify({ title: "Perkembangan tersimpan", description: "Catatan ditambahkan ke riwayat laporan.", tone: "success" })
      onSaved()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Pembaruan belum tersimpan. Coba lagi.")
    } finally {
      sending.current = false
      setSaving(false)
    }
  }

  return <Dialog open={open} onOpenChange={changeOpen}>
    <DialogTrigger disabled={disabled} render={<Button type="button" variant="outline" size="sm" />}>Catat perkembangan</DialogTrigger>
    <DialogContent className="z-[80] max-w-lg gap-4 p-5 md:p-6" overlayClassName="z-[70] bg-foreground/30 backdrop-blur-sm" showNestedBackdrop showCloseButton={!saving}>
      <DialogHeader>
        <DialogTitle>Catat perkembangan</DialogTitle>
        <DialogDescription>{localOnly ? "Perkembangan ini disimpan di riwayat untuk petugas." : "Catatan disimpan di riwayat. Pelapor akan menerima notifikasi jika akunnya aktif."}</DialogDescription>
      </DialogHeader>
      <form className="space-y-4" onSubmit={save}>
        <div className="grid gap-2" role="group" aria-label="Pilih perkembangan">
          {options.map(([value, label]) => <Button key={value} type="button" variant={choice === value ? "soft" : "outline"} className="h-auto justify-start whitespace-normal py-2 text-left" aria-pressed={choice === value} disabled={saving} onClick={() => setChoice(value)}>{label}</Button>)}
        </div>
        {error ? <FieldError>{error}</FieldError> : null}
        <div className="flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" disabled={saving} onClick={() => changeOpen(false)}>Batal</Button>
          <Button type="submit" disabled={!choice || saving}>{saving ? "Menyimpan…" : localOnly ? "Simpan perkembangan" : "Kirim pembaruan"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
}
