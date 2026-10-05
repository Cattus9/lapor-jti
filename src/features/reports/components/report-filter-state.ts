import { reportListHref, type ReportListFilters } from "../domain/report-list-filters"

export type ReportFilterState = {
  values: ReportListFilters
  serverHref: string
  requests: string[]
  revision: number
}

export function createReportFilterState(filters: ReportListFilters): ReportFilterState {
  return { values: filters, serverHref: reportListHref(filters), requests: [], revision: 0 }
}

// Acknowledging our own navigation must not overwrite text typed while it loads.
// External navigation restores URL criteria and invalidates any search timer.
export function reconcileReportFilterState(state: ReportFilterState, filters: ReportListFilters): ReportFilterState {
  const serverHref = reportListHref(filters)
  if (serverHref === state.serverHref) return state
  const index = state.requests.indexOf(serverHref)
  return index >= 0
    ? { ...state, serverHref, requests: state.requests.slice(index + 1) }
    : { values: filters, serverHref, requests: [], revision: state.revision + 1 }
}
