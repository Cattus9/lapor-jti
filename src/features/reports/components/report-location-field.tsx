"use client"

import { Field, FieldDescription, FieldLabel } from "@/components/ui/field"
import { Input } from "@/components/ui/input"
import { getReportLocationPresentation } from "../domain/report-location-presentation"

export function ReportLocationField({ category, service, value, disabled, onValueChange }: {
  category: string
  service: string
  value: string
  disabled?: boolean
  onValueChange: (value: string) => void
}) {
  const presentation = getReportLocationPresentation(category, service)
  if (!presentation.visible) return null
  return (
    <Field>
      <FieldLabel htmlFor="location">{presentation.label}{!presentation.required ? <span className="font-normal text-muted-foreground">(opsional)</span> : null}</FieldLabel>
      <Input id="location" name="location" value={value} onChange={(event) => onValueChange(event.target.value)} disabled={disabled} className="h-11 bg-background/70" placeholder={presentation.placeholder} aria-describedby="location-description" required={presentation.required} />
      <FieldDescription id="location-description">{presentation.description}</FieldDescription>
    </Field>
  )
}
