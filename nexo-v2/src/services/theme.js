const THEMES = new Set(['claro', 'oscuro'])

function normalizeTheme(value) {
  return value === 'dark' || value === 'oscuro' ? 'oscuro' : 'claro'
}

export function applyTenantBranding(branding = {}) {
  const theme = normalizeTheme(branding.theme)
  const root = document.documentElement

  root.dataset.tema = theme
  root.style.colorScheme = theme === 'oscuro' ? 'dark' : 'light'

  const shell = document.querySelector('.nk-app-shell')
  if (shell) shell.dataset.theme = theme

  try {
    localStorage.setItem('nexo:tema', theme)
  } catch {
    // The explicit choice remains active when browser storage is unavailable.
  }
}

export function restorePreferredTheme() {
  let stored = ''
  try {
    stored = localStorage.getItem('nexo:tema') || ''
  } catch {
    stored = ''
  }

  applyTenantBranding({ theme: THEMES.has(stored) ? stored : 'claro' })
}
