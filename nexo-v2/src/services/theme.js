const SYSTEM_THEME_QUERY = '(prefers-color-scheme: dark)'
const HEX_COLOR = /^#[0-9a-f]{6}$/i
const BRAND_PROPERTIES = [
  '--nk-primary', '--nk-primary-deep', '--nk-primary-soft',
  '--nk-action', '--nk-action-hover', '--nk-action-soft',
  '--nk-on-primary', '--nk-on-action',
  '--pri', '--pri-deep', '--pri-light', '--action', '--action-deep',
]

let systemThemeMedia = null
let systemThemeListener = null

function clearSystemThemeListener() {
  if (systemThemeMedia && systemThemeListener) {
    systemThemeMedia.removeEventListener?.('change', systemThemeListener)
  }
  systemThemeMedia = null
  systemThemeListener = null
}

function clearBrandColor(target) {
  if (!target) return
  BRAND_PROPERTIES.forEach(property => target.style.removeProperty(property))
}

function clearLegacyRootBranding() {
  const root = document.documentElement
  delete root.dataset.theme
  delete root.dataset.tema
  root.style.removeProperty('color-scheme')
  clearBrandColor(root)
}

function clearLegacyShellBranding(shell) {
  if (!shell) return
  shell.style.removeProperty('color-scheme')
  clearBrandColor(shell)
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

const linear = value => {
  const channel = value / 255
  return channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
}

function luminance(hex) {
  const channels = hex.slice(1).match(/../g).map(value => linear(Number.parseInt(value, 16)))
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722
}

export function accessibleBrandText(hex) {
  if (!HEX_COLOR.test(String(hex || '').trim())) return '#FFFFFF'
  const value = String(hex).trim().toUpperCase()
  const colorLuminance = luminance(value)
  const whiteContrast = 1.05 / (colorLuminance + 0.05)
  const blackContrast = (colorLuminance + 0.05) / 0.05
  return whiteContrast >= blackContrast ? '#FFFFFF' : '#000000'
}

export function brandCssVariables(primaryColor) {
  if (!HEX_COLOR.test(String(primaryColor || '').trim())) return {}
  const color = String(primaryColor).trim().toUpperCase()
  const onColor = accessibleBrandText(color)
  return {
    '--nk-primary': color,
    '--nk-primary-deep': `color-mix(in srgb, ${color} 82%, #000)`,
    '--nk-primary-soft': `color-mix(in srgb, ${color} 14%, transparent)`,
    '--nk-action': color,
    '--nk-action-hover': `color-mix(in srgb, ${color} 82%, #000)`,
    '--nk-action-soft': `color-mix(in srgb, ${color} 14%, transparent)`,
    '--nk-on-primary': onColor,
    '--nk-on-action': onColor,
    '--pri': color,
    '--pri-deep': `color-mix(in srgb, ${color} 82%, #000)`,
    '--pri-light': `color-mix(in srgb, ${color} 14%, transparent)`,
    '--action': color,
    '--action-deep': `color-mix(in srgb, ${color} 82%, #000)`,
  }
}

function applyBrandColor(target, primaryColor) {
  if (!target) return
  Object.entries(brandCssVariables(primaryColor)).forEach(([property, value]) => target.style.setProperty(property, value))
}

export function applyTenantBranding(branding = {}) {
  clearLegacyRootBranding()
  clearSystemThemeListener()

  const shell = document.querySelector('.nk-app-shell')
  clearLegacyShellBranding(shell)

  const themePreference = normalizeTheme(branding.theme)
  applyResolvedTheme(themePreference, shell)
  applyBrandColor(document.documentElement, branding.primaryColor)
  applyBrandColor(shell, branding.primaryColor)

  if (themePreference === 'sistema') {
    watchSystemTheme(shell)
  }
}
