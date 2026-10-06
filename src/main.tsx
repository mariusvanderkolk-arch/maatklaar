import './polyfills'
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { AppFoutgrens } from './components/Foutgrens'
import { startCloud } from './lib/cloud/sync'

declare global {
  interface Window {
    __swGestart?: boolean
    __swToonNoodscherm?: (reden?: string) => void
  }
}

/** Meldt aan het noodscherm in index.html dat de app draait (en ruimt het op als het al zichtbaar was). */
function Gestart() {
  useEffect(() => {
    window.__swGestart = true
    document.getElementById('sw-noodscherm')?.remove()
  }, [])
  return null
}

// Optioneel account: Supabase wordt alleen geladen als er een sessie (of inloglink) is.
try {
  startCloud().catch((e) => console.error('Cloud kon niet starten', e))
} catch (e) {
  console.error('Cloud kon niet starten', e)
}

const root = document.getElementById('root')
if (!root) {
  window.__swToonNoodscherm?.('Geen #root-element gevonden.')
} else {
  createRoot(root).render(
    <StrictMode>
      <AppFoutgrens>
        <App />
        <Gestart />
      </AppFoutgrens>
    </StrictMode>,
  )
}

// Offline-ondersteuning is een extraatje: in in-app browsers ontbreekt serviceWorker vaak; dat mag nooit fataal zijn.
if (import.meta.env.PROD) {
  window.addEventListener('load', () => {
    try {
      const sw = typeof navigator !== 'undefined' ? navigator.serviceWorker : undefined
      if (sw && typeof sw.register === 'function') {
        sw.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {})
      }
    } catch {
      /* geen service worker: app werkt gewoon online */
    }
  })
}
