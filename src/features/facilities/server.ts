import "server-only"
// [AUTH-ROLE] Only server-validated application identities enter this service; Google Workspace can reuse it.
import { TechnicianService } from "./application/technician-service"
import { DrizzleTechnicianRepository } from "./infrastructure/drizzle-technician-repository"
import { PrivateFileStorage } from "../reports/infrastructure/private-file-storage"

export function getTechnicianService() { return new TechnicianService(new DrizzleTechnicianRepository(), new PrivateFileStorage()) }
