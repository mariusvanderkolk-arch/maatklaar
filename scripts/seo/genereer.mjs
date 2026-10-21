// Genereert statische, vooraf gerenderde SEO-pagina's (de app zelf gebruikt #-routes die Google slecht indexeert),
// plus sitemap.xml en robots.txt. Wordt aangeroepen vanuit vite.config.ts (seoPlugin).
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { onderwerpen } from './onderwerpen.mjs'
import { provincies, steden } from './regio.mjs'

const SITE = 'https://maatklaar.nl/'
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
const ld = (o) => JSON.stringify(o).replace(/</g, '\\u003c')

export function seoPaginas() {
  const pag = []
  const ond = Object.fromEntries(onderwerpen.map((o) => [o.slug, o]))
  const ondLinks = onderwerpen.map((o) => [`${o.slug}/`, o.kort])
  for (const o of onderwerpen) {
    pag.push({
      pad: `${o.slug}/`, titel: `${o.titel} | Maatklaar`, meta: o.meta, h1: o.h1, kruimel: [[o.kort]],
      inhoud: `<p class="lead">${o.intro}</p>` + o.secties.map(([h, t]) => `<h2>${h}</h2>${t}`).join(''),
      faq: o.faq,
      links: [['Lees ook', o.verwant.map((s) => [`${s}/`, ond[s].kort])], ['Per regio', [['offerte-maken/', 'Alle provincies en steden']]]],
    })
  }
  const provVan = Object.fromEntries(provincies.map((p) => [p.slug, p]))
  const stedenIn = (p) => steden.filter((s) => s.prov === p)
  for (const p of provincies) {
    const st = stedenIn(p.slug)
    pag.push({
      pad: `offerte-maken/provincie-${p.slug}/`,
      titel: `Offerte maken als vakman in ${p.naam} | Maatklaar`,
      meta: `Verbouwen in ${p.naam}: waar let je op bij je offerte? Lokale aandachtspunten voor aannemers en vakmensen, plus een gratis offerte-app.`,
      h1: `Offerte maken als aannemer of vakman in ${p.naam}`,
      kruimel: [['offerte-maken/', 'Per regio'], [p.naam]],
      inhoud: `<p class="lead">Ben je aannemer, tegelzetter, installateur of klusbedrijf in ${p.naam}? Dan ken je de woningen in je regio als geen ander. Een goede offerte laat zien dat je die kennis hebt.</p>
<h2>Verbouwen in ${p.naam}</h2><p>${p.bouw}</p>
<h2>Tip voor je offerte</h2><p>${p.tip}</p>
<h2>Sneller offertes maken in ${p.naam}</h2><p>Met Maatklaar meet je op bij de klant, teken je de ruimte in 2D en 3D en rekent de app materialen en werkzaamheden uit met je eigen tarieven. De offerte stuur je meteen via WhatsApp of e-mail, en de klant tekent digitaal.</p>`,
      faq: [
        [`Werkt Maatklaar overal in ${p.naam}?`, `Ja. Maatklaar werkt in de browser op je telefoon, tablet of computer, dus overal in ${p.naam} waar je internet hebt.`],
        [`Waar moet ik op letten bij een offerte in ${p.naam}?`, p.tip],
        ['Waar worden mijn gegevens bewaard?', 'Standaard op je eigen apparaat. Met een gratis account worden ze beveiligd opgeslagen in een datacenter in de EU.'],
      ],
      links: [[`Steden in ${p.naam}`, st.map((s) => [`offerte-maken/${s.slug}/`, s.naam])], ['Handige gidsen', ondLinks]],
    })
  }
  for (const s of steden) {
    const p = provVan[s.prov]
    const buren = stedenIn(s.prov).filter((b) => b.slug !== s.slug)
    pag.push({
      pad: `offerte-maken/${s.slug}/`,
      titel: `Offerte maken in ${s.naam}: badkamer, keuken en verbouwing | Maatklaar`,
      meta: `Vakman in ${s.naam}? Lees waar je op let bij woningen in ${s.naam} en maak je offerte voor badkamer, keuken of verbouwing gratis met Maatklaar.`,
      h1: `Offerte maken in ${s.naam}`,
      kruimel: [['offerte-maken/', 'Per regio'], [`offerte-maken/provincie-${p.slug}/`, p.naam], [s.naam]],
      inhoud: `<p class="lead">Badkamers, keukens, toiletten en vloeren in ${s.naam}: elke wijk heeft zijn eigen woningen en dus zijn eigen aandachtspunten. Dit is wat voor vakmensen in ${s.naam} belangrijk is bij het opstellen van een offerte.</p>
<h2>Woningen in ${s.naam}</h2><p>${s.bouw}</p>
<h2>Praktijktip voor ${s.naam}</h2><p>${s.tip}</p>
<h2>Je offerte in een paar minuten</h2><p>Meet op bij je klant, kies materialen en laat Maatklaar uitrekenen wat er nodig is. Je klant ontvangt een duidelijke offerte met schets via WhatsApp of e-mail en tekent digitaal.</p>`,
      faq: [
        [`Kan ik in ${s.naam} op locatie een offerte maken?`, 'Ja. Je meet op met je telefoon, spreekt eventueel maten in en verstuurt de offerte direct vanaf de bouwplaats.'],
        [`Waar let ik op bij woningen in ${s.naam}?`, s.tip],
        ['Moet mijn klant iets installeren om te tekenen?', 'Nee. Je klant opent de offerte via een link en tekent op zijn telefoon.'],
      ],
      links: [
        [`Meer in ${p.naam}`, [[`offerte-maken/provincie-${p.slug}/`, `Provincie ${p.naam}`], ...buren.map((b) => [`offerte-maken/${b.slug}/`, b.naam])]],
        ['Handige gidsen', ondLinks],
      ],
    })
  }
  pag.push({
    pad: 'offerte-maken/', titel: 'Offerte maken: gidsen en tips per regio | Maatklaar',
    meta: 'Gidsen voor vakmensen: badkamer, keuken, tegelwerk, meerwerk en calculatie, plus lokale aandachtspunten voor alle provincies en grote steden in Nederland.',
    h1: 'Offerte maken: gidsen en tips per regio', kruimel: [['Per regio']],
    inhoud: '<p class="lead">Het Maatklaar-team verzamelt hier praktische gidsen voor vakmensen, en lokale aandachtspunten voor heel Nederland: van jaren-30 woningen in Groningen tot houten funderingen in de Zaanstreek.</p>',
    faq: [['Voor wie zijn deze gidsen?', 'Voor aannemers, tegelzetters, installateurs, keukenmonteurs en klusbedrijven die sneller en duidelijker offertes willen maken.']],
    links: [['Gidsen', ondLinks], ['Provincies', provincies.map((p) => [`offerte-maken/provincie-${p.slug}/`, p.naam])], ['Steden', [...steden].sort((a, b) => a.naam.localeCompare(b.naam, 'nl')).map((s) => [`offerte-maken/${s.slug}/`, s.naam])]],
  })
  return pag
}

