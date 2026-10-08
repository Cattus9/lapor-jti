import "server-only"
import { ManagementService } from "./application/management-service"
import { DrizzleManagementRepository } from "./infrastructure/drizzle-management-repository"
import { PrivateFileStorage } from "../reports/infrastructure/private-file-storage"

export function getManagementService() { return new ManagementService(new DrizzleManagementRepository(), new PrivateFileStorage()) }
