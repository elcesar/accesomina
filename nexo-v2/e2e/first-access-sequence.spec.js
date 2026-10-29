import { test, expect } from '@playwright/test'

const password = 'ClaveFicticiaQA123'
const roles = ['client_admin', 'rrhh', 'prevencion', 'acreditacion', 'consulta']

async function mockFirstAccess(page, { role = 'consulta', change = true, mfa = true, signedIn = true } = {}) {
  const user = {
    id: 'qa-first-access', name: 'Persona QA', email: 'primer.acceso@ejemplo.test', role,
    permissions: { modules: { trabajadores: role !== 'consulta' } },
    mustChangePassword: change, mfaEnrollmentRequired: mfa, mfaEnabled: !mfa,
  }
  const calls = { state: 0, password: 0, setup: 0, enable: 0 }
  const session = () => ({ user: { ...user }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'qa-csrf' })
  await page.route('**/api/**', async route => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, json: body })
    if (path === '/api/auth/config') return json({ registrationEnabled: true, mfaRequired: true })
    if (path === '/api/health') return json({ version: 'qa-local', commit: 'fixture' })
    if (path === '/api/auth/me') return signedIn ? json(session()) : json({ error: 'UNAUTHENTICATED' }, 401)
    if (path === '/api/auth/login') { signedIn = true; return json(session()) }
    if (path === '/api/settings') {
      return user.mfaEnrollmentRequired
        ? json({ error: 'MFA_ENROLLMENT_REQUIRED' }, 403)
        : json({ settings: { branding: { theme: 'light' }, modules: {} } })
    }
    if (path === '/api/auth/change-password') {
      calls.password++
      if (request.postDataJSON().currentPassword !== password) return json({ error: 'INVALID_CREDENTIALS' }, 401)
      user.mustChangePassword = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/auth/mfa/setup') {
      calls.setup++
      expect(user.mustChangePassword).toBe(false)
      return json({ secret: 'JBSWY3DPEHPK3PXP', otpauthUri: 'otpauth://totp/EmpresaQA?secret=JBSWY3DPEHPK3PXP' })
    }
    if (path === '/api/auth/mfa/enable') {
      calls.enable++
      if (request.postDataJSON().code !== '654321') return json({ error: 'MFA_CODE_INVALID' }, 400)
      user.mfaEnrollmentRequired = false
      user.mfaEnabled = true
      return json({ recoveryCodes: ['QA-RECOVERY-ONE', 'QA-RECOVERY-TWO'] })
    }
    if (path === '/api/state') {
      calls.state++
      expect(user.mustChangePassword).toBe(false)
      expect(user.mfaEnrollmentRequired).toBe(false)
      return json({ state: { trabajadores: [], mantenciones: [], restricted: [], asignaciones: [] } })
    }
    return json({})
  })
  return { calls, user }
}

