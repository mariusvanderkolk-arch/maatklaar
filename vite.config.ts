import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// GitHub Pages serveert de app onder /maatklaar/ (of /maatklaar-test/). Lokaal kan VITE_BASE=/ worden gezet.
const base = process.env.VITE_BASE ?? '/maatklaar/'
// Testversie voor aannemers: banner, feedback, eigen opslag, noindex. Zie src/lib/modus.ts.
const test = process.env.VITE_TEST_MODE === 'true'

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
  plugins: [react(), tailwindcss(), ...(test ? [testversie()] : [])],
  // Ook oudere Android WebViews (in-app browser van WhatsApp e.d.) moeten de code kunnen lezen.
  build: { target: ['es2019', 'chrome80', 'safari13', 'firefox78', 'edge88'], cssTarget: ['chrome80', 'safari13', 'firefox78', 'edge88'] },
  test: { environment: 'node' },
} as never)
