import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { PUBLIC_PAGES } from './src/config/public-pages.js'

const packageJson = JSON.parse(
  readFileSync(new URL('./package.json', import.meta.url), 'utf8')
)

function getCommitHash() {
  const ciCommit =
    process.env.GITHUB_SHA ||
    process.env.CODEBUILD_RESOLVED_SOURCE_VERSION ||
    process.env.COMMIT_SHA

  if (ciCommit) return ciCommit.slice(0, 7)

  try {
    return execSync('git rev-parse --short=7 HEAD', { encoding: 'utf8' }).trim()
  } catch {
    return 'local'
  }
}

export default defineConfig({
  plugins: [react(), {
    name: 'public-route-metadata',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const source = bundle['index.html'].source
      const escape = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;')
      for (const page of Object.values(PUBLIC_PAGES)) {
        const title = escape(`Nexo Klar · ${page.title}`)
        const html = source
          .replace(/<title>.*?<\/title>/, `<title>${title}</title>`)
          .replace(/(<meta name="description" content=")[^"]*/, `$1${escape(page.description)}`)
          .replace(/(<meta property="og:title" content=")[^"]*/, `$1${title}`)
          .replace(/(<meta property="og:description" content=")[^"]*/, `$1${escape(page.description)}`)
          .replace(/(<link rel="canonical" href=")[^"]*/, `$1https://nexoklar.com${page.path}`)
          .replace(/(<meta property="og:url" content=")[^"]*/, `$1https://nexoklar.com${page.path}`)
        if (page.path === '/') bundle['index.html'].source = html
        else this.emitFile({ type: 'asset', fileName: `${page.path.slice(1)}/index.html`, source: html })
      }
      this.emitFile({ type: 'asset', fileName: 'sitemap.xml', source: `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Object.values(PUBLIC_PAGES).filter(page => page.path !== '/crear-empresa').map(page => `<url><loc>https://nexoklar.com${page.path}</loc></url>`).join('')}</urlset>` })
    },
  }],
  base: '/',
  define: {
    __APP_VERSION__: JSON.stringify(packageJson.version),
    __COMMIT_HASH__: JSON.stringify(getCommitHash()),
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8088',
        changeOrigin: true,
      }
    }
  }
})
