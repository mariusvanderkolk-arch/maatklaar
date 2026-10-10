/**
 * Overzetpagina op het OUDE adres (mariusvanderkolk-arch.github.io/maatklaar-overzetten/), dus dezelfde origin
 * als de oude app: hier zijn de oude localStorage/IndexedDB-gegevens leesbaar. Alleen lezen, nooit wissen.
 * Stuurt de back-up via postMessage naar het venster dat deze pagina opende (alleen maatklaar.nl), of biedt een download.
 */
import { verzamelBackup, exporteerAlles } from '../lib/backupActies'
import { samenvatting, type Backup } from '../lib/backup'
import { BERICHT, doelUitHash, isOverzetOk, NIEUWE_ORIGINS } from '../lib/verhuizing'

const app = document.getElementById('app')!
const NIEUW = NIEUWE_ORIGINS[0]
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!)

document.head.insertAdjacentHTML(
  'beforeend',
  `<style>
  body{margin:0;background:#F5EFE6;color:#2b2620;font:16px/1.5 system-ui,-apple-system,Segoe UI,Roboto,sans-serif}
  main{max-width:560px;margin:0 auto;padding:32px 20px}
  .kaart{background:#fffdf9;border:1px solid #e6dccb;border-radius:20px;padding:24px;box-shadow:0 10px 30px -18px rgba(60,45,25,.4)}
  h1{font:600 1.6rem/1.15 Georgia,serif;margin:0 0 8px}.merk{color:#84663a;letter-spacing:.14em;text-transform:uppercase;font-size:.72rem;font-weight:600}
  ul{padding-left:20px}.knop{display:inline-block;border:0;border-radius:12px;padding:12px 18px;font:600 1rem system-ui;cursor:pointer;margin:6px 8px 0 0;text-decoration:none}
  .hoofd{background:#2b2620;color:#fffdf9}.twee{background:#efe6d6;color:#2b2620;border:1px solid #dcc594}
  .ok{color:#2f5a33;font-weight:600}.fout{color:#9b2c2c}.klein{font-size:.85rem;color:#6b6257}
  </style>`,
)

function toon(html: string) {
  app.innerHTML = `<div class="kaart"><p class="merk">Maatklaar · verhuizen naar maatklaar.nl</p>${html}</div>`
}

async function start() {
  let b: Backup, ontbrekend: number
  try {
    ;({ backup: b, ontbrekend } = await verzamelBackup())
  } catch (e) {
    toon(`<h1>Kon de gegevens niet lezen</h1><p class="fout">${esc((e as Error).message || 'Onbekende fout')}</p><p>Open deze pagina in dezelfde browser waarin je Maatklaar gebruikte (bijv. Chrome).</p>`)
    return
  }
  const s = samenvatting(b)
  const doel = doelUitHash(location.hash)
  const opener = window.opener as Window | null
  const leeg = s.eigen === 0 && s.facturen === 0 && s.prijzen === 0 && !s.bedrijf
  const lijst = `<ul><li><b>${s.eigen}</b> eigen project${s.eigen === 1 ? '' : 'en'}${s.projecten > s.eigen ? ` (+ ${s.projecten - s.eigen} voorbeeld)` : ''}</li><li><b>${s.facturen}</b> facturen</li><li><b>${s.prijzen}</b> eigen prijzen</li><li><b>${s.fotos}</b> foto’s${ontbrekend ? ` (${ontbrekend} niet gevonden)` : ''}</li><li>Bedrijfsgegevens: ${s.bedrijf ? 'ja' : 'nee'}</li></ul>`
  const download = `<button class="knop twee" id="dl">Back-up-bestand downloaden</button>`
  const naarNieuw = `<a class="knop twee" href="${NIEUW}/">Open maatklaar.nl</a>`
  if (leeg) {
    toon(`<h1>Geen gegevens gevonden</h1><p>In deze browser staan op het oude adres geen eigen projecten, facturen of prijzen. Gebruikte je Maatklaar in een andere browser (bijv. Chrome i.p.v. de WhatsApp-browser)? Open deze pagina daar.</p>${naarNieuw}`)
    return
  }
  const kanSturen = !!doel && !!opener && !opener.closed
  toon(
    `<h1>Je gegevens op het oude adres</h1><p>Gevonden in deze browser:</p>${lijst}` +
      (kanSturen
        ? `<button class="knop hoofd" id="stuur">Overzetten naar ${esc(doel!.replace('https://', ''))}</button>${download}<p class="klein">Er wordt niets gewist; je gegevens blijven ook hier staan.</p><p id="st" aria-live="polite"></p>`
        : `<p>Open maatklaar.nl en tik op <b>Gegevens overzetten</b>, of download hieronder een back-up-bestand en zet dat op maatklaar.nl terug via <b>Instellingen → Back-up → Terugzetten</b>.</p>${download}${naarNieuw}<p class="klein">Er wordt niets gewist.</p>`),
  )
  document.getElementById('dl')?.addEventListener('click', async () => {
    const r = await exporteerAlles()
    const p = document.createElement('p')
    p.className = 'ok'
    p.textContent = `Back-up gedownload (${Math.round(r.bytes / 1024)} kB). Zet dit bestand terug op maatklaar.nl via Instellingen → Back-up.`
    app.firstElementChild?.appendChild(p)
  })
  const stuurKnop = document.getElementById('stuur') as HTMLButtonElement | null
  if (!stuurKnop || !doel || !opener) return
  const st = document.getElementById('st')!
  const tekst = JSON.stringify(b)
  let klaar = false
  window.addEventListener('message', (e) => {
    if (e.origin !== doel || e.source !== opener || !isOverzetOk(e.data) || klaar) return
    klaar = true
    if (e.data.fout) {
      st.innerHTML = `<span class="fout">Overzetten mislukt: ${esc(e.data.fout)}</span><br>Download dan het back-up-bestand en zet het terug via Instellingen → Back-up.`
      stuurKnop.disabled = false
      klaar = false
      return
    }
    toon(`<h1 class="ok">Klaar!</h1><p>${e.data.projecten} project${e.data.projecten === 1 ? '' : 'en'} en de rest van je gegevens staan nu op maatklaar.nl. Je kunt dit venster sluiten.</p><button class="knop hoofd" id="sluit">Venster sluiten</button>`)
    document.getElementById('sluit')!.onclick = () => {
      window.close()
      location.href = `${doel}/`
    }
    setTimeout(() => window.close(), 2500)
  })
  stuurKnop.addEventListener('click', () => {
    stuurKnop.disabled = true
    st.textContent = 'Bezig met overzetten…'
    let n = 0
    const zend = () => {
      if (klaar || n++ > 10 || opener.closed) {
        if (!klaar) st.innerHTML = '<span class="fout">Geen antwoord van maatklaar.nl.</span> Download het back-up-bestand en zet het daar terug via Instellingen → Back-up.'
        if (!klaar) stuurKnop.disabled = false
        return
      }
      opener.postMessage({ type: BERICHT, versie: 1, backup: tekst }, doel)
      setTimeout(zend, 1500)
    }
    zend()
  })
}

start()
