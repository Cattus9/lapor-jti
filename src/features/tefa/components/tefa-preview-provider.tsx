"use client"

import { createContext, useContext, useState, type ReactNode } from "react"
import { createTefaPreviewReports } from "../mock/tefa-reports"
import { updateTefaPreview, type TefaPreviewReport, type TefaPreviewStatus } from "../domain/tefa-preview"

type PreviewContext = {
  reports: TefaPreviewReport[]
  update: (id: string, status: TefaPreviewStatus, note: string, actor: string) => void
  reset: () => void
}
const TefaPreviewContext = createContext<PreviewContext | null>(null)

export function TefaPreviewProvider({ children }: { children: ReactNode }) {
  const [reports, setReports] = useState(createTefaPreviewReports)
  return <TefaPreviewContext.Provider value={{ reports, reset: () => setReports(createTefaPreviewReports()), update: (id, status, note, actor) => setReports((current) => updateTefaPreview(current, id, status, note, actor, new Date().toISOString())) }}>{children}</TefaPreviewContext.Provider>
}

export function useTefaPreview() {
  const context = useContext(TefaPreviewContext)
  if (!context) throw new Error("TEFA preview provider is required.")
  return context
}
