import "server-only"
// [AUTH-ROLE] Validated server identity is independent of the eventual Google Workspace provider.
import { SatpamService } from "./application/satpam-service"
import { DrizzleSatpamRepository } from "./infrastructure/drizzle-satpam-repository"
import { PrivateFileStorage } from "../reports/infrastructure/private-file-storage"
import { SatpamDraftService } from "./application/satpam-draft-service"
import { DrizzleSatpamDrafts } from "./infrastructure/drizzle-satpam-drafts"

export function getSatpamService() { return new SatpamService(new DrizzleSatpamRepository(), new PrivateFileStorage()) }
export function getSatpamDraftService() { return new SatpamDraftService(new DrizzleSatpamDrafts(), new PrivateFileStorage()) }
