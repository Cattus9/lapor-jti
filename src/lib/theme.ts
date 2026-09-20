export type AppTheme = "light" | "dark"

const THEME_STORAGE_KEY = "laporjti-theme"
const THEME_CHANGE_EVENT = "laporjti-theme-change"

export function subscribeToTheme(onStoreChange: () => void) {
  window.addEventListener(THEME_CHANGE_EVENT, onStoreChange)
  return () => window.removeEventListener(THEME_CHANGE_EVENT, onStoreChange)
}

export function getThemeSnapshot() {
  return document.documentElement.classList.contains("dark")
}

export function setTheme(theme: AppTheme) {
  document.documentElement.classList.toggle("dark", theme === "dark")
  window.localStorage.setItem(THEME_STORAGE_KEY, theme)
  window.dispatchEvent(new Event(THEME_CHANGE_EVENT))
}
