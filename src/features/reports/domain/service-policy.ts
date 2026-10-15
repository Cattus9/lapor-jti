export type ReportServicePolicy = Readonly<{
  group: "operasional" | "jti"
  requiresProgram: boolean
  locationMode: "required" | "optional" | "hidden"
}>

const operationalPolicy: ReportServicePolicy = { group: "operasional", requiresProgram: true, locationMode: "required" }
const administrationPolicy: ReportServicePolicy = { ...operationalPolicy, locationMode: "hidden" }
const fieldServicePolicy: ReportServicePolicy = { ...operationalPolicy, requiresProgram: false }
const jtiPolicy: ReportServicePolicy = { group: "jti", requiresProgram: false, locationMode: "hidden" }

// Form policy only: these entries do not provision services or change report routing.
// Keep exact catalog names explicit until editable service metadata is introduced.
const servicePolicies = new Map<string, ReportServicePolicy>([
  ["Administrasi", administrationPolicy],
  ["Keamanan", fieldServicePolicy],
  ["Kebersihan", fieldServicePolicy],
  ["JTI E-Learning", jtiPolicy],
  ["JTI Evaluasi Pembelajaran", jtiPolicy],
  ["JTI Ruang Baca", jtiPolicy],
  ["JTI Surat", jtiPolicy],
])

export function getReportServicePolicy(service: string): ReportServicePolicy {
  // Unknown/custom services retain the previous requirement, never a prefix guess.
  return servicePolicies.get(service.trim()) ?? operationalPolicy
}

export function groupReportServices(services: readonly string[]) {
  const names = [...new Set(services)]
  return [
    { id: "operasional", label: "Operasional", options: names.filter((name) => getReportServicePolicy(name).group === "operasional") },
    { id: "jti", label: "Layanan JTI", options: names.filter((name) => getReportServicePolicy(name).group === "jti") },
  ].filter((group) => group.options.length > 0)
}
