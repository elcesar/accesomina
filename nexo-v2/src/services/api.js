const BASE = '/api'
let csrfToken = null

export function setCsrf(token) {
  csrfToken = token
}

export function getCsrf() {
  return csrfToken
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
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw Object.assign(new Error(err.message || 'Error'), { status: res.status, code: err.error })
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  get: (path) => request(path, { method: 'GET' }),
  post: (path, body) => request(path, { method: 'POST', body }),
  put: (path, body) => request(path, { method: 'PUT', body }),
  patch: (path, body) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
}
