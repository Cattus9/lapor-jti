import type { InventoryItem } from "./inventory"
import type { SatpamLostFoundReport } from "../types"

export type CandidateCustody = "semua" | "belum-diterima" | "di-pos"
export type MatchingCandidate = {
  id: string
  title: string
  description: string
  location: string
  photoUrl?: string
  date: string
  sortDate: string
} & ({ custody: "belum-diterima"; report: SatpamLostFoundReport } | { custody: "di-pos"; item: InventoryItem })

export function inventoryCandidateId(item: InventoryItem) {
  return item.sourceFoundTicket ? `report:${item.sourceFoundTicket}` : `inventory:${item.id}`
}

// The receipt replaces the report's representation, including during overlapping refreshes.
// Identity and original submission time stay stable when custody changes.
export function matchingCandidates(reports: SatpamLostFoundReport[], inventory: InventoryItem[], custody: CandidateCustody = "semua"): MatchingCandidate[] {
  const received = new Set(inventory.flatMap(item => item.sourceFoundTicket ? [item.sourceFoundTicket] : []))
  const candidates: MatchingCandidate[] = [
    ...reports.filter(report => report.kind === "temuan" && !report.inventoryId && !received.has(report.ticket) && ["Baru", "Diproses"].includes(report.status)).map(report => ({
      id: `report:${report.ticket}`, title: report.title, description: report.description || report.characteristics,
      location: report.location, photoUrl: report.photoUrl, date: report.submittedAt, sortDate: report.submittedAtIso ?? "",
      custody: "belum-diterima" as const, report,
    })),
    ...inventory.filter(item => item.status === "tersimpan").map(item => ({
      id: inventoryCandidateId(item), title: item.sourceFoundTitle || item.itemName, description: item.description,
      location: item.storageLocation, photoUrl: item.photoUrl, date: item.sourceFoundSubmittedAt ?? item.createdAt,
      sortDate: item.matchingDateIso ?? "", custody: "di-pos" as const, item,
    })),
  ]
  return candidates.filter(candidate => custody === "semua" || candidate.custody === custody)
    .sort((a, b) => b.sortDate.localeCompare(a.sortDate) || a.id.localeCompare(b.id))
}
