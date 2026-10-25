import { getSatpamService } from "@/features/lost-found/server"
import { readSatpamJson, readSatpamPhotoForm, satpamRequest } from "@/features/lost-found/infrastructure/http"
import { apiResult } from "@/features/reports/infrastructure/http"
import { ReportError, type AttachmentUpload } from "@/features/reports/domain/report"

export async function GET(request: Request) {
  return apiResult(async () => {
    const actor = await satpamRequest(request)
    return getSatpamService().listLossReports(actor)
  })
}

export async function POST(request: Request) {
  return apiResult(async () => {
    const actor = await satpamRequest(request, true)
    const contentType = request.headers.get("content-type") || ""

    if (contentType.startsWith("multipart/form-data")) {
      const formData = await readSatpamPhotoForm(request)
      const ownerName = String(formData.get("ownerName") ?? "")
      const ownerContact = String(formData.get("ownerContact") ?? "")
      const title = String(formData.get("title") ?? "")
      const itemName = String(formData.get("itemName") ?? "")
      const location = String(formData.get("location") ?? "")
      const incidentDate = String(formData.get("incidentDate") ?? "")
      const incidentTime = String(formData.get("incidentTime") ?? "")
      const description = String(formData.get("description") ?? "")
      const characteristics = String(formData.get("characteristics") ?? "") || description.slice(0, 2000)
      const photoUrl = String(formData.get("photoUrl") ?? "")
      const photoFile = formData.get("photo")

      let uploadFile: AttachmentUpload | undefined
      if (photoFile instanceof File && photoFile.size > 0) {
        if (!photoFile.type.startsWith("image/")) {
          throw new ReportError("File harus berupa foto JPG atau PNG.", 400)
        }
        if (photoFile.size > 5 * 1024 * 1024) {
          throw new ReportError("Ukuran foto maksimal 5 MB.", 400)
        }
        uploadFile = {
          name: photoFile.name,
          mimeType: photoFile.type,
          bytes: new Uint8Array(await photoFile.arrayBuffer()),
        }
      }

      return getSatpamService().createLossReport(
        actor,
        { ownerName, ownerContact, title, itemName, location, incidentDate, incidentTime, characteristics, description, photoUrl },
        uploadFile
      )
    }

    if (contentType.startsWith("application/json")) {
      const body = await readSatpamJson(request)
      return getSatpamService().createLossReport(actor, body)
    }

    throw new ReportError("Format konten tidak didukung.", 415)
  })
}
