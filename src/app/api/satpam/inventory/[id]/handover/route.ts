import { getSatpamService } from "@/features/lost-found/server"
import { readSatpamJson, readSatpamPhotoForm, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError, type AttachmentUpload } from "@/features/reports/domain/report"

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    const { id } = await context.params
    const contentType = request.headers.get("content-type") || ""

    if (contentType.startsWith("multipart/form-data")) {
      const form = await readSatpamPhotoForm(request)
      const photoFile = form.get("photo")
      let uploadFile: AttachmentUpload | undefined
      if (photoFile instanceof File && photoFile.size > 0) {
        if (!photoFile.type.startsWith("image/")) throw new ReportError("File harus berupa foto JPG atau PNG.", 400)
        if (photoFile.size > 5 * 1024 * 1024) throw new ReportError("Ukuran foto maksimal 5 MB.", 400)
        uploadFile = { name: photoFile.name, mimeType: photoFile.type, bytes: new Uint8Array(await photoFile.arrayBuffer()) }
      }
      return getSatpamService().handoverInventory(actor, {
        id,
        recipient: form.get("recipient"),
        recipientEmail: form.get("recipientEmail") || undefined,
        recipientPhone: form.get("recipientPhone") || undefined,
        note: form.get("note") || undefined,
        officerId: form.get("officerId"),
        ownershipEvidence: form.get("ownershipEvidence"),
        lossTicket: form.get("lossTicket") || undefined,
        submissionKey: form.get("submissionKey"),
      }, uploadFile)
    }

    const body = (await readSatpamJson(request)) as Record<string, unknown>
    if (!body || typeof body !== "object") {
      throw new ReportError("Isian permintaan tidak valid.", 400)
    }

    return getSatpamService().handoverInventory(actor, {
      id,
      recipient: body.recipient,
      recipientEmail: body.recipientEmail,
      recipientPhone: body.recipientPhone,
      note: body.note,
      officerId: body.officerId,
      ownershipEvidence: body.ownershipEvidence,
      lossTicket: body.lossTicket,
      submissionKey: body.submissionKey,
    })
  })
}
