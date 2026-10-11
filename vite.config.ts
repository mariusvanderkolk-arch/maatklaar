import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serveert de app onder /maatklaar/ (of /maatklaar-test/). Lokaal kan VITE_BASE=/ worden gezet.
const base = process.env.VITE_BASE ?? '/maatklaar/'
// Testversie voor aannemers: banner, feedback, eigen opslag, noindex. Zie src/lib/modus.ts.
const test = process.env.VITE_TEST_MODE === 'true'
// Losse overzetpagina (github.io/maatklaar-overzetten/) voor de verhuizing naar maatklaar.nl. Zie src/lib/verhuizing.ts.
const overzetten = process.env.VITE_OVERZETTEN === 'true'
// Publieke URL van de app (voor og:image e.d.).
const siteUrl = (process.env.VITE_SITE_URL || 'https://maatklaar.nl/').replace(/\/?$/, '/')

function siteUrlPlugin(): Plugin {
  return { name: 'maatklaar-site-url', transformIndexHtml: (html) => html.replaceAll('https://mariusvanderkolk-arch.github.io/maatklaar/', siteUrl) }
}

/**
 * Content-Security-Policy als meta-tag (GitHub Pages kan geen headers zetten).
 * Scripts alleen van de eigen site + de inline noodscript(s) via hash; geen eval, geen plugins, geen <base>-kaping.
 * connect-src staat https: toe omdat de aannemer zelf een AI-dienst (eigen base-URL) kan instellen.
 * frame-ancestors werkt niet via meta; daarvoor is er een JS-controle op de tekenpagina.
 */
export function cspPlugin(): Plugin {
  return {
    name: 'maatklaar-csp',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const hashes = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)]
          .map((m) => m[1])
          .filter((code) => code.trim())
          .map((code) => `'sha256-${createHash('sha256').update(code).digest('base64')}'`)
        const csp = [
          "default-src 'self'",
          `script-src 'self' ${hashes.join(' ')}`.trim(),
          "style-src 'self' 'unsafe-inline'",
          "img-src 'self' data: blob: https:",
          "font-src 'self' data:",
          "connect-src 'self' https: wss://cdhrbfawrhburztuzdha.supabase.co",
          "worker-src 'self' blob:",
          "manifest-src 'self'",
          "media-src 'self' blob: data:",
          "frame-src 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
        ].join('; ')
        return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${csp}" />\n    <meta name="referrer" content="strict-origin-when-cross-origin" />`)
      },
    },
  }
}

/** Past in de testbouw de titel, robots-meta en het manifest aan. */
function testversie(): Plugin {
  let uit = 'dist'
  return {
    name: 'maatklaar-testversie',
    apply: 'build',
    configResolved(c) {
      uit = resolve(c.root, c.build.outDir)
    },
    transformIndexHtml(html) {
      return html
        .replace(/<title>[^<]*<\/title>/, '<title>Maatklaar (test)</title>\n    <meta name="robots" content="noindex, nofollow" />')
        .replace('name="apple-mobile-web-app-title" content="Maatklaar"', 'name="apple-mobile-web-app-title" content="Maatklaar (test)"')
        .replace(/<meta property="og:title" content="[^"]*" \/>/, '<meta property="og:title" content="Maatklaar (test)" />')
    },
    closeBundle() {
      const pad = resolve(uit, 'manifest.webmanifest')
      const m = JSON.parse(readFileSync(pad, 'utf8'))
      writeFileSync(pad, JSON.stringify({ ...m, name: 'Maatklaar (test)', short_name: 'Maatklaar test' }, null, 2))
    },
  }
}

export default defineConfig({
  base,
  plugins: [react(), tailwindcss(), siteUrlPlugin(), cspPlugin(), ...(test ? [testversie()] : [])],
  // Ook oudere Android WebViews (in-app browser van WhatsApp e.d.) moeten de code kunnen lezen.
  build: { ...(overzetten ? { outDir: 'dist-overzetten', rollupOptions: { input: resolve(__dirname, 'overzetten.html') } } : {}), target: ['es2019', 'chrome80', 'safari13', 'firefox78', 'edge88'], cssTarget: ['chrome80', 'safari13', 'firefox78', 'edge88'] },
  test: { environment: 'node' },
} as never)