function html(p, base, test) {
  const url = SITE + p.pad
  const a = (pad) => base + pad
  const kruimelLd = { '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'Maatklaar', item: SITE }, ...p.kruimel.map((k, i) => ({ '@type': 'ListItem', position: i + 2, name: k.length === 2 ? k[1] : k[0], item: k.length === 2 ? SITE + k[0] : url }))] }
  const faqLd = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: p.faq.map(([q, an]) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: an } })) }
  return `<!doctype html>
<html lang="nl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(p.titel)}</title><meta name="description" content="${esc(p.meta)}">
${test ? '<meta name="robots" content="noindex, nofollow">\n' : ''}<link rel="canonical" href="${url}">
<meta property="og:title" content="${esc(p.titel)}"><meta property="og:description" content="${esc(p.meta)}"><meta property="og:url" content="${url}"><meta property="og:image" content="${SITE}logo.png"><meta property="og:type" content="article">
<link rel="icon" type="image/svg+xml" href="${a('favicon.svg')}"><meta name="theme-color" content="#F5EFE6">
<script type="application/ld+json">${ld(faqLd)}</script>
<script type="application/ld+json">${ld(kruimelLd)}</script>
<style>body{margin:0;background:#F5EFE6;color:#2B2623;font:17px/1.6 system-ui,-apple-system,Roboto,sans-serif}a{color:#2B2623}header,main,footer{max-width:760px;margin:0 auto;padding:16px 20px}header{display:flex;justify-content:space-between;align-items:center;gap:12px}header>a:first-child{font-weight:700;text-decoration:none;font-size:1.2rem}h1{font-size:2rem;line-height:1.2}h2{font-size:1.3rem;margin-top:2rem}.lead{font-size:1.1rem}.cta{display:inline-block;background:#2B2623;color:#F5EFE6;padding:14px 22px;border-radius:12px;text-decoration:none;font-weight:600;margin:8px 8px 8px 0}.cta.licht{background:transparent;color:#2B2623;border:1px solid #2B2623}.blok{background:#fff;border-radius:16px;padding:20px;margin:28px 0}nav.kruimel{font-size:.85rem}details{border-bottom:1px solid #e3d9cc;padding:10px 0}summary{font-weight:600;cursor:pointer}ul.links{columns:2;padding-left:18px}ul.links li{padding:4px 0}footer{font-size:.85rem;color:#7A6F66;border-top:1px solid #e3d9cc;margin-top:40px}footer a{color:#7A6F66}</style>
</head><body>
<header><a href="${a('')}">Maatklaar</a><a class="cta" style="margin:0;padding:10px 16px" href="${a('#/demo')}">Bekijk de demo</a></header>
<main>
<nav class="kruimel" aria-label="Kruimelpad"><a href="${a('')}">Maatklaar</a> › ${p.kruimel.map((k) => (k.length === 2 ? `<a href="${a(k[0])}">${esc(k[1])}</a>` : esc(k[0]))).join(' › ')}</nav>
<h1>${esc(p.h1)}</h1>
${p.inhoud}
<div class="blok"><h2 style="margin-top:0">Probeer Maatklaar gratis</h2><p>Opmeten, ontwerpen in 2D en 3D, materialen berekenen en een offerte die je klant digitaal tekent. Zonder installatie, in je browser.</p><a class="cta" href="${a('#/demo')}">Bekijk de demo</a><a class="cta licht" href="${a('')}">Start gratis</a></div>
<h2>Veelgestelde vragen</h2>
${p.faq.map(([q, an]) => `<details><summary>${esc(q)}</summary><p>${esc(an)}</p></details>`).join('\n')}
${p.links.map(([kop, ls]) => `<h2>${esc(kop)}</h2><ul class="links">${ls.map(([h, t]) => `<li><a href="${a(h)}">${esc(t)}</a></li>`).join('')}</ul>`).join('\n')}
</main>
<footer><p><a href="${a('offerte-maken/')}">Alle gidsen en regio's</a> · ${onderwerpen.map((o) => `<a href="${a(o.slug + '/')}">${esc(o.kort)}</a>`).join(' · ')}</p><p>© 2026 Maatklaar · gemaakt door het Maatklaar-team · <a href="${a('#/privacy')}">Privacy</a></p></footer>
</body></html>
`
}

export function schrijfSeo(uit, base, test) {
  const pag = seoPaginas()
  for (const p of pag) {
    mkdirSync(join(uit, p.pad), { recursive: true })
    writeFileSync(join(uit, p.pad, 'index.html'), html(p, base, test))
  }
  const vandaag = new Date().toISOString().slice(0, 10)
  writeFileSync(join(uit, 'sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${['', ...pag.map((p) => p.pad)].map((pd) => `  <url><loc>${SITE}${pd}</loc><lastmod>${vandaag}</lastmod></url>`).join('\n')}\n</urlset>\n`)
  // Testsite mag niet geïndexeerd worden; live wel, met verwijzing naar de sitemap.
  writeFileSync(join(uit, 'robots.txt'), test ? 'User-agent: *\nDisallow: /\n' : `User-agent: *\nAllow: /\n\nSitemap: ${SITE}sitemap.xml\n`)
  return pag.length
}
