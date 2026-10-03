"use client"
// [AUTH-SESSION] Client login/logout untuk endpoint Better Auth; tidak menentukan hak akses.
// Jika engine auth diganti, migrasikan client dan handler server bersama; provider Google tidak menentukan role.

import { createAuthClient } from "better-auth/react"

// Same-origin API requests; no secret or server origin is exposed to the client.
export const authClient = createAuthClient()
