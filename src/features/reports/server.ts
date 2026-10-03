import "server-only"
// [AUTH-ROLE] HTTP/pages supply the validated actor. Domain policies remain independent of Better Auth/Google.
import { ReportService } from "./application/report-service"
import { DrizzleReportRepository } from "./infrastructure/drizzle-report-repository"
import { PrivateFileStorage } from "./infrastructure/private-file-storage"

export function getReportService() { return new ReportService(new DrizzleReportRepository(), new PrivateFileStorage()) }
