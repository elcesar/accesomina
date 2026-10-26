import { test, expect } from '@playwright/test'

const future = () => new Date(Date.now() + 24 * 60 * 60_000).toISOString()
const invite = (status, patch = {}) => ({ status, expiresAt: future(), lastSentAt: status === 'sent' ? new Date().toISOString() : null, failureCode: status === 'failed' ? 'SMTP_CONNECTION_FAILED' : null, ...patch })
const account = (id, invitation, patch = {}) => ({ id, full_name: `Persona QA ${id}`, email: `${id}@ejemplo.test`, role: 'consulta', active: true, invitation, ...patch })
const requestUrl = '/aceptar-invitacion?tenant=qa-tenant&token=qa-invitation-token'
const strongPassword = 'ClaveFicticia321Segura'

async function adminBackend(page, { createStatus = 'sent', initial = [], role = 'client_admin', resendStatuses = ['sent'], createFailure = false } = {}) {
  let users = structuredClone(initial), paused = null, failCreate = createFailure
  const created = [], resent = []
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return json({ user: { id: 'qa-admin', role }, tenant: { id: 'qa-tenant', name: 'Empresa QA' }, csrfToken: 'qa-csrf' })
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/users' && req.method() === 'GET') return json(users)
    if (path === '/api/users' && req.method() === 'POST') {
      created.push(req.postDataJSON())
      if (paused) { const waiting = paused; paused = null; await waiting }
      if (failCreate === true) { failCreate = false; return json({ error: 'QA_UNAVAILABLE' }, 503) }
      const draft = req.postDataJSON(), invitation = invite(createStatus)
      const user = account('new-qa', invitation, { full_name: draft.fullName, email: draft.email, role: draft.role })
      users.push(user)
      if (failCreate === 'disconnect') { failCreate = false; return route.abort('failed') }
      return json({ user, invitation, temporaryPassword: 'QA-MUST-NEVER-BE-DISPLAYED' }, 201)
    }
    if (path.endsWith('/resend-invitation')) {
      resent.push(path)
      const invitation = invite(resendStatuses.shift() || 'sent')
      const user = users.find(item => path.includes(`/${item.id}/`))
      user.invitation = invitation
      return json({ user, invitation })
    }
    return json({})
  })
  return {
    created, resent, users: () => users,
    pauseNextCreate() { let release; paused = new Promise(resolve => { release = resolve }); return release },
  }
}

async function publicBackend(page, { invalid = false, verifyFailure = false, acceptFailures = [], existingSession = false, logoutFailures = [] } = {}) {
  let accepted = false, failVerify = verifyFailure ? 2 : 0, pausedAccept = null, sessionActive = existingSession
  const verifies = [], accepts = [], logins = [], logouts = []
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) })
    if (path === '/api/auth/me') return sessionActive
      ? json({ user: { id: 'qa-admin', role: 'client_admin' }, tenant: { id: 'qa-admin-tenant', name: 'Empresa administradora QA' }, csrfToken: 'qa-csrf' })
      : json({ error: 'AUTH_REQUIRED' }, 401)
    if (path === '/api/settings') return json({ settings: {} })
    if (path === '/api/auth/logout') {
      logouts.push(path)
      const failure = logoutFailures.shift()
      if (failure === 'network') return route.abort('failed')
      if (failure === 401) { sessionActive = false; return json({ error: 'AUTH_REQUIRED' }, 401) }
      if (failure) return json({ error: failure === 403 ? 'CSRF_INVALID' : 'QA_UNAVAILABLE' }, failure)
      sessionActive = false
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/auth/invitations/verify') {
      verifies.push(req.postDataJSON())
      if (failVerify) { failVerify--; return json({ error: 'QA_UNAVAILABLE' }, 503) }
      if (invalid || accepted) return json({ error: 'INVITATION_INVALID_OR_EXPIRED' }, 400)
      return json({ companyName: 'Empresa QA', companyRut: '76.123.456-0', email: 'persona@ejemplo.test', fullName: 'Persona QA', expiresAt: future() })
    }
    if (path === '/api/auth/invitations/accept') {
      accepts.push(req.postDataJSON())
      if (pausedAccept) { const waiting = pausedAccept; pausedAccept = null; await waiting }
      const failure = acceptFailures.shift()
      if (failure) return json({ error: failure }, failure === 'QA_UNAVAILABLE' ? 503 : 400)
      if (accepted) return json({ error: 'INVITATION_INVALID_OR_EXPIRED' }, 400)
      accepted = true
      return route.fulfill({ status: 204 })
    }
    if (path === '/api/auth/login') { logins.push(req.postDataJSON()); return json({ error: 'QA_LOGIN_NOT_EXPECTED' }, 400) }
    return json({})
  })
  return { verifies, accepts, logins, logouts, pauseNextAccept() { let release; pausedAccept = new Promise(resolve => { release = resolve }); return release } }
}

