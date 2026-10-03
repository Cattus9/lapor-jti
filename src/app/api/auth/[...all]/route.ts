import { toNextJsHandler } from "better-auth/next-js"
// [AUTH-SESSION] Endpoint session/login/logout milik Better Auth.
// Login Google dapat memakai engine yang sama; jika engine diganti, migrasikan handler, cookie, dan session bersama.
import { getAuth } from "@/lib/auth/auth"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"
export async function GET(request: Request) {
  return toNextJsHandler(getAuth()).GET(request)
}
export async function POST(request: Request) {
  return toNextJsHandler(getAuth()).POST(request)
}
