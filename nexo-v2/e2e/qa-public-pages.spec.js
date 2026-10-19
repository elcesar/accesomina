import { test, expect } from '@playwright/test'
import { PUBLIC_PAGES } from '../src/config/public-pages.js'

test.beforeEach(async ({ page }) => {
  await page.route('**/api/**', route => {
    const path = new URL(route.request().url()).pathname
    if (path === '/api/auth/register') return route.fulfill({ status: 400, json: { error: 'INVITE_CODE_INVALID' } })
    return route.fulfill({ json: path === '/api/auth/config' ? { registrationEnabled: true } : {} })
  })
})
test('public routes have unique titles, a main heading, canonical URL and crawlable links', async ({ page }) => {
  for (const item of Object.values(PUBLIC_PAGES)) {
    await page.goto(item.path)
    await expect(page.locator('main h1')).toHaveCount(1)
    await expect(page).toHaveTitle(`Nexo Klar · ${item.title}`)
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', `https://nexoklar.com${item.path}`)
  }
  await page.goto('/#solucion')
  await expect(page).toHaveURL(/\/plataforma$/)
  await page.getByRole('link', { name: 'Beneficios', exact: true }).first().click()
  await expect(page).toHaveURL(/\/beneficios$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/plataforma$/)
})
test('invalid registration reports all fields and makes invitation errors actionable', async ({ page }) => {
  await page.goto('/crear-empresa')
  await page.getByRole('button', { name: 'Crear sitio privado vacío' }).click()
  await expect(page.locator('#registration-companyName')).toBeFocused()
  await expect(page.locator('[aria-invalid=true]')).toHaveCount(6)
  for (const [id, value] of Object.entries({ companyName: 'Empresa QA', rut: '11.111.111-1', adminName: 'Persona QA', email: 'qa@example.com', emailConfirmation: 'qa@example.com', password: 'PasswordQA1234', inviteCode: 'incorrecto' })) {
    await page.locator(`#registration-${id}`).fill(value)
  }
  await page.getByRole('button', { name: 'Crear sitio privado vacío' }).click()
  await expect(page.locator('#registration-inviteCode')).toBeFocused()
  await expect(page.locator('#registration-inviteCode')).toHaveAttribute('aria-invalid', 'true')
  await expect(page.locator('#registration-inviteCode-error')).toContainText('solicita uno nuevo')
  await page.getByRole('button', { name: 'Mostrar código de invitación' }).click()
  await expect(page.locator('#registration-inviteCode')).toHaveAttribute('type', 'text')
})
for (const width of [390, 768, 1440]) {
  test(`demo field alignment and validation at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 975 })
    await page.goto('/')
    await page.getByRole('button', { name: 'Solicitar demostración', exact: true }).click()
    const email = page.locator('#demo-correo')
    const phone = page.getByRole('textbox', { name: 'Teléfono', exact: true })
    const boxes = await Promise.all([email.boundingBox(), phone.boundingBox()])
    if (width >= 768) expect(Math.abs(boxes[0].y - boxes[1].y)).toBeLessThan(2)
    await expect(page.locator('body')).toHaveJSProperty('scrollWidth', width)
    await page.getByRole('button', { name: 'Enviar solicitud' }).click()
    await expect(email).toHaveAttribute('aria-invalid', 'true')
  })
}
