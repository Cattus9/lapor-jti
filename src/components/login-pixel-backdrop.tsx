"use client"

import dynamic from "next/dynamic"
import { useSyncExternalStore } from "react"
import { subscribeToTheme } from "@/lib/theme"

const PixelBlast = dynamic(() => import("@/components/PixelBlast"), { ssr: false })
const mediaQuery = "(min-width: 768px) and (prefers-reduced-motion: no-preference)"

function subscribeToBackdropPreference(onChange: () => void) {
  const media = window.matchMedia(mediaQuery)
  media.addEventListener("change", onChange)
  return () => media.removeEventListener("change", onChange)
}

function getBackdropPreference() {
  return window.matchMedia(mediaQuery).matches
}

function getPixelColor() {
  return getComputedStyle(document.documentElement).getPropertyValue("--login-panel-pixel").trim()
}

export function LoginPixelBackdrop() {
  const showBackdrop = useSyncExternalStore(subscribeToBackdropPreference, getBackdropPreference, () => false)
  const pixelColor = useSyncExternalStore(subscribeToTheme, getPixelColor, () => "")

  if (!showBackdrop || !pixelColor) return null

  return (
    <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden="true">
      <PixelBlast
        variant="diamond"
        color={pixelColor}
        pixelSize={3}
        patternScale={2.2}
        patternDensity={0.65}
        edgeFade={0.25}
        speed={0.12}
        enableRipples={false}
        antialias={false}
        autoPauseOffscreen
        transparent
      />
    </div>
  )
}
