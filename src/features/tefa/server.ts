import "server-only"
import { TefaService } from "./application/tefa-service"
import { DrizzleTefaRepository } from "./infrastructure/drizzle-tefa-repository"
import { PrivateFileStorage } from "../reports/infrastructure/private-file-storage"
export function getTefaService() { return new TefaService(new DrizzleTefaRepository(), new PrivateFileStorage()) }
