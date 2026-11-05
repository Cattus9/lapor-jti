import { getSatpamDraftService } from "@/features/lost-found/server"
import { readSatpamPhotoForm, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { ReportError, type AttachmentUpload } from "@/features/reports/domain/report"
import { apiResult } from "@/features/reports/infrastructure/http"

export async function GET(request: Request) {
  return apiResult(async () => ({ drafts: await getSatpamDraftService().list(await satpamRequest(request)) }))
}

export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    if (!request.headers.get("content-type")?.startsWith("multipart/form-data")) throw new ReportError("Format permintaan tidak valid.", 415)
    const form = await readSatpamPhotoForm(request)
    const data = form.get("data")
    if (typeof data !== "string" || data.length > 16000) throw new ReportError("Isian draft tidak valid.")
    let raw: unknown
    try { raw = JSON.parse(data) } catch { throw new ReportError("Isian draft tidak valid.") }
    const photo = form.get("photo")
    let upload: AttachmentUpload | undefined
    if (photo instanceof File && photo.size > 0) upload = { name: photo.name, mimeType: photo.type, bytes: new Uint8Array(await photo.arrayBuffer()) }
    return getSatpamDraftService().write(actor, raw, upload)
  })
}
