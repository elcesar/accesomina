function clearLegacyRootBranding() {
  const root = document.documentElement
  delete root.dataset.theme
  root.style.removeProperty('color-scheme')
  root.style.removeProperty('--pri')
  root.style.removeProperty('--action')
}

export function applyTenantBranding(branding = {}) {
  clearLegacyRootBranding()

  const shell = document.querySelector('.nk-app-shell')
  if (!shell) return

  const theme = branding.theme === 'dark' ? 'dark' : 'light'
  shell.dataset.theme = theme
  shell.style.colorScheme = theme

  const accent = String(branding.accent || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(accent)) {
    shell.style.setProperty('--pri', accent)
    shell.style.setProperty('--action', accent)
  } else {
    shell.style.removeProperty('--pri')
    shell.style.removeProperty('--action')
  }
}
