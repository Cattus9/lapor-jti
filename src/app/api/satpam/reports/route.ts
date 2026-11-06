import { getSatpamService } from "@/features/lost-found/server"
import { readSatpamJson, readSatpamPhotoForm, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError, type AttachmentUpload } from "@/features/reports/domain/report"

export async function GET(request: Request) {
  return apiResult(async () => getSatpamService().list(await satpamRequest(request), Object.fromEntries(new URL(request.url).searchParams)))
}
export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    const contentType = request.headers.get("content-type") || ""
    if (contentType.startsWith("multipart/form-data")) {
      const form = await readSatpamPhotoForm(request)
      const commandJson = form.get("command")
      const command = typeof commandJson === "string" ? JSON.parse(commandJson) : {
        type: form.get("type"),
        matchId: form.get("matchId"),
        officerId: form.get("officerId"),
        recipient: form.get("recipient"),
        recipientEmail: form.get("recipientEmail") || undefined,
        recipientPhone: form.get("recipientPhone") || undefined,
        location: form.get("location"),
        note: form.get("note") || "",
        ownershipEvidence: form.get("ownershipEvidence"),
        submissionKey: form.get("submissionKey"),
      }
      const photoFile = form.get("photo")
      let uploadFile: AttachmentUpload | undefined
      if (photoFile instanceof File && photoFile.size > 0) {
        if (!photoFile.type.startsWith("image/")) throw new ReportError("File harus berupa foto JPG atau PNG.", 400)
        if (photoFile.size > 5 * 1024 * 1024) throw new ReportError("Ukuran foto maksimal 5 MB.", 400)
        uploadFile = { name: photoFile.name, mimeType: photoFile.type, bytes: new Uint8Array(await photoFile.arrayBuffer()) }
      }
      return getSatpamService().execute(actor, command, uploadFile)
    }
    return getSatpamService().execute(actor, await readSatpamJson(request))
  })
}