async function createForm(page) {
  await page.getByRole('button', { name: 'Dar acceso', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Dar acceso', exact: true })
  await dialog.getByLabel('Nombre', { exact: true }).fill('Persona ficticia QA')
  await dialog.getByLabel('Correo de acceso', { exact: true }).fill('persona@ejemplo.test')
  await dialog.getByLabel('Permiso', { exact: true }).selectOption('rrhh')
  return dialog
}

async function fillPasswords(page, password = strongPassword, confirmation = password) {
  await page.getByLabel('Nueva contraseña', { exact: true }).fill(password)
  await page.getByLabel('Repite la contraseña', { exact: true }).fill(confirmation)
}

for (const width of [1440, 375]) {
  test.describe(`invitaciones a ${width}px`, () => {
    test.use({ viewport: { width, height: 1000 } })

    test('Dar acceso crea una cuenta, conserva su rol y muestra el envío sin exponer una contraseña', async ({ page }) => {
      const api = await adminBackend(page)
      await page.goto('/app/usuarios')
      const dialog = await createForm(page), release = api.pauseNextCreate()
      await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
      await expect.poll(() => api.created.length).toBe(1)
      await dialog.locator('form').dispatchEvent('submit')
      await expect(dialog.getByRole('button', { name: 'Cancelar', exact: true })).toBeDisabled()
      await page.keyboard.press('Escape')
      await expect(dialog).toBeVisible()
      release()
      await expect(dialog).toBeHidden()
      await expect(page.getByRole('status')).toContainText('Invitación enviada por correo')
      expect(api.created).toHaveLength(1)
      expect(api.created[0].role).toBe('rrhh')
      expect(api.created[0]).not.toHaveProperty('password')
      await expect(page.locator('tbody')).toContainText('Enviada')
      await expect(page.getByText('QA-MUST-NEVER-BE-DISPLAYED')).toHaveCount(0)
      await page.reload()
      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.locator('tbody')).toContainText('Enviada')
    })

    test('un fallo de entrega conserva la cuenta y permite reenviar y reintentar sin duplicarla', async ({ page }) => {
      const api = await adminBackend(page, { createStatus: 'failed', resendStatuses: ['failed', 'sent'] })
      await page.goto('/app/usuarios')
      const dialog = await createForm(page)
      await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
      await expect(page.getByRole('alert')).toContainText('Acceso creado')
      await expect(page.locator('tbody')).toContainText('Envío fallido')
      await expect(page.locator('tbody').getByRole('button', { name: 'Restablecer acceso', exact: true })).toHaveCount(0)
      await page.getByRole('button', { name: 'Reenviar invitación', exact: true }).click()
      const resend = page.getByRole('dialog', { name: 'Reenviar invitación', exact: true })
      await expect(resend).toContainText('El enlace anterior dejará de funcionar')
      await resend.getByRole('button', { name: 'Reenviar invitación', exact: true }).click()
      await expect(resend.getByRole('alert')).toContainText('servicio de correo')
      await resend.getByRole('button', { name: 'Reenviar invitación', exact: true }).click()
      await expect(resend).toBeHidden()
      await expect(page.locator('tbody')).toContainText('Enviada')
      expect(api.created).toHaveLength(1)
      expect(api.resent).toHaveLength(2)
      expect(api.users()).toHaveLength(1)
      await expect(page.getByText('QA-MUST-NEVER-BE-DISPLAYED')).toHaveCount(0)
    })

    test('un error al crear permanece dentro del formulario y permite reintentar', async ({ page }) => {
      const api = await adminBackend(page, { createFailure: true })
      await page.goto('/app/usuarios')
      const dialog = await createForm(page)
      await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
      await expect(dialog.getByRole('alert')).toContainText('Inténtalo nuevamente')
      await expect(dialog.getByLabel('Nombre', { exact: true })).toHaveValue('Persona ficticia QA')
      await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
      await expect(dialog).toBeHidden()
      expect(api.users()).toHaveLength(1)
    })

    test('el listado distingue pendiente, vencida, aceptada y cuenta suspendida', async ({ page }) => {
      await adminBackend(page, { initial: [account('pending', invite('pending')), account('expired', invite('sent', { expiresAt: '2020-01-01T00:00:00Z' })), account('accepted', invite('accepted')), account('disabled', invite('failed'), { active: false })] })
      await page.goto('/app/usuarios')
      await expect(page.getByRole('row').filter({ hasText: 'pending@ejemplo.test' })).toContainText('Pendiente de envío')
      await expect(page.getByRole('row').filter({ hasText: 'expired@ejemplo.test' })).toContainText('Vencida')
      const accepted = page.getByRole('row').filter({ hasText: 'accepted@ejemplo.test' })
      await expect(accepted).toContainText('Aceptada')
      await expect(accepted.getByRole('button', { name: 'Reenviar invitación' })).toHaveCount(0)
      await expect(page.getByRole('row').filter({ hasText: 'disabled@ejemplo.test' }).getByRole('button', { name: 'Reenviar invitación' })).toBeDisabled()
    })

    test('una respuesta perdida consulta el usuario existente antes de intentar otra alta', async ({ page }) => {
      const api = await adminBackend(page, { createFailure: 'disconnect' })
      await page.goto('/app/usuarios')
      const dialog = await createForm(page)
      await dialog.getByRole('button', { name: 'Crear acceso', exact: true }).click()
      await expect(dialog.getByRole('alert')).toContainText('Actualiza la lista')
      await expect(dialog.getByRole('button', { name: 'Crear acceso', exact: true })).toBeDisabled()
      await dialog.getByRole('button', { name: 'Actualizar usuarios', exact: true }).click()
      await expect(page.locator('tbody tr')).toHaveCount(1)
      await expect(page.locator('tbody')).toContainText('Enviada')
      expect(api.created).toHaveLength(1)
      expect(api.users()).toHaveLength(1)
    })

    test('la invitación valida las claves, se utiliza una vez y conduce al acceso sin iniciar sesión', async ({ page }) => {
      const api = await publicBackend(page)
      await page.goto(requestUrl)
      const password = page.getByLabel('Nueva contraseña', { exact: true })
      await expect(password).toBeFocused()
      await fillPasswords(page, 'corta')
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(password).toHaveAttribute('aria-invalid', 'true')
      await expect(password).toBeFocused()
      expect(api.accepts).toHaveLength(0)
      await fillPasswords(page, strongPassword, 'OtraClaveFicticia321')
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page.getByLabel('Repite la contraseña')).toBeFocused()
      expect(api.accepts).toHaveLength(0)
      await fillPasswords(page)
      const release = api.pauseNextAccept()
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect.poll(() => api.accepts.length).toBe(1)
      await page.locator('form').dispatchEvent('submit')
      await expect(page.getByRole('button', { name: 'Guardando…' })).toBeDisabled()
      release()
      await expect(page.getByRole('heading', { name: 'Tu contraseña está lista' })).toBeVisible()
      expect(api.accepts).toHaveLength(1)
      expect(api.accepts[0]).toEqual({ tenant: 'qa-tenant', token: 'qa-invitation-token', newPassword: strongPassword, confirmPassword: strongPassword })
      expect(api.logins).toHaveLength(0)
      expect(api.logouts).toHaveLength(0)
      await expect(page.getByRole('textbox')).toHaveCount(0)
      await page.getByRole('link', { name: 'Ir a Acceso' }).click()
      await expect(page).toHaveURL(/\/login$/)
      await page.goto(requestUrl)
      await expect(page.getByRole('heading', { name: 'Invitación no disponible' })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Guardar contraseña' })).toHaveCount(0)
      expect(api.accepts).toHaveLength(1)
    })

    test('otra sesión se conserva hasta elegir cerrarla para entrar con la cuenta invitada', async ({ page }) => {
      const api = await publicBackend(page, { existingSession: true })
      await page.goto(requestUrl)
      await fillPasswords(page)
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page.getByRole('heading', { name: 'Tu contraseña está lista' })).toBeVisible()
      await expect(page.getByText('Hay otra sesión abierta en este navegador.', { exact: false })).toContainText('demás pestañas')
      expect(api.logouts).toHaveLength(0)
      expect(api.logins).toHaveLength(0)
      await page.getByRole('button', { name: 'Cerrar sesión actual e ir a Acceso' }).click()
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible()
      expect(api.logouts).toHaveLength(1)
      expect(api.logins).toHaveLength(0)
    })

    test('un fallo al cerrar sesión conserva el acceso actual y permite reintentar antes de navegar', async ({ page }) => {
      const api = await publicBackend(page, { existingSession: true, logoutFailures: [503, 'network', 403, 401] })
      await page.goto(requestUrl)
      await fillPasswords(page)
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      const button = page.getByRole('button', { name: 'Cerrar sesión actual e ir a Acceso' })
      for (let attempt = 1; attempt <= 3; attempt++) {
        await button.click()
        await expect(page.getByRole('alert')).toContainText('No pudimos cerrar la sesión actual. Sigue abierta.')
        await expect(page).toHaveURL(/\/aceptar-invitacion\?/)
        await expect(page.getByRole('heading', { name: 'Tu contraseña está lista' })).toBeVisible()
        await expect(button).toBeEnabled()
        await expect(button).toBeFocused()
        await expect(page.getByRole('link', { name: 'Ir a Acceso' })).toHaveCount(0)
        expect(api.logouts).toHaveLength(attempt)
      }
      await button.click()
      await expect(page).toHaveURL(/\/login$/)
      await expect(page.getByRole('button', { name: 'Ingresar', exact: true })).toBeVisible()
      expect(api.logouts).toHaveLength(4)
      expect(api.logins).toHaveLength(0)
      expect(api.accepts).toHaveLength(1)
    })

    test('un enlace vencido no ofrece definir clave y explica cómo pedir otro', async ({ page }) => {
      const api = await publicBackend(page, { invalid: true })
      await page.goto(requestUrl)
      await expect(page.getByRole('heading', { name: 'Invitación no disponible' })).toBeVisible()
      await expect(page.getByRole('alert')).toContainText('venció')
      await expect(page.getByText('Solicita al administrador de tu empresa que reenvíe la invitación desde Usuarios y permisos. Usa el enlace del correo más reciente.', { exact: true })).toBeVisible()
      await expect(page.getByRole('button', { name: 'Guardar contraseña' })).toHaveCount(0)
      expect(api.accepts).toHaveLength(0)
    })

    test('el enlace puede vencer entre verificación y guardado sin mostrar éxito', async ({ page }) => {
      const api = await publicBackend(page, { acceptFailures: ['INVITATION_INVALID_OR_EXPIRED'] })
      await page.goto(requestUrl)
      await fillPasswords(page)
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page.getByRole('heading', { name: 'Invitación no disponible' })).toBeVisible()
      await expect(page.getByRole('heading', { name: 'Tu contraseña está lista' })).toHaveCount(0)
      expect(api.accepts).toHaveLength(1)
    })

    test('los fallos de red de comprobación y guardado permiten un reintento explícito', async ({ page }) => {
      const api = await publicBackend(page, { verifyFailure: true, acceptFailures: ['QA_UNAVAILABLE'] })
      await page.goto(requestUrl)
      await expect(page.getByRole('heading', { name: 'No pudimos comprobar la invitación' })).toBeVisible()
      await page.getByRole('button', { name: 'Reintentar' }).click()
      await fillPasswords(page)
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page.getByRole('alert')).toContainText('Inténtalo nuevamente')
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page.getByRole('heading', { name: 'Tu contraseña está lista' })).toBeVisible()
      expect(api.accepts).toHaveLength(2)
      expect(api.logins).toHaveLength(0)
    })

    test('los errores de clave del servidor se asocian al campo y restauran el foco', async ({ page }) => {
      await publicBackend(page, { acceptFailures: ['WEAK_PASSWORD', 'INVITATION_PASSWORD_MISMATCH'] })
      await page.goto(requestUrl)
      await fillPasswords(page)
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      const password = page.getByLabel('Nueva contraseña', { exact: true })
      await expect(password).toHaveAttribute('aria-describedby', 'invitation-password-help invitation-password-error')
      await expect(password).toBeFocused()
      await page.getByRole('button', { name: 'Guardar contraseña' }).click()
      await expect(page.getByLabel('Repite la contraseña')).toHaveAttribute('aria-describedby', 'invitation-confirmation-error')
      await expect(page.getByLabel('Repite la contraseña')).toBeFocused()
    })
  })
}

test('Consulta no puede abrir la administración de usuarios ni emitir invitaciones', async ({ page }) => {
  const api = await adminBackend(page, { role: 'consulta' })
  await page.goto('/app/usuarios')
  await expect(page.getByRole('heading', { name: 'No tienes permiso para acceder' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Dar acceso' })).toHaveCount(0)
  expect(api.created).toHaveLength(0)
  expect(api.resent).toHaveLength(0)
})

test('un enlace incompleto se rechaza sin consultar ni guardar una clave', async ({ page }) => {
  const api = await publicBackend(page)
  await page.goto('/aceptar-invitacion?tenant=qa-tenant')
  await expect(page.getByRole('heading', { name: 'Invitación no disponible' })).toBeVisible()
  expect(api.verifies).toHaveLength(0)
  expect(api.accepts).toHaveLength(0)
})
