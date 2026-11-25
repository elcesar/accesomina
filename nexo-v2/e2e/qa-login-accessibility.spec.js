import { test, expect } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/me') {
      return route.fulfill({ status: 401, json: { error: 'AUTH_REQUIRED' } })
    }
    return route.fulfill({ json: {} })
  })
})

for (const width of [390, 1440]) {
  test(`el acceso mantiene texto crítico legible a ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.goto('/login')

    const footer = page.locator('.nk-login-footer')
    await expect(footer).toBeVisible()
    const footerFontSize = await footer.evaluate(element => parseFloat(getComputedStyle(element).fontSize))
    expect(footerFontSize).toBeGreaterThanOrEqual(13)
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width)

    if (width >= 900) {
      const copyright = page.locator('.nk-login-brand-footer')
      await expect(copyright).toBeVisible()
      const styles = await copyright.evaluate(element => {
        const computed = getComputedStyle(element)
        return { color: computed.color, fontSize: parseFloat(computed.fontSize), opacity: computed.opacity }
      })
      expect(styles.color).toBe('rgb(255, 255, 255)')
      expect(styles.opacity).toBe('1')
      expect(styles.fontSize).toBeGreaterThanOrEqual(13)
    }
  })
}

test('el acceso conserva etiquetas asociadas y avisa un RUT inválido al salir del campo', async ({ page }) => {
  await page.goto('/login')

  const rut = page.locator('#login-rut')
  const email = page.locator('#login-email')
  const password = page.locator('#login-password')
  await expect(rut).toHaveAccessibleName(/RUT empresa/)
  await expect(email).toHaveAccessibleName(/Correo/)
  await expect(password).toHaveAccessibleName(/Contraseña/)

  await rut.fill('11.111.111-2')
  await rut.blur()

  await expect(rut).toHaveAttribute('aria-invalid', 'true')
  await expect(rut).toHaveAttribute('aria-describedby', /login-rut-error/)
  await expect(page.locator('#login-rut-error')).toHaveText('Ingresa un RUT de empresa válido.')
})
