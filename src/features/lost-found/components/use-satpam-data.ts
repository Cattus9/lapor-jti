"use client"

// Compatibility exports keep Satpam callers stable while sharing resource lifecycle with Teknisi.
export { OperationalRefreshContext as SatpamRefreshContext, useOperationalResource as useSatpamResource, useOperationalPage as useSatpamPage, useDebouncedOperationalQuery as useDebouncedSatpamQuery } from "@/components/reports/use-operational-data"
