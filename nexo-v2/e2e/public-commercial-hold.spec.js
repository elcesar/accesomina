import { test, expect } from '@playwright/test'

// #341: No commercial model is public until its names, prices and conditions
// have been explicitly approved. Existing private contracts stay accessible.
for (const width of [375, 1440]) {
  test(`public plans are withheld pending commercial approval at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/')
    await expect(page.getByRole('link', { name: 'Planes y precios' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ver planes y precios' })).toHaveCount(0)

    await page.goto('/planes')
    await expect(page).toHaveURL(/\/contacto$/)
    await expect(page.getByRole('heading', { name: /Planes y precios/ })).toHaveCount(0)
    await expect(page.locator('[data-plan-code]')).toHaveCount(0)

    await page.goto('/crear-empresa')
    await expect(page.getByText(/Plan Free: hasta/)).toHaveCount(0)
    await expect(page.getByText('Las condiciones comerciales de nuevas cuentas se informarán tras la revisión y aprobación correspondiente.')).toBeVisible()
  })
}