async function changePassword(page, current = password) {
  await page.getByLabel('Contraseña actual', { exact: true }).fill(current)
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(password)
  await page.getByLabel('Repite la nueva contraseña', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Guardar y continuar' }).click()
}

async function enableMfa(page) {
  await page.getByLabel('Ingresa nuevamente tu contraseña').fill(password)
  await page.getByRole('button', { name: 'Generar código de configuración' }).click()
  await page.getByLabel('Código de autenticación', { exact: true }).fill('654321')
  await page.getByRole('button', { name: 'Activar y continuar' }).click()
  await expect(page.getByRole('heading', { name: 'Doble autenticación activada' })).toBeVisible()
  await expect(page.getByText('QA-RECOVERY-ONE', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(/\/configurar-mfa$/)
  await page.getByRole('button', { name: 'Ir al panel' }).click()
  await expect(page.getByRole('heading', { name: 'Estado de la operación' })).toBeVisible()
}

for (const width of [1440, 375]) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } })
    for (const role of roles) {
      test(`primer acceso completo para ${role}: contraseña, MFA y portal`, async ({ page }) => {
        const { calls, user } = await mockFirstAccess(page, { role, signedIn: false })
        await page.goto('/login')
        await page.locator('#login-rut').fill('76.123.456-0')
        await page.locator('#login-email').fill('primer.acceso@ejemplo.test')
        await page.locator('#login-password').fill(password)
        await page.getByRole('button', { name: 'Ingresar', exact: true }).click()
        await expect(page.getByRole('heading', { name: 'Actualiza tu contraseña' })).toBeVisible()
        expect(calls.state).toBe(0)

        await page.reload()
        await expect(page.getByRole('heading', { name: 'Actualiza tu contraseña' })).toBeVisible()
        await page.goto('/configurar-mfa')
        await expect(page).toHaveURL(/\/cambiar-password$/)
        await expect(page.getByRole('heading', { name: 'Actualiza tu contraseña' })).toBeVisible()
        expect(calls.state).toBe(0)

        await changePassword(page)
        await expect(page.getByRole('heading', { name: 'Configura la doble autenticación' })).toBeVisible()
        await page.goto('/cambiar-password')
        await expect(page).toHaveURL(/\/configurar-mfa$/)
        await expect(page.getByRole('heading', { name: 'Configura la doble autenticación' })).toBeVisible()
        await page.reload()
        await expect(page.getByRole('heading', { name: 'Configura la doble autenticación' })).toBeVisible()
        expect(calls.state).toBe(0)

        await enableMfa(page)
        expect(user.role).toBe(role)
        expect(user.permissions.modules.trabajadores).toBe(role !== 'consulta')
        expect(calls.password).toBe(1)
        expect(calls.setup).toBe(1)
        expect(calls.enable).toBe(1)
        await expect.poll(() => calls.state).toBeGreaterThan(0)
        if (role === 'consulta') {
          await page.goto('/app/trabajadores')
          await expect(page.getByText('Módulo no habilitado', { exact: true })).toBeVisible()
          await page.goto('/app/usuarios')
          await expect(page.getByRole('heading', { name: 'No tienes permiso para acceder' })).toBeVisible()
        }
      })
    }

    test('una cuenta sólo pendiente de contraseña llega al portal', async ({ page }) => {
      await mockFirstAccess(page, { mfa: false })
      await page.goto('/app')
      await expect(page.getByRole('heading', { name: 'Actualiza tu contraseña' })).toBeVisible()
      await changePassword(page)
      await expect(page.getByRole('heading', { name: 'Estado de la operación' })).toBeVisible()
    })

    test('una cuenta sólo pendiente de MFA conserva sus códigos antes de continuar', async ({ page }) => {
      await mockFirstAccess(page, { change: false })
      await page.goto('/app')
      await expect(page.getByRole('heading', { name: 'Configura la doble autenticación' })).toBeVisible()
      await enableMfa(page)
    })

    test('los errores de contraseña y código permiten corregir y continuar', async ({ page }) => {
      const { calls } = await mockFirstAccess(page)
      await page.goto('/cambiar-password')
      await changePassword(page, 'ClaveIncorrectaQA123')
      await expect(page.getByRole('alert')).toHaveText('La contraseña actual no es correcta.')
      await expect(page.getByRole('heading', { name: 'Actualiza tu contraseña' })).toBeVisible()
      await changePassword(page)
      await page.getByLabel('Ingresa nuevamente tu contraseña').fill(password)
      await page.getByRole('button', { name: 'Generar código de configuración' }).click()
      await page.getByLabel('Código de autenticación', { exact: true }).fill('123456')
      await page.getByRole('button', { name: 'Activar y continuar' }).click()
      await expect(page.getByRole('alert')).toContainText('El código de seis dígitos no es válido')
      expect(calls.state).toBe(0)
      await page.getByLabel('Código de autenticación', { exact: true }).fill('654321')
      await page.getByRole('button', { name: 'Activar y continuar' }).click()
      await expect(page.getByRole('heading', { name: 'Doble autenticación activada' })).toBeVisible()
      await page.getByRole('button', { name: 'Ir al panel' }).click()
      await expect(page.getByRole('heading', { name: 'Estado de la operación' })).toBeVisible()
    })

    test('sesión completa y sesión ausente mantienen sus rutas de acceso', async ({ page }) => {
      await mockFirstAccess(page, { change: false, mfa: false })
      await page.goto('/cambiar-password')
      await expect(page).toHaveURL(/\/app$/)
      await expect(page.getByRole('heading', { name: 'Estado de la operación' })).toBeVisible()
      await page.unrouteAll({ behavior: 'wait' })
      await mockFirstAccess(page, { signedIn: false })
      await page.goto('/cambiar-password')
      await expect(page.getByRole('heading', { name: 'Acceso al sistema' })).toBeVisible()
      await expect(page).toHaveURL(/\/login$/)
    })
  })
}
