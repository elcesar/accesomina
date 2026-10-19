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

  if(shell && /^#[0-9a-f]{6}$/i.test(branding.primaryColor||'')){
    shell.style.setProperty('--nk-primary',branding.primaryColor)
    shell.style.setProperty('--pri',branding.primaryColor)
    shell.style.setProperty('--nk-on-primary',accessibleBrandText(branding.primaryColor))
  }else if(shell){shell.style.removeProperty('--nk-primary');shell.style.removeProperty('--nk-on-primary')}

  const themePreference = normalizeTheme(branding.theme)
  applyResolvedTheme(themePreference, shell)

  if (themePreference === 'sistema') {
    watchSystemTheme(shell)
  }
}

export function accessibleBrandText(hex) {
 const values=hex.slice(1).match(/../g).map(value=>parseInt(value,16)/255).map(value=>value<=0.04045?value/12.92:((value+0.055)/1.055)**2.4)
 const luminance=values[0]*0.2126+values[1]*0.7152+values[2]*0.0722
 return (1.05/(luminance+0.05))>=((luminance+0.05)/0.05)?'#FFFFFF':'#000000'
}
