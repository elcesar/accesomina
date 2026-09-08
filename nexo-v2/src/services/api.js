const BASE = '/api'
let csrfToken = null

export function setCsrf(token) {
  csrfToken = token
}

export function getCsrf() {
  return csrfToken
}

async function parseError(res) {
  const err = await res.json().catch(() => ({}))
  throw Object.assign(new Error(err.message || err.error || 'Error'), { status: res.status, code: err.error })
}

async function request(path, options = {}) {
  const headers = { 'Content-Type': 'application/json', ...options.headers }
  if (csrfToken && !['GET', 'HEAD'].includes(options.method)) {
    headers['x-csrf-token'] = csrfToken
  }
  const res = await fetch(`${BASE}${path}`, {
    credentials: 'same-origin',
    ...options,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  })
  if (!res.ok) await parseError(res)
  if (res.status === 204) return null
  return res.json()
}

async function upload(path, file, fields = {}) {
  const body = new FormData()
  body.append('file', file)
  Object.entries(fields).forEach(([key, value]) => {
    if (value !== undefined && value !== null) body.append(key, String(value))
  })

  const headers = {}
  if (csrfToken) headers['x-csrf-token'] = csrfToken

  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    body,
  })
  if (!res.ok) await parseError(res)
  return res.json()
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
  upload,
}
