const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'

let systemThemeMedia = null
let systemThemeListener = null

function clearSystemThemeListener() {
  if (systemThemeMedia && systemThemeListener) {
    systemThemeMedia.removeEventListener?.('change', systemThemeListener)
  }
  systemThemeMedia = null
  systemThemeListener = null
}

function clearLegacyRootBranding() {
  const root = document.documentElement
  delete root.dataset.theme
  root.style.removeProperty('color-scheme')
  root.style.removeProperty('--pri')
  root.style.removeProperty('--action')
}

function clearLegacyShellBranding(shell) {
  if (!shell) return
  shell.style.removeProperty('--pri')
  shell.style.removeProperty('--action')
}

function normalizeTheme(value) {
  const theme = String(value || '').trim().toLowerCase()

  if (theme === 'dark' || theme === 'oscuro') return 'oscuro'
  if (theme === 'light' || theme === 'claro') return 'claro'
  return 'sistema'
}

function resolveSystemTheme() {
  return window.matchMedia?.(SYSTEM_THEME_QUERY).matches ? 'oscuro' : 'claro'
}

function applyResolvedTheme(preference, shell) {
  const root = document.documentElement
  const resolvedTheme = preference === 'sistema' ? resolveSystemTheme() : preference
  const legacyTheme = resolvedTheme === 'oscuro' ? 'dark' : 'light'

  root.dataset.tema = resolvedTheme
  root.style.colorScheme = legacyTheme

  if (shell) {
    shell.dataset.theme = legacyTheme
    shell.style.colorScheme = legacyTheme
  }
}

function watchSystemTheme(shell) {
  clearSystemThemeListener()

  if (!window.matchMedia) return

  systemThemeMedia = window.matchMedia(SYSTEM_THEME_QUERY)
  systemThemeListener = () => applyResolvedTheme('sistema', shell)
  systemThemeMedia.addEventListener?.('change', systemThemeListener)
}

export function applyTenantBranding(branding = {}) {
  clearLegacyRootBranding()
  clearSystemThemeListener()

  const shell = document.querySelector('.nk-app-shell')
  clearLegacyShellBranding(shell)

  const themePreference = normalizeTheme(branding.theme)
  applyResolvedTheme(themePreference, shell)

  if (themePreference === 'sistema') {
    watchSystemTheme(shell)
  }
}
