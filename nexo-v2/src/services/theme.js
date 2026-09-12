export function applyTenantBranding(branding = {}) {
  const root = document.documentElement
  const theme = branding.theme === 'dark' ? 'dark' : 'light'
  root.dataset.theme = theme
  root.style.colorScheme = theme

  const accent = String(branding.accent || '').trim()
  if (/^#[0-9a-fA-F]{6}$/.test(accent)) {
    root.style.setProperty('--pri', accent)
    root.style.setProperty('--action', accent)
  } else {
    root.style.removeProperty('--pri')
    root.style.removeProperty('--action')
  }
}
