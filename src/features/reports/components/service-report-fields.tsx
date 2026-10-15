"use client"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select"
import { studyPrograms } from "../domain/catalog"
import { getReportServicePolicy, groupReportServices } from "../domain/service-policy"
import { getReportServiceHint } from "../domain/report-form-copy"

export function ServiceReportFields({ services, service, program, disabled, onServiceChange, onProgramChange }: {
  services: string[]
  service: string
  program: string
  disabled?: boolean
  onServiceChange: (value: string) => void
  onProgramChange: (value: string) => void
}) {
  const requiresProgram = getReportServicePolicy(service).requiresProgram
  const showProgram = Boolean(service && requiresProgram)
  const serviceItems = [...new Set([...services, ...(service ? [service] : [])])].map((value) => ({ value, label: value }))

  return (
    <div className={showProgram ? "grid gap-5 sm:grid-cols-2" : "grid gap-5"}>
      <Field>
        <FieldLabel htmlFor="service">Jenis layanan</FieldLabel>
        <Select value={service} items={serviceItems} disabled={disabled} required onValueChange={(value) => {
          const next = value ?? ""
          if (!next || !getReportServicePolicy(next).requiresProgram) onProgramChange("")
          onServiceChange(next)
        }}>
          <SelectTrigger id="service" aria-label="Jenis layanan" aria-describedby="service-description" className="h-11 w-full bg-background/70">
            <SelectValue placeholder="Pilih layanan" />
          </SelectTrigger>
          <SelectContent>
            {groupReportServices(services).map((group) => <SelectGroup key={group.id}>
              <SelectLabel>{group.label}</SelectLabel>
              {group.options.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}
            </SelectGroup>)}
          </SelectContent>
        </Select>
        <FieldDescription id="service-description">{getReportServiceHint(service)}</FieldDescription>
      </Field>
      {showProgram ? <Field>
        <FieldLabel htmlFor="program">Unit atau program studi</FieldLabel>
        <Select value={program} items={[...new Set([...studyPrograms, ...(program ? [program] : [])])].map((value) => ({ value, label: value }))} disabled={disabled} required onValueChange={(value) => onProgramChange(value ?? "")}>
          <SelectTrigger id="program" aria-label="Unit atau program studi" className="h-11 w-full bg-background/70"><SelectValue placeholder="Pilih unit terkait" /></SelectTrigger>
          <SelectContent>{studyPrograms.map((name) => <SelectItem key={name} value={name}>{name}</SelectItem>)}</SelectContent>
        </Select>
      </Field> : null}
    </div>
  )
}
