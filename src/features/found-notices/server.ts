import "server-only"
import { FoundNoticeService } from "./application/found-notice-service"
import { DrizzleFoundNoticeRepository } from "./infrastructure/drizzle-found-notice-repository"

export function getFoundNoticeService() { return new FoundNoticeService(new DrizzleFoundNoticeRepository()) }
