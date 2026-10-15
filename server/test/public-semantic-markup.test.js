import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'

const root = new URL('../..', import.meta.url)
const read = path => readFile(new URL(path, root), 'utf8')

test('public benefits use semantic headings with matching landing styles', async () => {
  const [home, css] = await Promise.all([
    read('nexo-v2/src/components/public/sections/HomeSection.jsx'),
    read('nexo-v2/src/pages/landing.css'),
  ])
  assert.match(home, /<h3>\{title\}<\/h3>/)
  assert.match(home, /<p>\{body\}<\/p>/)
  assert.match(css, /\.nk-hero-points article h3,/)
  assert.match(css, /\.nk-hero-points article p \{/)
  assert.match(css, /margin: 0/)
})

test('login keeps one page heading and uses concise connection copy', async () => {
  const login = await read('nexo-v2/src/pages/LoginPage.jsx')
  assert.match(login, /<p className="nk-login-brand-title">/)
  assert.match(login, /<h1 className="nk-login-title">Acceso al sistema<\/h1>/)
  assert.match(login, /<p>Conexión segura<\/p>/)
})
